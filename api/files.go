package handler

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

const maxFileSize int64 = 3 << 20 // Vercel Functions accept at most 4.5 MB per request/response.
const shareLifetime = 24 * time.Hour

var fileTypes = map[string]string{
	".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf",
}

type fileInfo struct {
	Name      string    `json:"name"`
	MIME      string    `json:"mime"`
	Size      int64     `json:"size"`
	ExpiresAt time.Time `json:"expires_at,omitempty"`
}

// Handler is the Vercel Go Function for both browser and curl uploads/downloads.
func Handler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		upload(w, r)
	case http.MethodGet, http.MethodHead:
		if r.URL.Query().Get("cleanup") == "1" {
			cleanup(w, r)
		} else if r.URL.Query().Get("health") == "1" {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			_, _ = io.WriteString(w, `{"service":"cedrai-file-share","status":"ok"}`)
		} else {
			download(w, r)
		}
	default:
		w.Header().Set("Allow", "GET, HEAD, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	if origin := r.Header.Get("Origin"); origin != "" && !sameOrigin(origin, r) {
		http.Error(w, "invalid origin", http.StatusForbidden)
		return
	}
	if !storageConfigured() {
		http.Error(w, "file storage is not configured", http.StatusServiceUnavailable)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize+(128<<10))
	reader, err := r.MultipartReader()
	if err != nil {
		http.Error(w, "multipart/form-data required", http.StatusBadRequest)
		return
	}
	part, err := reader.NextPart()
	if err != nil || part.FormName() != "file" || part.FileName() == "" {
		http.Error(w, "one file field named file required", http.StatusBadRequest)
		return
	}
	defer part.Close()
	name := part.FileName()
	_, params, err := mime.ParseMediaType(part.Header.Get("Content-Disposition"))
	if err != nil || params["filename"] != name || !safeFilename(name) {
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}
	mimeType, ok := fileTypes[strings.ToLower(filepath.Ext(name))]
	if !ok {
		http.Error(w, "allowed types: PNG, JPEG, PDF", http.StatusUnsupportedMediaType)
		return
	}
	if declared := part.Header.Get("Content-Type"); declared != "" {
		parsed, _, err := mime.ParseMediaType(declared)
		if err != nil || (parsed != mimeType && parsed != "application/octet-stream") {
			http.Error(w, "MIME type does not match filename", http.StatusUnsupportedMediaType)
			return
		}
	}
	first, err := io.ReadAll(io.LimitReader(part, 512))
	if err != nil || len(first) == 0 || http.DetectContentType(first) != mimeType {
		http.Error(w, "file content does not match filename", http.StatusUnsupportedMediaType)
		return
	}
	data, err := io.ReadAll(io.LimitReader(io.MultiReader(bytes.NewReader(first), part), maxFileSize+1))
	if err != nil {
		http.Error(w, "upload failed", http.StatusBadRequest)
		return
	}
	if int64(len(data)) > maxFileSize {
		http.Error(w, "file exceeds 3 MiB", http.StatusRequestEntityTooLarge)
		return
	}
	if (mimeType == "image/png" || mimeType == "image/jpeg") && validateImage(data, mimeType) != nil {
		http.Error(w, "invalid or oversized image", http.StatusUnsupportedMediaType)
		return
	}
	if next, err := reader.NextPart(); err != io.EOF || next != nil {
		if next != nil {
			next.Close()
		}
		http.Error(w, "only one file is allowed", http.StatusBadRequest)
		return
	}
	idBytes := make([]byte, 24)
	if _, err := rand.Read(idBytes); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	id := base64.RawURLEncoding.EncodeToString(idBytes)
	key := storageKey(id)
	expiresAt := time.Now().UTC().Add(shareLifetime)
	record, err := encrypt(fileInfo{Name: name, MIME: mimeType, Size: int64(len(data)), ExpiresAt: expiresAt}, data)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	if err := saveRecord(key, record); err != nil {
		http.Error(w, "storage failed", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"url": publicBaseURL() + "/api/files?id=" + id, "expires_at": expiresAt.Format(time.RFC3339)})
}

func download(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	idBytes, err := base64.RawURLEncoding.DecodeString(id)
	if err != nil || len(idBytes) != 24 || base64.RawURLEncoding.EncodeToString(idBytes) != id {
		http.NotFound(w, r)
		return
	}
	if !storageConfigured() {
		http.Error(w, "file storage is not configured", http.StatusServiceUnavailable)
		return
	}
	record, found, err := loadRecord(storageKey(id))
	if err != nil {
		http.Error(w, "storage unavailable", http.StatusBadGateway)
		return
	}
	if !found {
		http.NotFound(w, r)
		return
	}
	info, data, err := decrypt(record)
	if err != nil || !safeFilename(info.Name) || fileTypes[strings.ToLower(filepath.Ext(info.Name))] != info.MIME || info.Size != int64(len(data)) {
		http.Error(w, "stored file is invalid", http.StatusInternalServerError)
		return
	}
	// Records created before expiration was introduced remain readable.
	if !info.ExpiresAt.IsZero() && !time.Now().Before(info.ExpiresAt) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", info.MIME)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": info.Name}))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Referrer-Policy", "no-referrer")
	http.ServeContent(w, r, info.Name, time.Time{}, bytes.NewReader(data))
}

func cleanup(w http.ResponseWriter, r *http.Request) {
	secret := os.Getenv("CRON_SECRET")
	const prefix = "Bearer "
	auth := r.Header.Get("Authorization")
	if r.Method != http.MethodGet || len(secret) < 32 || !strings.HasPrefix(auth, prefix) || !equalSecret(strings.TrimPrefix(auth, prefix), secret) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if !storageConfigured() {
		http.Error(w, "file storage is not configured", http.StatusServiceUnavailable)
		return
	}
	if localStorageEnabled() {
		cleanupLocal(w)
		return
	}
	entries, err := githubList()
	if err != nil {
		http.Error(w, "storage unavailable", http.StatusBadGateway)
		return
	}
	checked, deleted, failures := 0, 0, 0
	now := time.Now().UTC()
	for _, entry := range entries {
		if entry.Type != "file" || !validStoragePath(entry.Path) || len(entry.SHA) != 40 {
			continue
		}
		checked++
		record, err := githubBlob(entry.SHA)
		if err != nil {
			failures++
			log.Printf("file cleanup: read failed: %v", err)
			continue
		}
		info, _, err := decrypt(record)
		if err != nil {
			failures++
			log.Printf("file cleanup: invalid record: %v", err)
			continue
		}
		if info.ExpiresAt.IsZero() || now.Before(info.ExpiresAt) {
			continue
		}
		if err := githubDelete(entry.Path, entry.SHA); err != nil {
			failures++
			log.Printf("file cleanup: delete failed: %v", err)
			continue
		}
		deleted++
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	if failures > 0 {
		w.WriteHeader(http.StatusBadGateway)
	}
	_ = json.NewEncoder(w).Encode(map[string]int{"checked": checked, "deleted": deleted, "failures": failures})
}

func equalSecret(a, b string) bool {
	ah, bh := sha256.Sum256([]byte(a)), sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(ah[:], bh[:]) == 1
}

func sameOrigin(origin string, r *http.Request) bool {
	u, err := url.Parse(origin)
	if err != nil || u.Host != r.Host {
		return false
	}
	if u.Scheme == "https" {
		return true
	}
	host, _, err := net.SplitHostPort(r.Host)
	return u.Scheme == "http" && err == nil && (host == "localhost" || host == "127.0.0.1")
}

func safeFilename(name string) bool {
	if name == "" || name == "." || name == ".." || len(name) > 255 || !utf8.ValidString(name) || strings.ContainsAny(name, `/\`) || strings.HasPrefix(name, ".") || strings.TrimSpace(name) != name {
		return false
	}
	for _, c := range name {
		if unicode.IsControl(c) {
			return false
		}
	}
	return true
}

func validateImage(data []byte, mimeType string) error {
	var expected string
	switch mimeType {
	case "image/png":
		expected = "png"
	case "image/jpeg":
		expected = "jpeg"
	default:
		return errors.New("unsupported image")
	}
	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || format != expected || config.Width < 1 || config.Height < 1 || config.Width > 4096 || config.Height > 4096 || int64(config.Width)*int64(config.Height) > 16_000_000 {
		return errors.New("invalid image dimensions or format")
	}
	// Decode the whole image so a valid signature with a broken body is rejected.
	if expected == "png" {
		_, err = png.Decode(bytes.NewReader(data))
	} else {
		_, err = jpeg.Decode(bytes.NewReader(data))
	}
	return err
}

func storageConfigured() bool {
	if os.Getenv("ADMIN_SESSION_SECRET") == "" {
		return false
	}
	return localStorageEnabled() || (os.Getenv("GITHUB_TOKEN") != "" && os.Getenv("GITHUB_REPO") != "")
}

func localStorageEnabled() bool {
	return os.Getenv("FILE_SHARE_STORAGE") == "local"
}

func localDataDir() string {
	if dir := os.Getenv("FILE_SHARE_DATA_DIR"); dir != "" {
		return dir
	}
	return ".private_uploads/file-share"
}

func localPath(key string) (string, error) {
	if !validStoragePath(key) {
		return "", errors.New("invalid storage key")
	}
	return filepath.Join(localDataDir(), filepath.Base(key)), nil
}

func saveRecord(key string, data []byte) error {
	if !localStorageEnabled() {
		return githubPut(key, data)
	}
	path, err := localPath(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(localDataDir(), 0700); err != nil {
		return err
	}
	if err := os.Chmod(localDataDir(), 0700); err != nil {
		return err
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	if _, err := file.Write(data); err != nil {
		file.Close()
		os.Remove(path)
		return err
	}
	if err := file.Sync(); err != nil {
		file.Close()
		os.Remove(path)
		return err
	}
	if err := file.Close(); err != nil {
		os.Remove(path)
		return err
	}
	return nil
}

func loadRecord(key string) ([]byte, bool, error) {
	if !localStorageEnabled() {
		return githubGet(key)
	}
	path, err := localPath(key)
	if err != nil {
		return nil, false, err
	}
	file, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxFileSize+4096))
	if err != nil || int64(len(data)) >= maxFileSize+4096 {
		return nil, false, errors.New("invalid local file size")
	}
	return data, true, nil
}

func cleanupLocal(w http.ResponseWriter) {
	entries, err := os.ReadDir(localDataDir())
	if os.IsNotExist(err) {
		entries = nil
	} else if err != nil {
		http.Error(w, "storage unavailable", http.StatusBadGateway)
		return
	}
	checked, deleted, failures := 0, 0, 0
	now := time.Now().UTC()
	for _, entry := range entries {
		key := "data/file-share/" + entry.Name()
		if entry.IsDir() || !validStoragePath(key) {
			continue
		}
		checked++
		record, found, err := loadRecord(key)
		if err != nil || !found {
			failures++
			continue
		}
		info, _, err := decrypt(record)
		if err != nil {
			failures++
			continue
		}
		if info.ExpiresAt.IsZero() || now.Before(info.ExpiresAt) {
			continue
		}
		path, _ := localPath(key)
		if err := os.Remove(path); err != nil {
			failures++
			continue
		}
		deleted++
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	if failures > 0 {
		w.WriteHeader(http.StatusBadGateway)
	}
	_ = json.NewEncoder(w).Encode(map[string]int{"checked": checked, "deleted": deleted, "failures": failures})
}

func publicBaseURL() string {
	if value := strings.TrimRight(os.Getenv("FILE_SHARE_PUBLIC_BASE_URL"), "/"); value != "" {
		return value
	}
	return "https://www.cedrai.info"
}

func fileKey() [32]byte {
	return sha256.Sum256([]byte("cedrai-file-share-v1\x00" + os.Getenv("ADMIN_SESSION_SECRET")))
}

func storageKey(id string) string {
	key := fileKey()
	mac := hmac.New(sha256.New, key[:])
	mac.Write([]byte(id))
	return "data/file-share/" + hex.EncodeToString(mac.Sum(nil)) + ".bin"
}

func encrypt(info fileInfo, data []byte) ([]byte, error) {
	meta, err := json.Marshal(info)
	if err != nil {
		return nil, err
	}
	if len(meta) > 65535 {
		return nil, errors.New("metadata too large")
	}
	plain := make([]byte, 2+len(meta)+len(data))
	binary.BigEndian.PutUint16(plain[:2], uint16(len(meta)))
	copy(plain[2:], meta)
	copy(plain[2+len(meta):], data)
	key := fileKey()
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	record := append([]byte{1}, nonce...)
	return aead.Seal(record, nonce, plain, nil), nil
}

func decrypt(record []byte) (fileInfo, []byte, error) {
	var info fileInfo
	if len(record) < 1+12+16 || record[0] != 1 {
		return info, nil, errors.New("invalid record")
	}
	key := fileKey()
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return info, nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return info, nil, err
	}
	nonceSize := aead.NonceSize()
	plain, err := aead.Open(nil, record[1:1+nonceSize], record[1+nonceSize:], nil)
	if err != nil || len(plain) < 2 {
		return info, nil, errors.New("decryption failed")
	}
	metaSize := int(binary.BigEndian.Uint16(plain[:2]))
	if len(plain) < 2+metaSize || json.Unmarshal(plain[2:2+metaSize], &info) != nil {
		return info, nil, errors.New("invalid metadata")
	}
	return info, plain[2+metaSize:], nil
}

func githubURL(path string) string {
	base := os.Getenv("GITHUB_API_BASE")
	if base == "" {
		base = "https://api.github.com"
	}
	return strings.TrimRight(base, "/") + "/repos/" + os.Getenv("GITHUB_REPO") + path
}

func githubRequest(method, target string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, target, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("GITHUB_TOKEN"))
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "cedrai-file-share")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return (&http.Client{Timeout: 20 * time.Second}).Do(req)
}

func githubPut(path string, data []byte) error {
	body, err := json.Marshal(map[string]string{
		"message": "file-share: store encrypted upload",
		"content": base64.StdEncoding.EncodeToString(data),
		"branch":  githubBranch(),
	})
	if err != nil {
		return err
	}
	res, err := githubRequest(http.MethodPut, githubURL("/contents/"+path), bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		return fmt.Errorf("GitHub write status %d", res.StatusCode)
	}
	return nil
}

func githubGet(path string) ([]byte, bool, error) {
	target := githubURL("/contents/" + path + "?ref=" + url.QueryEscape(githubBranch()))
	res, err := githubRequest(http.MethodGet, target, nil)
	if err != nil {
		return nil, false, err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound {
		return nil, false, nil
	}
	if res.StatusCode != http.StatusOK {
		return nil, false, fmt.Errorf("GitHub read status %d", res.StatusCode)
	}
	var result struct {
		SHA string `json:"sha"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&result); err != nil {
		return nil, false, err
	}
	if len(result.SHA) != 40 {
		return nil, false, errors.New("missing GitHub blob SHA")
	}
	// The Contents API's inline content can transform binary data. Read the raw
	// Git blob by SHA so AES-GCM receives exactly the bytes we uploaded.
	data, err := githubBlob(result.SHA)
	return data, true, err
}

type githubEntry struct {
	Path string `json:"path"`
	SHA  string `json:"sha"`
	Type string `json:"type"`
}

func githubList() ([]githubEntry, error) {
	res, err := githubRequest(http.MethodGet, githubURL("/contents/data/file-share?ref="+url.QueryEscape(githubBranch())), nil)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub list status %d", res.StatusCode)
	}
	var entries []githubEntry
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&entries); err != nil {
		return nil, err
	}
	if len(entries) >= 1000 {
		return nil, errors.New("GitHub directory listing is too large")
	}
	return entries, nil
}

func validStoragePath(path string) bool {
	const prefix = "data/file-share/"
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, ".bin") || len(path) != len(prefix)+64+4 {
		return false
	}
	_, err := hex.DecodeString(strings.TrimSuffix(strings.TrimPrefix(path, prefix), ".bin"))
	return err == nil
}

func githubDelete(path, sha string) error {
	if !validStoragePath(path) || len(sha) != 40 {
		return errors.New("invalid GitHub delete target")
	}
	body, err := json.Marshal(map[string]string{
		"message": "file-share: delete expired upload",
		"sha":     sha,
		"branch":  githubBranch(),
	})
	if err != nil {
		return err
	}
	res, err := githubRequest(http.MethodDelete, githubURL("/contents/"+path), bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusNotFound {
		return fmt.Errorf("GitHub delete status %d", res.StatusCode)
	}
	return nil
}

func githubBlob(sha string) ([]byte, error) {
	if len(sha) != 40 {
		return nil, errors.New("invalid GitHub blob SHA")
	}
	blob, err := githubRequest(http.MethodGet, githubURL("/git/blobs/"+sha), nil)
	if err != nil {
		return nil, err
	}
	defer blob.Body.Close()
	if blob.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub blob status %d", blob.StatusCode)
	}
	var detail struct {
		Encoding string `json:"encoding"`
		Content  string `json:"content"`
	}
	if err := json.NewDecoder(io.LimitReader(blob.Body, 6<<20)).Decode(&detail); err != nil || detail.Encoding != "base64" {
		return nil, errors.New("invalid GitHub blob")
	}
	data, err := base64.StdEncoding.DecodeString(detail.Content)
	return data, err
}

func githubBranch() string {
	if branch := os.Getenv("FILE_SHARE_BRANCH"); branch != "" {
		return branch
	}
	return "file-share-data"
}
