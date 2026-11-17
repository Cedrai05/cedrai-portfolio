package main

import (
	"log"
	"net/http"
	"os"
	"time"

	filehandler "github.com/Cedrai05/cedrai-portfolio/api"
)

func main() {
	if os.Getenv("ADMIN_ID") == "" || os.Getenv("ADMIN_PASSWORD") == "" || os.Getenv("ADMIN_SESSION_SECRET") == "" {
		log.Fatal("ADMIN_ID, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET are required")
	}
	if os.Getenv("FILE_SHARE_STORAGE") == "" {
		_ = os.Setenv("FILE_SHARE_STORAGE", "local")
	}
	if os.Getenv("FILE_SHARE_PUBLIC_BASE_URL") == "" {
		_ = os.Setenv("FILE_SHARE_PUBLIC_BASE_URL", "http://127.0.0.1:8081")
	}
	addr := os.Getenv("FILE_SHARE_LISTEN_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8081"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'")
		_, _ = w.Write([]byte(page))
	})
	mux.HandleFunc("/api/files", filehandler.Handler)
	server := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: time.Minute}
	log.Printf("file-share listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}

const page = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Go File Share</title>
<style>body{font:16px system-ui;max-width:38rem;margin:4rem auto;padding:0 1rem;background:#101b1b;color:#e8eded}main{border:1px solid #567;padding:2rem;border-radius:10px}label{display:block;margin:1rem 0 .3rem}input,button{box-sizing:border-box;width:100%;font:inherit;padding:.7rem}button{margin-top:1rem;cursor:pointer}a{color:#8ee;overflow-wrap:anywhere}</style>
<main><h1>Go 파일 공유</h1><p>PNG · JPEG · PDF / 최대 3 MiB / 공유 기간 24시간</p>
<form id="upload"><label for="id">관리자 ID</label><input id="id" required autocomplete="username"><label for="password">비밀번호</label><input id="password" type="password" required autocomplete="current-password"><label for="file">파일</label><input id="file" type="file" accept=".png,.jpg,.jpeg,.pdf" required><button>업로드</button></form><p id="result" role="status"></p></main>
<script>document.querySelector('#upload').addEventListener('submit',async event=>{event.preventDefault();const result=document.querySelector('#result');result.textContent='업로드 중…';const form=new FormData();form.append('file',document.querySelector('#file').files[0]);const credentials=document.querySelector('#id').value+':'+document.querySelector('#password').value;const bytes=new TextEncoder().encode(credentials);const basic=btoa(String.fromCharCode(...bytes));try{const response=await fetch('/api/files',{method:'POST',headers:{Authorization:'Basic '+basic},body:form});if(!response.ok)throw new Error(await response.text());const body=await response.json();const link=document.createElement('a');link.href=body.url;link.textContent=body.url;result.replaceChildren(document.createTextNode('공유 링크: '),link,document.createTextNode(' · 만료: '+new Date(body.expires_at).toLocaleString('ko-KR')))}catch(error){result.textContent='실패: '+error.message}})</script></html>`
