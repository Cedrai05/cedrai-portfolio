package handler

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
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

func TestUploadDownloadAndAuth(t *testing.T) {
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
			if r.URL.Path != storedPath || stored == nil {
				http.NotFound(w, r)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]string{"content": base64.StdEncoding.EncodeToString(stored)})
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
		URL string `json:"url"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(result.URL, "https://www.cedrai.info/api/files?id=") {
		t.Fatalf("bad share URL: %s", result.URL)
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
	if noAuth.Code != http.StatusUnauthorized {
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

func TestBrowserCookieAndCrossOrigin(t *testing.T) {
	testEnvironment(t)
	payload := base64.RawURLEncoding.EncodeToString([]byte("admin"))
	mac := hmac.New(sha256.New, []byte("0123456789abcdef0123456789abcdef"))
	mac.Write([]byte(payload))
	cookie := payload + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	request := uploadRequest(t, "proof.png", imageBytes(t))
	request.AddCookie(&http.Cookie{Name: "cedrai_session", Value: cookie})
	if !authorized(request) {
		t.Fatal("existing admin login cookie should authorize upload")
	}
	request.Header.Set("Origin", "https://attacker.example")
	response := httptest.NewRecorder()
	Handler(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("cross-origin upload status %d", response.Code)
	}
}

func TestRecordTamperingAndFilename(t *testing.T) {
	testEnvironment(t)
	if safeFilename("../bad.png") || safeFilename(`bad\\name.pdf`) {
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
