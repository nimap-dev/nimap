package media

import (
	"errors"
	"fmt"
	"image"
	"image/color"
	stddraw "image/draw"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"os"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

var (
	ErrNotAnImage    = errors.New("file is not a decodable image")
	ErrImageTooLarge = errors.New("image has too many pixels")
)

const (
	maxDecodePixels = 100_000_000
	jpegQuality     = 80
)

// imageVariants are the sizes generated for every image, longest edge first.
// Largest to smallest matters: each is scaled from the one before it.
var imageVariants = []struct {
	variant Variant
	maxEdge int
}{
	{VariantPreview, 1600},
	{VariantThumb, 400},
}

// Thumbnail decodes a stored original and writes an image variant beside it for
// each size, reporting the dimensions of the original.
func (s *Store) Thumbnail(storagePath string) (int, int, error) {
	file, _, err := s.Open(storagePath, VariantOriginal)
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	config, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, fmt.Errorf("%w: %w", ErrNotAnImage, err)
	}
	if int64(config.Width)*int64(config.Height) > maxDecodePixels {
		return 0, 0, fmt.Errorf("%w: %dx%d", ErrImageTooLarge, config.Width, config.Height)
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return 0, 0, err
	}

	source, _, err := image.Decode(file)
	if err != nil {
		return 0, 0, fmt.Errorf("%w: %w", ErrNotAnImage, err)
	}

	bounds := source.Bounds()

	for _, spec := range imageVariants {
		scaled := downscale(source, spec.maxEdge)

		if err := s.writeVariant(storagePath, spec.variant, scaled); err != nil {
			return 0, 0, err
		}

		source = scaled
	}

	return bounds.Dx(), bounds.Dy(), nil
}

func downscale(source image.Image, maxEdge int) image.Image {
	bounds := source.Bounds()

	longest := bounds.Dx()
	if bounds.Dy() > longest {
		longest = bounds.Dy()
	}
	if longest <= maxEdge {
		return source
	}

	width := bounds.Dx() * maxEdge / longest
	height := bounds.Dy() * maxEdge / longest
	if width < 1 {
		width = 1
	}
	if height < 1 {
		height = 1
	}

	scaled := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.CatmullRom.Scale(scaled, scaled.Bounds(), source, bounds, draw.Src, nil)

	return scaled
}

func (s *Store) writeVariant(storagePath string, v Variant, source image.Image) error {
	bounds := source.Bounds()
	flat := image.NewRGBA(image.Rect(0, 0, bounds.Dx(), bounds.Dy()))
	stddraw.Draw(flat, flat.Bounds(), image.NewUniform(color.White), image.Point{}, stddraw.Src)
	stddraw.Draw(flat, flat.Bounds(), source, bounds.Min, stddraw.Over)

	file, err := s.Create(storagePath, v)
	if err != nil {
		return err
	}

	if err := jpeg.Encode(file, flat, &jpeg.Options{Quality: jpegQuality}); err != nil {
		file.Close()
		return err
	}

	return file.Close()
}

// HasVariant reports whether a variant has already been generated.
func (s *Store) HasVariant(storagePath string, v Variant) bool {
	name, err := s.resolve(storagePath, v)
	if err != nil {
		return false
	}

	info, err := os.Stat(name)

	return err == nil && !info.IsDir()
}
