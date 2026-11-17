# Go 파일 업로드 서비스 구현 기록

참고: [Golang으로 파일 업로드 서비스 개발](https://tls456.github.io/posts/Golang-File-Uploader/). 이 프로젝트는 포트폴리오의 기존 Vercel 배포와 GitHub 저장 방식을 유지하면서, 참고 글의 로컬 디스크 실습·파일 검증·만료와 삭제 구분을 적용했다.

## 구현 전 알아둘 Go 개념

- **Go**는 코드를 실행 파일로 컴파일하는 정적 타입 언어다. 이 서비스의 서버 로직은 Go 표준 라이브러리로 작성했다.
- **`net/http`와 핸들러**: 핸들러는 `http.ResponseWriter`로 응답하고 `*http.Request`에서 요청을 읽는다. `Handler`가 HTTP 메서드에 따라 업로드·다운로드·정리 작업을 나눈다.
- **`io.Reader`**: 파일이나 HTTP 본문을 한꺼번에 다루지 않고 읽을 수 있는 공통 인터페이스다. `http.MaxBytesReader`와 `io.LimitReader`를 함께 사용해 요청과 파일 크기를 제한했다.
- **`defer`와 오류 처리**: 읽기·쓰기 후 `Close`를 예약하고, 실패한 단계에서는 HTTP 오류를 반환해 이후 저장을 중단한다. Go에서는 반환된 `error`를 명시적으로 확인한다.
- **`multipart/form-data`**: 브라우저의 `FormData`와 `curl -F`가 같은 형식의 파일 요청을 보낸다. 서버는 `file` 필드 하나만 허용한다.

## 요청 흐름

```text
웹 화면 또는 curl
    ↓ POST /api/files
요청 출처 확인 → 요청 크기 제한 → 파일명·확장자·MIME 검사
    ↓
PNG/JPEG 전체 디코딩 및 크기 검사 → 난수 공유 ID 생성
    ↓
AES-GCM 암호화 → 로컬 전용 디렉터리 또는 GitHub 데이터 브랜치 저장
    ↓
공유 URL과 24시간 만료 시각 반환

GET /api/files?id=<ID> → 만료 확인 → 복호화 → 첨부파일 다운로드
```

## 저장 경로와 보안

원본 파일명은 저장 경로에 붙이지 않는다. `crypto/rand`로 만든 공유 ID에 HMAC을 적용해 저장 키를 만든다. 따라서 `../` 같은 파일명이 경로를 바꾸거나 같은 이름의 파일을 덮어쓰지 못한다. 로컬 모드에서는 `.private_uploads/file-share/`에 0700 디렉터리와 0600 파일을 만들고, 배타적 생성으로 덮어쓰기를 막는다. Vercel 배포에서는 영구 로컬 디스크 대신 암호화된 파일을 `file-share-data` 브랜치에 저장한다.

클라이언트가 보낸 확장자와 `Content-Type`은 신뢰하지 않는다. 서버가 실제 파일의 처음 512바이트에서 MIME 타입을 판별해 확장자와 비교한다. PNG와 JPEG는 이미지 전체를 디코딩하고 가로·세로 각각 4096픽셀, 총 1,600만 픽셀 이하로 제한한다. PDF는 시그니처 수준만 확인하므로 내부 악성코드 검사까지 수행하는 것은 아니다.

외부 실습을 위해 업로드는 로그인 없이 공개했다. 다운로드는 링크를 가진 사람에게 공개된다. 응답에는 `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`를 넣었다.

## 만료와 실제 삭제

새 링크는 생성 24시간 후 다운로드 요청에 404를 반환한다. 파일을 그 시점에 바로 지우는 것은 별도 작업이다. Vercel Cron이 하루 한 번 만료된 암호화 파일을 GitHub 데이터 브랜치의 현재 상태에서 제거한다. 다만 GitHub 커밋 기록에는 암호문이 남으므로 완전한 삭제는 아니다. 로컬 모드도 같은 정리 핸들러를 사용할 수 있다. 기존 버전에서 생성된 링크에는 만료 정보가 없어서 계속 작동한다.

## 직접 검증할 명령

```bash
go test -race ./api ./cmd/file-share
go vet ./api ./cmd/file-share

curl -F 'file=@example.png' https://www.cedrai.info/api/files
curl -L -o downloaded.png '응답_JSON의_url'
shasum -a 256 example.png downloaded.png
```

잘못된 확장자, 위장한 PNG, `../`가 들어간 파일명, 크기 초과, 만료된 링크도 테스트한다. 로컬 디스크 실습과 외부 배포의 저장소 차이, 만료와 실제 삭제의 차이를 블로그 글에서 구분해 설명하면 된다.
