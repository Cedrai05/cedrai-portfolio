package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testEnvironment(t *testing.T) {
	t.Helper()
	t.Setenv("ADMIN_ID", "admin")
	t.Setenv("ADMIN_PASSWORD", "test-password")
	t.Setenv("ADMIN_SESSION_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("GITHUB_TOKEN", "test-github-token")
	t.Setenv("GITHUB_REPO", "owner/repo")
	t.Setenv("FILE_SHARE_PUBLIC_BASE_URL", "https://www.cedrai.info")
}

func imageBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 1, 1))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	var out bytes.Buffer
	if err := png.Encode(&out, img); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()
}

func uploadRequest(t *testing.T, name string, content []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "https://www.cedrai.info/api/files", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func TestUploadDownloadWithoutAuth(t *testing.T) {
	testEnvironment(t)
	var stored []byte
	var storedPath string
	github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-github-token" {
			t.Error("GitHub authorization missing")
		}
		switch r.Method {
		case http.MethodPut:
			storedPath = r.URL.Path
			var body struct{ Content, Branch string }
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Error(err)
			}
			if body.Branch != "file-share-data" {
				t.Errorf("wrong branch: %s", body.Branch)
			}
			var err error
			stored, err = base64.StdEncoding.DecodeString(body.Content)
			if err != nil {
				t.Error(err)
			}
			w.WriteHeader(http.StatusCreated)
		case http.MethodGet:
			if stored == nil {
				http.NotFound(w, r)
				return
			}
			if strings.Contains(r.URL.Path, "/git/blobs/") {
				_ = json.NewEncoder(w).Encode(map[string]string{"encoding": "base64", "content": base64.StdEncoding.EncodeToString(stored)})
			} else if r.URL.Path == storedPath {
				// Deliberately omit inline content: binary must come from the Git blob API.
				_ = json.NewEncoder(w).Encode(map[string]string{"sha": strings.Repeat("a", 40)})
			} else {
				http.NotFound(w, r)
			}
		}
	}))
	defer github.Close()
	t.Setenv("GITHUB_API_BASE", github.URL)
	data := imageBytes(t)
	request := uploadRequest(t, "proof.png", data)
	request.SetBasicAuth("admin", "test-password")
	response := httptest.NewRecorder()
	Handler(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("upload status %d: %s", response.Code, response.Body.String())
	}
	var result struct {
		URL       string `json:"url"`
		ExpiresAt string `json:"expires_at"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(result.URL, "https://www.cedrai.info/api/files?id=") {
		t.Fatalf("bad share URL: %s", result.URL)
	}
	expiresAt, err := time.Parse(time.RFC3339, result.ExpiresAt)
	if err != nil || time.Until(expiresAt) < 23*time.Hour || time.Until(expiresAt) > 25*time.Hour {
		t.Fatalf("bad expiry: %q", result.ExpiresAt)
	}
	if strings.Contains(storedPath, strings.TrimPrefix(result.URL, "https://www.cedrai.info/api/files?id=")) || bytes.Contains(stored, data) || bytes.Contains(stored, []byte("proof.png")) {
		t.Fatal("public token, file data, or name leaked into GitHub storage")
	}
	download := httptest.NewRecorder()
	Handler(download, httptest.NewRequest(http.MethodGet, result.URL, nil))
	if download.Code != http.StatusOK || !bytes.Equal(download.Body.Bytes(), data) {
		t.Fatalf("download status %d", download.Code)
	}
	if !strings.Contains(download.Header().Get("Content-Disposition"), "attachment") || download.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("download security headers missing")
	}

	noAuth := httptest.NewRecorder()
	Handler(noAuth, uploadRequest(t, "proof.png", data))
	if noAuth.Code != http.StatusCreated {
		t.Fatalf("unauthenticated upload status %d", noAuth.Code)
	}
	badType := uploadRequest(t, "proof.png", []byte("not a PNG"))
	badType.SetBasicAuth("admin", "test-password")
	badResponse := httptest.NewRecorder()
	Handler(badResponse, badType)
	if badResponse.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("invalid content status %d", badResponse.Code)
	}
}

func TestCrossOriginUploadRejected(t *testing.T) {
	testEnvironment(t)
	request := uploadRequest(t, "proof.png", imageBytes(t))
	request.Header.Set("Origin", "https://attacker.example")
	response := httptest.NewRecorder()
	Handler(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("cross-origin upload status %d", response.Code)
	}
}

func TestRecordTamperingAndFilename(t *testing.T) {
	testEnvironment(t)
	if safeFilename("../bad.png") || safeFilename(`bad\\name.pdf`) || safeFilename(".hidden.png") || safeFilename(" trailing.png ") {
		t.Fatal("path-like filename accepted")
	}
	record, err := encrypt(fileInfo{Name: "proof.pdf", MIME: "application/pdf", Size: 3}, []byte("abc"))
	if err != nil {
		t.Fatal(err)
	}
	record[len(record)-1] ^= 1
	if _, _, err := decrypt(record); err == nil {
		t.Fatal("modified encrypted file accepted")
	}
}

func TestImageDecodeAndDimensions(t *testing.T) {
	valid := imageBytes(t)
	if err := validateImage(valid, "image/png"); err != nil {
		t.Fatalf("valid PNG rejected: %v", err)
	}
	if err := validateImage(valid[:25], "image/png"); err == nil {
		t.Fatal("truncated PNG accepted")
	}
	large := image.NewRGBA(image.Rect(0, 0, 5000, 1))
	var pngBytes bytes.Buffer
	if err := png.Encode(&pngBytes, large); err != nil {
		t.Fatal(err)
	}
	if err := validateImage(pngBytes.Bytes(), "image/png"); err == nil {
		t.Fatal("oversized image dimensions accepted")
	}
	var jpegBytes bytes.Buffer
	if err := jpeg.Encode(&jpegBytes, image.NewRGBA(image.Rect(0, 0, 1, 1)), nil); err != nil {
		t.Fatal(err)
	}
	if err := validateImage(jpegBytes.Bytes(), "image/jpeg"); err != nil {
		t.Fatalf("valid JPEG rejected: %v", err)
	}
}

func TestExpiredLinkAndCleanup(t *testing.T) {
	testEnvironment(t)
	t.Setenv("CRON_SECRET", strings.Repeat("c", 32))
	old, err := encrypt(fileInfo{Name: "old.pdf", MIME: "application/pdf", Size: 3, ExpiresAt: time.Now().Add(-time.Hour)}, []byte("abc"))
	if err != nil {
		t.Fatal(err)
	}
	fresh, err := encrypt(fileInfo{Name: "fresh.pdf", MIME: "application/pdf", Size: 3, ExpiresAt: time.Now().Add(time.Hour)}, []byte("def"))
	if err != nil {
		t.Fatal(err)
	}
	oldSHA, freshSHA := strings.Repeat("a", 40), strings.Repeat("b", 40)
	oldPath := "data/file-share/" + strings.Repeat("1", 64) + ".bin"
	freshPath := "data/file-share/" + strings.Repeat("2", 64) + ".bin"
	deletes := 0
	github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/contents/data/file-share"):
			_ = json.NewEncoder(w).Encode([]githubEntry{{Path: oldPath, SHA: oldSHA, Type: "file"}, {Path: freshPath, SHA: freshSHA, Type: "file"}})
		case r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/contents/"):
			_ = json.NewEncoder(w).Encode(map[string]string{"sha": oldSHA})
		case r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/git/blobs/"):
			data := old
			if strings.HasSuffix(r.URL.Path, freshSHA) {
				data = fresh
			}
			_ = json.NewEncoder(w).Encode(map[string]string{"encoding": "base64", "content": base64.StdEncoding.EncodeToString(data)})
		case r.Method == http.MethodDelete && strings.HasSuffix(r.URL.Path, oldPath):
			deletes++
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "unexpected request", http.StatusBadRequest)
		}
	}))
	defer github.Close()
	t.Setenv("GITHUB_API_BASE", github.URL)
	id := base64.RawURLEncoding.EncodeToString(bytes.Repeat([]byte{1}, 24))
	response := httptest.NewRecorder()
	Handler(response, httptest.NewRequest(http.MethodGet, "https://www.cedrai.info/api/files?id="+id, nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("expired link status %d", response.Code)
	}
	unauthorized := httptest.NewRecorder()
	Handler(unauthorized, httptest.NewRequest(http.MethodGet, "https://www.cedrai.info/api/files?cleanup=1", nil))
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unprotected cleanup status %d", unauthorized.Code)
	}
	request := httptest.NewRequest(http.MethodGet, "https://www.cedrai.info/api/files?cleanup=1", nil)
	request.Header.Set("Authorization", "Bearer "+strings.Repeat("c", 32))
	cleaned := httptest.NewRecorder()
	Handler(cleaned, request)
	if cleaned.Code != http.StatusOK || deletes != 1 || !strings.Contains(cleaned.Body.String(), `"deleted":1`) {
		t.Fatalf("cleanup failed: status %d, deletes %d, body %s", cleaned.Code, deletes, cleaned.Body.String())
	}
}

func TestLocalDiskBackend(t *testing.T) {
	testEnvironment(t)
	t.Setenv("FILE_SHARE_STORAGE", "local")
	t.Setenv("FILE_SHARE_DATA_DIR", filepath.Join(t.TempDir(), "private-files"))
	t.Setenv("CRON_SECRET", strings.Repeat("c", 32))
	data := imageBytes(t)
	request := uploadRequest(t, "local.png", data)
	request.SetBasicAuth("admin", "test-password")
	response := httptest.NewRecorder()
	Handler(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("local upload status %d: %s", response.Code, response.Body.String())
	}
	var result struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	id := strings.TrimPrefix(result.URL, "https://www.cedrai.info/api/files?id=")
	path, err := localPath(storageKey(id))
	if err != nil {
		t.Fatal(err)
	}
	fileStat, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	dirStat, err := os.Stat(localDataDir())
	if err != nil || fileStat.Mode().Perm() != 0600 || dirStat.Mode().Perm() != 0700 {
		t.Fatalf("unsafe file or directory permissions: file %v, dir %v", fileStat.Mode().Perm(), dirStat.Mode().Perm())
	}
	stored, err := os.ReadFile(path)
	if err != nil || bytes.Contains(stored, data) || bytes.Contains(stored, []byte("local.png")) {
		t.Fatal("local file was not encrypted")
	}
	download := httptest.NewRecorder()
	Handler(download, httptest.NewRequest(http.MethodGet, result.URL, nil))
	if download.Code != http.StatusOK || !bytes.Equal(download.Body.Bytes(), data) {
		t.Fatalf("local download status %d", download.Code)
	}
	expired, err := encrypt(fileInfo{Name: "local.png", MIME: "image/png", Size: int64(len(data)), ExpiresAt: time.Now().Add(-time.Hour)}, data)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, expired, 0600); err != nil {
		t.Fatal(err)
	}
	cleanupRequest := httptest.NewRequest(http.MethodGet, "https://www.cedrai.info/api/files?cleanup=1", nil)
	cleanupRequest.Header.Set("Authorization", "Bearer "+strings.Repeat("c", 32))
	cleaned := httptest.NewRecorder()
	Handler(cleaned, cleanupRequest)
	if cleaned.Code != http.StatusOK || !strings.Contains(cleaned.Body.String(), `"deleted":1`) {
		t.Fatalf("local cleanup failed: %s", cleaned.Body.String())
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("expired local file still exists")
	}
}

func TestUploadRejectsPathAndLargeFile(t *testing.T) {
	testEnvironment(t)
	for _, tc := range []struct {
		name string
		data []byte
		want int
	}{
		{"../proof.png", imageBytes(t), http.StatusBadRequest},
		{"large.pdf", append([]byte("%PDF-1.7\n"), bytes.Repeat([]byte("a"), int(maxFileSize))...), http.StatusRequestEntityTooLarge},
	} {
		req := uploadRequest(t, tc.name, tc.data)
		req.SetBasicAuth("admin", "test-password")
		response := httptest.NewRecorder()
		Handler(response, req)
		if response.Code != tc.want {
			t.Errorf("%s: status %d, want %d: %s", tc.name, response.Code, tc.want, response.Body.String())
		}
	}
}

func TestDownloadLargeGitHubBlob(t *testing.T) {
	testEnvironment(t)
	data := append([]byte("%PDF-1.7\n"), bytes.Repeat([]byte("a"), 2<<20)...)
	record, err := encrypt(fileInfo{Name: "large.pdf", MIME: "application/pdf", Size: int64(len(data))}, data)
	if err != nil {
		t.Fatal(err)
	}
	github := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/git/blobs/") {
			_ = json.NewEncoder(w).Encode(map[string]string{"encoding": "base64", "content": base64.StdEncoding.EncodeToString(record)})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"sha": strings.Repeat("a", 40)})
	}))
	defer github.Close()
	t.Setenv("GITHUB_API_BASE", github.URL)
	id := base64.RawURLEncoding.EncodeToString(bytes.Repeat([]byte{1}, 24))
	response := httptest.NewRecorder()
	Handler(response, httptest.NewRequest(http.MethodGet, "https://www.cedrai.info/api/files?id="+id, nil))
	if response.Code != http.StatusOK || !bytes.Equal(response.Body.Bytes(), data) {
		t.Fatalf("large download failed: status %d", response.Code)
	}
}
