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
	"io"
	"mime"
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

var fileTypes = map[string]string{
	".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf",
}

type fileInfo struct {
	Name string `json:"name"`
	MIME string `json:"mime"`
	Size int64  `json:"size"`
}

// Handler is the Vercel Go Function for both browser and curl uploads/downloads.
func Handler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		upload(w, r)
	case http.MethodGet, http.MethodHead:
		download(w, r)
	default:
		w.Header().Set("Allow", "GET, HEAD, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	if !authorized(r) {
		w.Header().Set("WWW-Authenticate", `Basic realm="Cédrai file upload"`)
		http.Error(w, "administrator login required", http.StatusUnauthorized)
		return
	}
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
	record, err := encrypt(fileInfo{Name: name, MIME: mimeType, Size: int64(len(data))}, data)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	if err := githubPut(key, record); err != nil {
		http.Error(w, "storage failed", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"url": publicBaseURL() + "/api/files?id=" + id})
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
	record, found, err := githubGet(storageKey(id))
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
	w.Header().Set("Content-Type", info.MIME)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": info.Name}))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	http.ServeContent(w, r, info.Name, time.Time{}, bytes.NewReader(data))
}

func authorized(r *http.Request) bool {
	adminID, adminPassword, secret := os.Getenv("ADMIN_ID"), os.Getenv("ADMIN_PASSWORD"), os.Getenv("ADMIN_SESSION_SECRET")
	if adminID == "" || adminPassword == "" || secret == "" {
		return false
	}
	if id, password, ok := r.BasicAuth(); ok && equalSecret(id, adminID) && equalSecret(password, adminPassword) {
		return true
	}
	cookie, err := r.Cookie("cedrai_session")
	if err != nil {
		return false
	}
	parts := strings.Split(cookie.Value, ".")
	if len(parts) != 2 {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0]))
	want := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !equalSecret(parts[1], want) {
		return false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(parts[0])
	return err == nil && equalSecret(string(decoded), adminID)
}

func equalSecret(a, b string) bool {
	ah, bh := sha256.Sum256([]byte(a)), sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(ah[:], bh[:]) == 1
}

func sameOrigin(origin string, r *http.Request) bool {
	u, err := url.Parse(origin)
	return err == nil && u.Host == r.Host && (u.Scheme == "https" || (u.Scheme == "http" && (r.Host == "localhost:3000" || r.Host == "127.0.0.1:3000")))
}

func safeFilename(name string) bool {
	if name == "" || name == "." || name == ".." || len(name) > 255 || !utf8.ValidString(name) || strings.ContainsAny(name, `/\`) {
		return false
	}
	for _, c := range name {
		if unicode.IsControl(c) {
			return false
		}
	}
	return true
}

func storageConfigured() bool {
	return os.Getenv("GITHUB_TOKEN") != "" && os.Getenv("GITHUB_REPO") != "" && os.Getenv("ADMIN_SESSION_SECRET") != ""
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
		Content string `json:"content"`
		SHA     string `json:"sha"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&result); err != nil {
		return nil, false, err
	}
	if result.Content != "" {
		data, err := base64.StdEncoding.DecodeString(result.Content)
		return data, true, err
	}
	if len(result.SHA) != 40 {
		return nil, false, errors.New("missing GitHub blob SHA")
	}
	blob, err := githubRequest(http.MethodGet, githubURL("/git/blobs/"+result.SHA), nil)
	if err != nil {
		return nil, false, err
	}
	defer blob.Body.Close()
	if blob.StatusCode != http.StatusOK {
		return nil, false, fmt.Errorf("GitHub blob status %d", blob.StatusCode)
	}
	var detail struct {
		Encoding string `json:"encoding"`
		Content  string `json:"content"`
	}
	if err := json.NewDecoder(io.LimitReader(blob.Body, 6<<20)).Decode(&detail); err != nil || detail.Encoding != "base64" {
		return nil, false, errors.New("invalid GitHub blob")
	}
	data, err := base64.StdEncoding.DecodeString(detail.Content)
	return data, true, err
}

func githubBranch() string {
	if branch := os.Getenv("FILE_SHARE_BRANCH"); branch != "" {
		return branch
	}
	return "file-share-data"
}
