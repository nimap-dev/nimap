package httpapi

import (
	"bytes"
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/httpapi/apitypes"
	"github.com/nimap-dev/nimap/internal/media"
)

type UploadAssetInput struct {
	Disposition  string                `header:"Content-Disposition" required:"true"`
	Title        string                `query:"title"`
	ResourceType apitypes.ResourceType `query:"resourceType"`
	ResourceID   uuid.UUID             `query:"resourceId"`
}

type AssetResponse struct {
	ID               uuid.UUID          `json:"id"`
	Title            string             `json:"title"`
	OriginalFilename string             `json:"originalFilename"`
	ContentType      string             `json:"contentType"`
	Type             apitypes.AssetType `json:"type"`
	ByteSize         int64              `json:"byteSize"`
	Width            *int32             `json:"width,omitempty"`
	Height           *int32             `json:"height,omitempty"`
	CreatedAt        time.Time          `json:"createdAt"`
}

type UploadAssetOutput struct {
	Body AssetResponse
}

type GetAssetContentInput struct {
	ID uuid.UUID `path:"id"`
}

// inlineTypes are the ones safe to let a browser render.
var inlineTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/gif":       true,
	"application/pdf": true,
	"video/mp4":       true,
	"video/webm":      true,
}

const maxUploadBytes int64 = 100 * 1024 * 1024

type uploadRule struct {
	assetType apitypes.AssetType
	ext       string
	exts      []string
	max       int64
}

var uploadPolicy = map[string]uploadRule{
	"image/jpeg":      {apitypes.AssetTypeImage, ".jpg", []string{".jpg", ".jpeg"}, 25 * 1024 * 1024},
	"image/png":       {apitypes.AssetTypeImage, ".png", []string{".png"}, 25 * 1024 * 1024},
	"image/gif":       {apitypes.AssetTypeImage, ".gif", []string{".gif"}, 25 * 1024 * 1024},
	"application/pdf": {apitypes.AssetTypeDocument, ".pdf", []string{".pdf"}, 100 * 1024 * 1024},
	"video/mp4":       {apitypes.AssetTypeVideo, ".mp4", []string{".mp4", ".m4v"}, 100 * 1024 * 1024},
	"video/webm":      {apitypes.AssetTypeVideo, ".webm", []string{".webm"}, 100 * 1024 * 1024},
}

func RegisterAssets(api huma.API, q *gen.Queries, pool *pgxpool.Pool, store *media.Store) {
	huma.Register(api, huma.Operation{
		OperationID:   "upload-asset",
		Method:        http.MethodPost,
		Path:          "/api/assets",
		Summary:       "Uploads a file, optionally attaching it to a location or a building",
		Tags:          []string{"assets"},
		DefaultStatus: http.StatusCreated,
		Metadata: map[string]any{
			requirePermissionMetaKey: auth.WriteRecords,
			rawIOMetaKey:             true,
		},
		RequestBody: &huma.RequestBody{
			Required: true,
			Content: map[string]*huma.MediaType{
				"application/octet-stream": {
					Schema: &huma.Schema{Type: "string", Format: "binary"},
				},
			},
		},
	}, func(
		ctx context.Context,
		in *UploadAssetInput,
	) (*UploadAssetOutput, error) {
		r, w, ok := RawIOFromContext(ctx)
		if !ok {
			return nil, huma.Error500InternalServerError("asset upload failed")
		}

		_, params, err := mime.ParseMediaType(in.Disposition)
		if err != nil {
			return nil, huma.Error415UnsupportedMediaType("failed to parse disposition")
		}

		filename, ok := params["filename"]
		if !ok {
			return nil, huma.Error415UnsupportedMediaType("failed to read filename")
		}

		attaching := in.ResourceType != "" || in.ResourceID != uuid.Nil
		if attaching && (in.ResourceType == "" || in.ResourceID == uuid.Nil) {
			return nil, huma.Error422UnprocessableEntity(
				"resourceType and resourceId name one thing between them, so give both or neither",
			)
		}

		if r.ContentLength > maxUploadBytes {
			return nil, huma.Error413RequestEntityTooLarge(tooLargeMessage(maxUploadBytes))
		}

		body := http.MaxBytesReader(w, r.Body, maxUploadBytes)
		defer body.Close()

		head := make([]byte, 512)
		n, err := io.ReadFull(body, head)
		if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				return nil, huma.Error413RequestEntityTooLarge(tooLargeMessage(maxUploadBytes))
			}

			return nil, huma.Error500InternalServerError("asset upload failed")
		}
		head = head[:n]

		contentType, _, _ := strings.Cut(http.DetectContentType(head), ";")
		ext := strings.ToLower(filepath.Ext(filename))

		rule, ok := uploadPolicy[contentType]
		if !ok || !slices.Contains(rule.exts, ext) {
			return nil, huma.Error415UnsupportedMediaType(
				"that kind of file cannot be uploaded; images, PDFs and videos can",
			)
		}

		file := io.MultiReader(bytes.NewReader(head), body)

		filePath := media.NewPath(rule.ext)

		size, checksum, err := store.Save(filePath, file, rule.max)
		if err != nil {
			if errors.Is(err, media.ErrTooLarge) {
				return nil, huma.Error413RequestEntityTooLarge(tooLargeMessage(rule.max))
			}
			return nil, huma.Error500InternalServerError("asset upload failed")
		}

		saved := false
		defer func() {
			if !saved {
				store.Remove(filePath)
			}
		}()
		tx, err := pool.Begin(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError("asset upload failed")

		}
		qtx := q.WithTx(tx)
		defer tx.Rollback(ctx)

		title := filename
		if in.Title != "" {
			title = in.Title
		}

		asset, err := qtx.CreateAsset(ctx, gen.CreateAssetParams{
			StoragePath:      filePath,
			OriginalFilename: filename,
			ContentType:      contentType,
			ByteSize:         size,
			Checksum:         checksum,
			Title:            title,
			Type:             gen.AssetType(rule.assetType),
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("asset upload failed")
		}

		if attaching {
			switch in.ResourceType {
			case apitypes.ResourceTypeLocation:
				_, err = qtx.CreateLocationAssetAttachment(ctx, gen.CreateLocationAssetAttachmentParams{
					AssetID:    asset.ID,
					LocationID: &in.ResourceID,
				})
			case apitypes.ResourceTypeBuilding:
				_, err = qtx.CreateBuildingAssetAttachment(ctx, gen.CreateBuildingAssetAttachmentParams{
					AssetID:    asset.ID,
					BuildingID: &in.ResourceID,
				})
			}

			if err != nil {
				if invalid := attachmentCheckError(err); invalid != nil {
					return nil, invalid
				}

				return nil, huma.Error500InternalServerError("asset upload failed")
			}
		}

		if err := tx.Commit(ctx); err != nil {
			return nil, huma.Error500InternalServerError("asset upload failed")
		}

		saved = true

		return &UploadAssetOutput{
			Body: AssetResponse{
				ID:               asset.ID,
				Title:            asset.Title,
				OriginalFilename: asset.OriginalFilename,
				ContentType:      asset.ContentType,
				Type:             apitypes.AssetType(asset.Type),
				ByteSize:         asset.ByteSize,
				Width:            asset.Width,
				Height:           asset.Height,
				CreatedAt:        asset.CreatedAt,
			},
		}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-asset-content",
		Method:      http.MethodGet,
		Path:        "/api/assets/{id}/content",
		Summary:     "Returns the bytes of the asset with the provided id",
		Tags:        []string{"assets"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
		Responses: map[string]*huma.Response{
			"200": {
				Description: "The file",
				Content: map[string]*huma.MediaType{
					"application/octet-stream": {
						Schema: &huma.Schema{Type: "string", Format: "binary"},
					},
				},
			},
		},
	}, func(
		ctx context.Context,
		in *GetAssetContentInput,
	) (*huma.StreamResponse, error) {
		asset, err := q.GetAsset(ctx, in.ID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("asset not found")
			}

			return nil, huma.Error500InternalServerError("asset read failed")
		}

		file, info, err := store.Open(asset.StoragePath, media.VariantOriginal)
		if err != nil {
			slog.ErrorContext(ctx, "asset file missing",
				"asset", asset.ID, "path", asset.StoragePath, "err", err)

			return nil, huma.Error500InternalServerError("asset read failed")
		}

		return &huma.StreamResponse{Body: func(hctx huma.Context) {
			defer file.Close()

			r, w := humachi.Unwrap(hctx)

			disposition := "attachment"
			if inlineTypes[asset.ContentType] {
				disposition = "inline"
				w.Header().Set("Content-Type", asset.ContentType)
			} else {
				w.Header().Set("Content-Type", "application/octet-stream")
			}

			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Content-Security-Policy", "sandbox")
			w.Header().Set("Content-Disposition", mime.FormatMediaType(
				disposition,
				map[string]string{"filename": asset.OriginalFilename},
			))

			w.Header().Set("ETag", `"`+hex.EncodeToString(asset.Checksum)+`"`)
			w.Header().Set("Cache-Control", "private, max-age=31536000, immutable")

			http.ServeContent(w, r, "", info.ModTime(), file)
		}}, nil
	})
}

// attachmentCheckError turns a rejected attachment into a readable 4xx, and
// returns nil for anything else.
func attachmentCheckError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return nil
	}

	switch pgErr.Code {
	case "23503":
		return huma.Error422UnprocessableEntity("no such location or building")
	case "23505":
		return huma.Error409Conflict("that file is already attached to this one")
	default:
		return nil
	}
}

func tooLargeMessage(limit int64) string {
	return fmt.Sprintf("file is larger than the %d MB limit", limit/1024/1024)
}
