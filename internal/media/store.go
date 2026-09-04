package media

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrTooLarge = errors.New("file is too large")
	ErrBadPath  = errors.New("invalid storage path")
)

const (
	originalsDir = "blobs"
	derivedDir   = "gen"
)

type Store struct{ root string }

func NewStore(root string) (*Store, error) {
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(abs, 0755); err != nil {
		return nil, err
	}

	abs, err = filepath.EvalSymlinks(abs)
	if err != nil {
		return nil, err
	}

	dirs := []string{filepath.Join(abs, originalsDir),
		filepath.Join(abs, derivedDir, string(VariantThumb)),
		filepath.Join(abs, derivedDir, string(VariantPreview)),
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, err
		}
	}

	// Check if we can write
	check := filepath.Join(abs, ".write-probe")
	if err := os.WriteFile(check, []byte("test ok"), 0644); err != nil {
		return nil, fmt.Errorf("media directory is not writable: %w", err)
	}
	if err := os.Remove(check); err != nil {
		return nil, err
	}

	return &Store{root: abs}, nil
}

func NewPath(ext string) string {
	return newPathAt(time.Now(), ext)
}

func newPathAt(now time.Time, ext string) string {
	year, month, day := now.UTC().Date()

	name := uuid.Must(uuid.NewV7()).String()
	if ext = strings.TrimPrefix(ext, "."); ext != "" {
		name += "." + ext
	}

	return path.Join(
		fmt.Sprintf("%04d", year),
		fmt.Sprintf("%02d", int(month)),
		fmt.Sprintf("%02d", day),
		name,
	)
}

// Save streams r to storagePath, reading at most limit bytes, and reports the
// size and sha256 of what it wrote.
func (s *Store) Save(storagePath string, r io.Reader, limit int64) (int64, []byte, error) {
	dst, err := s.resolve(storagePath, VariantOriginal)
	if err != nil {
		return 0, nil, err
	}

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return 0, nil, err
	}

	file, err := os.Create(dst)
	if err != nil {
		return 0, nil, err
	}

	saved := false
	defer func() {
		file.Close()
		if !saved {
			os.Remove(dst)
		}
	}()

	hasher := sha256.New()
	written, err := io.Copy(io.MultiWriter(file, hasher), io.LimitReader(r, limit+1))
	if err != nil {
		return 0, nil, err
	}
	if written > limit {
		return 0, nil, ErrTooLarge
	}

	if err := file.Sync(); err != nil {
		return 0, nil, err
	}

	saved = true
	return written, hasher.Sum(nil), nil
}

func (s *Store) Open(storagePath string, v Variant) (*os.File, os.FileInfo, error) {
	name, err := s.resolve(storagePath, v)
	if err != nil {
		return nil, nil, err
	}

	file, err := os.Open(name)
	if err != nil {
		return nil, nil, err
	}

	info, err := file.Stat()
	if err != nil {
		file.Close()
		return nil, nil, err
	}

	return file, info, nil
}

// Create opens a variant for writing, creating the directories it needs. The
// caller closes it.
func (s *Store) Create(storagePath string, v Variant) (*os.File, error) {
	name, err := s.resolve(storagePath, v)
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(filepath.Dir(name), 0755); err != nil {
		return nil, err
	}

	return os.Create(name)
}

// Remove deletes the original and every variant. A file that is already gone is
// not an error.
func (s *Store) Remove(storagePath string) error {
	for _, v := range []Variant{VariantOriginal, VariantThumb, VariantPreview} {
		name, err := s.resolve(storagePath, v)
		if err != nil {
			return err
		}
		if err := os.Remove(name); err != nil && !errors.Is(err, fs.ErrNotExist) {
			return err
		}
	}
	return nil
}

// resolve turns a stored path into an absolute one under the root.
func (s *Store) resolve(storagePath string, v Variant) (string, error) {
	if storagePath == "" || path.IsAbs(storagePath) || filepath.IsAbs(storagePath) {
		return "", ErrBadPath
	}
	for segment := range strings.SplitSeq(storagePath, "/") {
		if segment == "" || segment == "." || segment == ".." {
			return "", ErrBadPath
		}
	}

	var full string
	switch v {
	case VariantOriginal:
		full = filepath.Join(s.root, originalsDir, filepath.FromSlash(storagePath))
	case VariantThumb, VariantPreview:
		full = filepath.Join(s.root, derivedDir, string(v), filepath.FromSlash(storagePath+".jpg"))
	default:
		return "", ErrBadPath
	}

	if !strings.HasPrefix(full, s.root+string(os.PathSeparator)) {
		return "", ErrBadPath
	}

	return full, nil
}
