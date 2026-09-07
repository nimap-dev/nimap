package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2/humacli"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/spf13/cobra"
	"golang.org/x/term"

	"github.com/nimap-dev/nimap/internal/config"
	"github.com/nimap-dev/nimap/internal/db"
	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/media"
	"github.com/nimap-dev/nimap/internal/text"
)

// registerMediaCommand adds `nimap media`.
func registerMediaCommand(cli humacli.CLI) {
	command := &cobra.Command{
		Use:   "media",
		Short: "Inspect and tidy the files under SERVICE_MEDIA_DIR",
	}

	command.AddCommand(newMediaCheckCommand())
	command.AddCommand(newMediaThumbnailsCommand())
	command.AddCommand(newMediaPruneCommand())
	cli.Root().AddCommand(command)
}

type orphan struct {
	storagePath string
	size        int64
	modified    time.Time
}

func newMediaCheckCommand() *cobra.Command {
	var (
		removeThem bool
		assumeYes  bool
		minAge     time.Duration
	)

	cmd := &cobra.Command{
		Use:   "check",
		Short: "Compare the media directory against the assets table",
		Long: "Compare the media directory against the assets table.\n\n" +
			"Reports files that no row points at, and rows whose file is gone.\n" +
			"Nothing is changed unless --delete is given, and even then only\n" +
			"orphaned files are removed: a row whose file is missing is left\n" +
			"alone, because the file may still be in a backup and the row is\n" +
			"the only record of what it was.\n\n" +
			"Exits 1 when a file is missing, so this can be run from a monitor.",
		Args: cobra.NoArgs,
		Run: humacli.WithOptions(func(cmd *cobra.Command, _ []string, cfg *config.Config) {
			if err := cfg.Validate(); err != nil {
				fmt.Fprintf(os.Stderr, "configuration: %v\n", err)
				os.Exit(1)
			}

			ctx := cmd.Context()

			store, err := media.NewStore(cfg.MediaDir)
			if err != nil {
				fatal("media directory unusable", err)
			}

			pool, err := db.NewPool(ctx, cfg.DatabaseURL)
			if err != nil {
				fatal("database connection failed", err)
			}
			defer pool.Close()

			onDisk := map[string]os.FileInfo{}
			err = store.WalkBlobs(func(storagePath string, info os.FileInfo) error {
				onDisk[storagePath] = info
				return nil
			})
			if err != nil {
				fatal("could not read the media directory", err)
			}

			stored, err := gen.New(pool).ListAssetStoragePaths(ctx)
			if err != nil {
				fatal("could not read the assets table", err)
			}

			known := make(map[string]struct{}, len(stored))
			for _, storagePath := range stored {
				known[storagePath] = struct{}{}
			}

			var missing []string
			for _, storagePath := range stored {
				if _, ok := onDisk[storagePath]; !ok {
					missing = append(missing, storagePath)
				}
			}

			var orphans, tooNew []orphan
			cutoff := time.Now().Add(-minAge)
			for storagePath, info := range onDisk {
				if _, ok := known[storagePath]; ok {
					continue
				}

				found := orphan{
					storagePath: storagePath,
					size:        info.Size(),
					modified:    info.ModTime(),
				}
				if info.ModTime().After(cutoff) {
					tooNew = append(tooNew, found)
					continue
				}

				orphans = append(orphans, found)
			}

			report(len(onDisk), len(stored), orphans, tooNew, missing, minAge)

			if removeThem && len(orphans) > 0 {
				if !confirmDeletion(cfg, len(orphans), len(stored), assumeYes) {
					os.Exit(1)
				}

				removed := 0
				for _, found := range orphans {
					if err := store.Remove(found.storagePath); err != nil {
						fmt.Fprintf(os.Stderr, "could not remove %s: %v\n", found.storagePath, err)
						continue
					}
					removed++
				}

				fmt.Printf("\nremoved %s\n", text.Plural(removed, "file", "files"))
			}

			if len(missing) > 0 {
				os.Exit(1)
			}
		}),
	}

	cmd.Flags().BoolVar(&removeThem, "delete", false,
		"remove the orphaned files instead of only listing them")
	cmd.Flags().BoolVarP(&assumeYes, "yes", "y", false,
		"skip the confirmation prompts")
	cmd.Flags().DurationVar(&minAge, "min-age", 24*time.Hour,
		"leave files younger than this alone; they may be uploads still in flight")

	return cmd
}

func report(
	onDisk int,
	stored int,
	orphans []orphan,
	tooNew []orphan,
	missing []string,
	minAge time.Duration,
) {
	fmt.Printf("files on disk:     %6d\n", onDisk)
	fmt.Printf("rows in database:  %6d\n", stored)
	fmt.Printf("orphaned files:    %6d\n", len(orphans))

	for _, found := range orphans {
		fmt.Printf("  %s  %s  %s old\n",
			found.storagePath,
			humanBytes(found.size),
			humanAge(time.Since(found.modified)))
	}

	if len(tooNew) > 0 {
		fmt.Printf("  (%s newer than %s, left alone)\n",
			text.Plural(len(tooNew), "file", "files"), minAge)
	}

	fmt.Printf("missing files:     %6d\n", len(missing))
	for _, storagePath := range missing {
		fmt.Printf("  %s  no file for this row\n", storagePath)
	}
}

func confirmDeletion(cfg *config.Config, orphans int, stored int, assumeYes bool) bool {
	if stored == 0 && !assumeYes {
		fmt.Fprintf(os.Stderr,
			"\nrefusing to delete: the database reports no assets at all, but %s are on disk.\n"+
				"Check SERVICE_DATABASE_URL points at the right database. Pass --yes if the\n"+
				"media directory really should be emptied.\n",
			text.Plural(orphans, "file is", "files are"))
		return false
	}

	if cfg.Env != "production" || assumeYes {
		return true
	}

	if !term.IsTerminal(int(os.Stdin.Fd())) {
		fmt.Fprintln(os.Stderr, "stdin is not a terminal, pass --yes to confirm non-interactively")
		return false
	}

	fmt.Fprintf(os.Stderr,
		"\nAbout to delete %s from a PRODUCTION media directory.\n"+
			"Type 'yes' to continue: ", text.Plural(orphans, "file", "files"))

	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && line == "" {
		fatal("could not read the confirmation", err)
	}
	if strings.TrimSpace(line) != "yes" {
		fmt.Fprintln(os.Stderr, "aborted, nothing was deleted")
		return false
	}

	return true
}

func humanAge(age time.Duration) string {
	if days := int(age.Hours() / 24); days >= 1 {
		return text.Plural(days, "day", "days")
	}

	return text.Plural(int(age.Hours()), "hour", "hours")
}

func humanBytes(size int64) string {
	switch {
	case size >= 1024*1024:
		return fmt.Sprintf("%.1f MB", float64(size)/(1024*1024))
	case size >= 1024:
		return fmt.Sprintf("%.0f kB", float64(size)/1024)
	default:
		return fmt.Sprintf("%d B", size)
	}
}

func newMediaThumbnailsCommand() *cobra.Command {
	var all bool

	cmd := &cobra.Command{
		Use:   "thumbnails",
		Short: "Generate the missing image variants",
		Long: "Generate the missing image variants.\n\n" +
			"By default only images that have no variant yet are processed, so\n" +
			"this is safe to re-run. --all rebuilds every image, which is what\n" +
			"to use after changing the sizes or the quality.\n\n" +
			"One unreadable file does not stop the rest; the failures are listed\n" +
			"at the end and the exit status is 1.",
		Args: cobra.NoArgs,
		Run: humacli.WithOptions(func(cmd *cobra.Command, _ []string, cfg *config.Config) {
			if err := cfg.Validate(); err != nil {
				fmt.Fprintf(os.Stderr, "configuration: %v\n", err)
				os.Exit(1)
			}

			ctx := cmd.Context()

			store, err := media.NewStore(cfg.MediaDir)
			if err != nil {
				fatal("media directory unusable", err)
			}

			pool, err := db.NewPool(ctx, cfg.DatabaseURL)
			if err != nil {
				fatal("database connection failed", err)
			}
			defer pool.Close()

			queries := gen.New(pool)

			images, err := queries.ListImageAssets(ctx)
			if err != nil {
				fatal("could not read the assets table", err)
			}

			done, skipped, failed := 0, 0, 0

			for _, asset := range images {
				if !all &&
					store.HasVariant(asset.StoragePath, media.VariantThumb) &&
					store.HasVariant(asset.StoragePath, media.VariantPreview) {
					skipped++
					continue
				}

				width, height, err := store.Thumbnail(asset.StoragePath)
				if err != nil {
					fmt.Fprintf(os.Stderr, "  %s: %v\n", asset.StoragePath, err)
					failed++
					continue
				}

				if asset.Width == nil {
					w32, h32 := int32(width), int32(height)
					if err := queries.UpdateAssetDimensions(ctx, gen.UpdateAssetDimensionsParams{
						ID:     asset.ID,
						Width:  &w32,
						Height: &h32,
					}); err != nil {
						fmt.Fprintf(os.Stderr, "  %s: could not record the size: %v\n",
							asset.StoragePath, err)
						failed++
						continue
					}
				}

				done++
				fmt.Printf("%s  %dx%d\n", asset.StoragePath, width, height)
			}

			fmt.Printf("\ngenerated %s, skipped %s, failed %s\n",
				text.Plural(done, "image", "images"),
				text.Plural(skipped, "image", "images"),
				text.Plural(failed, "image", "images"))

			if failed > 0 {
				os.Exit(1)
			}
		}),
	}

	cmd.Flags().BoolVar(&all, "all", false,
		"rebuild every image, not only the ones with no variant yet")

	return cmd
}

func newMediaPruneCommand() *cobra.Command {
	var (
		removeThem bool
		assumeYes  bool
		minAge     time.Duration
	)

	cmd := &cobra.Command{
		Use:   "prune",
		Short: "Delete assets that nothing points at any more",
		Long: "Delete assets that nothing points at any more.\n\n" +
			"Deleting a building or a location takes its attachments with it but\n" +
			"leaves the files themselves, and nothing in the interface can reach\n" +
			"one that hangs off nothing. `media check` will not find them either:\n" +
			"the row and the file agree, they are simply orphaned.\n\n" +
			"An asset with no attachment yet is also how an upload arrives before\n" +
			"it is assigned, so anything newer than --min-age is left alone.",
		Args: cobra.NoArgs,
		Run: humacli.WithOptions(func(cmd *cobra.Command, _ []string, cfg *config.Config) {
			if err := cfg.Validate(); err != nil {
				fmt.Fprintf(os.Stderr, "configuration: %v\n", err)
				os.Exit(1)
			}

			ctx := cmd.Context()

			store, err := media.NewStore(cfg.MediaDir)
			if err != nil {
				fatal("media directory unusable", err)
			}

			pool, err := db.NewPool(ctx, cfg.DatabaseURL)
			if err != nil {
				fatal("database connection failed", err)
			}
			defer pool.Close()

			queries := gen.New(pool)

			unreferenced, err := queries.ListUnreferencedAssets(ctx)
			if err != nil {
				fatal("could not read the assets table", err)
			}

			cutoff := time.Now().Add(-minAge)
			prunable := make([]gen.ListUnreferencedAssetsRow, 0, len(unreferenced))
			tooNew := 0

			for _, asset := range unreferenced {
				if asset.CreatedAt.After(cutoff) {
					tooNew++
					continue
				}

				prunable = append(prunable, asset)
			}

			fmt.Printf("unreferenced assets: %6d\n", len(prunable))
			for _, asset := range prunable {
				fmt.Printf("  %s  %s  %s old\n",
					asset.Title,
					humanBytes(asset.ByteSize),
					humanAge(time.Since(asset.CreatedAt)))
			}
			if tooNew > 0 {
				fmt.Printf("  (%s newer than %s, left alone)\n",
					text.Plural(tooNew, "asset", "assets"), minAge)
			}

			if !removeThem || len(prunable) == 0 {
				return
			}

			if !confirmPrune(cfg, len(prunable), assumeYes) {
				os.Exit(1)
			}

			deleted, kept, failed := 0, 0, 0

			for _, asset := range prunable {
				storagePath, err := queries.DeleteAsset(ctx, asset.ID)
				if err != nil {
					var pgErr *pgconn.PgError

					switch {
					case errors.As(err, &pgErr) && pgErr.Code == "23503":
						kept++
					case errors.Is(err, pgx.ErrNoRows):
						kept++
					default:
						fmt.Fprintf(os.Stderr, "  %s: %v\n", asset.Title, err)
						failed++
					}

					continue
				}

				if err := store.Remove(storagePath); err != nil {
					fmt.Fprintf(os.Stderr, "  %s: file left behind: %v\n", storagePath, err)
				}

				deleted++
			}

			fmt.Printf("\ndeleted %s, kept %s, failed %s\n",
				text.Plural(deleted, "asset", "assets"),
				text.Plural(kept, "asset", "assets"),
				text.Plural(failed, "asset", "assets"))

			if failed > 0 {
				os.Exit(1)
			}
		}),
	}

	cmd.Flags().BoolVar(&removeThem, "delete", false,
		"delete them instead of only listing them")
	cmd.Flags().BoolVarP(&assumeYes, "yes", "y", false,
		"skip the confirmation prompt")
	cmd.Flags().DurationVar(&minAge, "min-age", 24*time.Hour,
		"leave assets younger than this alone; they may be uploads not yet assigned")

	return cmd
}

// confirmPrune asks before a production delete.
func confirmPrune(cfg *config.Config, count int, assumeYes bool) bool {
	if cfg.Env != "production" || assumeYes {
		return true
	}

	if !term.IsTerminal(int(os.Stdin.Fd())) {
		fmt.Fprintln(os.Stderr, "stdin is not a terminal, pass --yes to confirm non-interactively")
		return false
	}

	fmt.Fprintf(os.Stderr,
		"\nAbout to delete %s from a PRODUCTION database, with their files.\n"+
			"Type 'yes' to continue: ", text.Plural(count, "asset", "assets"))

	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && line == "" {
		fatal("could not read the confirmation", err)
	}
	if strings.TrimSpace(line) != "yes" {
		fmt.Fprintln(os.Stderr, "aborted, nothing was deleted")
		return false
	}

	return true
}
