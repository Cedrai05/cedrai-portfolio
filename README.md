# Cédrai Portfolio

HUD 사이버펑크 스타일 개인 포트폴리오 — Next.js 15 + Tailwind CSS

## 빠른 시작

```bash
# 1. 새 Next.js 프로젝트 생성
npx create-next-app@latest cedrai-portfolio \
  --typescript --tailwind --app --src-dir=false \
  --import-alias="@/*"

cd cedrai-portfolio

# 2. 이 레포의 파일들로 덮어쓰기
#    app/ components/ 폴더를 복사해서 붙여넣기

# 3. 구글 폰트 (JetBrains Mono) — layout.tsx에 이미 설정됨

# 4. 개발 서버 실행
npm run dev
```

## Vercel 배포 (C 단계)

```bash
# Vercel CLI 설치
npm i -g vercel

# GitHub에 push 후 vercel.com에서 import
# 또는 CLI로 바로 배포
vercel
```

## 파일 구조

```
cedrai-portfolio/
├── app/
│   ├── globals.css   ← HUD 디자인 시스템 (CSS 변수, 글리치, 코너 브라켓)
│   ├── layout.tsx    ← JetBrains Mono 폰트, 메타데이터
│   └── page.tsx      ← 컴포넌트 조합
└── components/
    ├── Nav.tsx        ← 상단 네비게이션 (sticky)
    ├── Hero.tsx       ← 글리치 이름 + 타이핑 + 스캐너
    ├── Skills.tsx     ← 기술 스택 + 스킬 바
    ← Projects.tsx     ← 클립 카드 프로젝트
    ├── Blog.tsx       ← writeup 포스트 목록
    ├── Contact.tsx    ← GitHub / Blog / Email
    └── Footer.tsx     ← 하단 푸터
```

## 커스터마이징

### 색상 변경
`app/globals.css` 상단 `:root` 블록에서 수정:
```css
:root {
  --acc:  #00e5ff;  /* 메인 사이언 */
  --acc2: #ff2d55;  /* 레드/경고 */
}
```

### 콘텐츠 수정

| 대상 | 어디서 | 보이는 곳 |
|---|---|---|
| 프로젝트 | **관리자 로그인 후 화면에서 편집** (또는 `data/projects.json`) | `/projects` |
| 일정 / 투두 | `lib/data.ts`의 `SCHEDULE_EVENTS`, `TODOS` | `/schedule` |
| NOW | `lib/data.ts`의 `NOW_POSTS` | `/now` |

### 블로그 포스트

글 목록은 `data/blog-catalog.json`에 있습니다. 블로그 메인은 `/blog`이며 글 주소는 `/blog?post=63`처럼 번호로 구분합니다. 기존 글 번호는 유지하고 새 글은 마지막 번호 다음부터 배정하며, 예전 `tistory-63` 주소도 새 주소로 자동 연결됩니다. 공개글 본문과 첨부파일은 이 저장소의 `public/blog-content/`에 저장합니다. GitHub Pages나 티스토리를 거치지 않고 읽습니다. 검색·주제 필터·목록 위치 복원과 계정 로그인으로 비밀글 열람을 지원하며, 기존 포트폴리오 로그인과 테마를 함께 사용합니다.

기존 보호글과 Major/자료구조 글을 포함한 비밀글은 관리자 또는 seKUrity 계정으로 로그인해야 읽을 수 있습니다. 글별 비밀번호와 열람 토큰은 사용하지 않으며, 본문과 첨부파일 요청마다 서버에서 계정을 검사합니다. 블로그/기술문서의 `Major` 주제에서 티스토리 `Major/자료구조`에 있던 글 7개를 찾을 수 있습니다. 이 글들도 계정 로그인 후 열람합니다.

관리자로 로그인하면 `/blog`에 **글 작성** 버튼이 보입니다. `/blog/write`에서 제목·카테고리·주제·태그와 Markdown 본문을 작성하고, 이미지·첨부파일을 추가할 수 있습니다. **비밀글**을 체크하면 관리자와 seKUrity 계정만 읽을 수 있고, 체크하지 않으면 누구나 읽을 수 있습니다. 미리보기와 임시 저장도 지원합니다. 임시 저장한 글은 공개 목록에 나오지 않습니다.

관리자는 글 상세 화면의 **글 삭제** 버튼으로 기존 이관 글과 새 글을 삭제할 수 있습니다. 확인 후 목록으로 돌아가며, 서버에서도 관리자 권한과 요청 출처를 확인합니다. 삭제는 `blog-native/v2/deleted/`에 삭제 기록을 남기는 방식으로, 목록·본문·글 첨부파일 API·수정 화면에서 제외하고 같은 주소로 재발행할 수 없게 합니다. 원본과 글 번호, 공유 첨부파일은 보관합니다. 기존 공개글의 `public/blog-content/` 정적 원본 파일은 그대로 남으므로 파일 자체를 영구 삭제하는 기능은 아닙니다.

이 사이트에서 새로 발행한 글은 관리자에게만 글 화면의 **글 수정** 링크가 표시됩니다. 기존 제목·본문·분류·공개 설정을 불러와 수정할 수 있으며, 저장 후에도 글 주소·번호·작성일은 유지됩니다. 다른 화면에서 먼저 변경한 글은 덮어쓰지 않도록 저장을 막습니다. 티스토리에서 가져온 글은 수정 대상이 아닙니다.

새로 작성하는 글과 첨부파일은 GitHub의 `data/native-blog/`에 **AES-256-GCM으로 암호화해** 저장합니다. 공개 저장소에서 원문을 읽을 수 없으며, 서버가 로그인 여부를 확인한 후 복호화해 전달합니다. 암호화 키는 `ADMIN_SESSION_SECRET`에서 파생하므로 이 값을 변경하기 전에 저장된 글을 새 키로 옮겨야 합니다. GitHub 저장 시 첨부파일은 요청 크기 때문에 파일당 4MB까지 업로드할 수 있습니다. 기존 공개글은 `public/blog-content/`의 정적 파일로 계속 제공합니다. GitHub 설정이 없는 개발 환경에서는 `.private_uploads/native-blog/`를 사용합니다.

2026-11-08 이전에 작성한 글 124~130번의 원본은 기존 Vercel 비공개 Blob에 남겨 두었습니다. Blob이 차단된 동안 해당 글은 읽을 수 없지만 기존 정적 글과 새 GitHub 글은 계속 제공합니다. Blob 접근이 복구되면 관리자 계정으로 `POST /api/native-blog/migrate`에 `{ "number": 124 }`부터 130까지 각각 요청해 암호화된 GitHub 저장소로 옮깁니다. 원본을 확인하고 첨부파일의 해시를 검증한 후 복사하며 Blob 원본은 삭제하지 않습니다. 미처 옮기지 못한 글은 Blob을 읽는 기존 경로를 유지합니다.

`/admin/blog-import`는 기존 이관 도구이며 새 글 작성은 `/blog/write`를 사용합니다.

검증: `npm run build`, `node tools/test-native-blog.cjs`, `node tools/test-github-blog-store.cjs`, `npm run test:dependency-security`, `npm audit`.

프로젝트·일정·NOW 저장 API는 서명된 로그인 계정이 현재 `ADMIN_ID`와 일치할 때만 저장을 허용합니다. 회원·비로그인·유효하지 않은 세션은 HTTP 401로 거부하며 공개 조회는 계속 제공합니다. 빌드 후 `npm run test:content-access`로 세 콘텐츠의 권한, 저장·조회, 입력 검증과 수정 충돌을 가짜 GitHub API에서 검증할 수 있습니다.

`@vercel/oidc`가 사용하는 `@vercel/cli-config`를 `overrides`로 0.4.0에 지정합니다. 이전 0.3.1은 취약한 Zod 4.1.11을 내부 번들에도 포함하므로 외부 Zod 의존성만 바꾸는 것으로는 충분하지 않습니다. 0.4.0은 내부 Zod도 수정 버전으로 교체합니다(GHSA-mrhx-c7xc-m3w5). Vercel SDK가 수정된 설정 패키지를 직접 사용하게 되면 이 override를 제거할 수 있습니다. `test:dependency-security`는 내부 번들과 실제 하위 의존성의 입력 크기 제한, 패턴 확장 제한과 Vercel 설정 파싱 호환성을 검사합니다.

## Go 파일 공유 실습

`/files`에서 누구나 PNG, JPEG, PDF 파일을 업로드하면 24시간 유효한 공유 URL을 받습니다. 같은 Go API를 `curl`에서도 사용할 수 있습니다.

```bash
curl -F 'file=@example.png' https://www.cedrai.info/api/files
curl -L -o downloaded.png '응답_JSON의_url'
```

Go Vercel Function은 [`api/files.go`](api/files.go)에 있습니다. 업로드는 최대 3 MiB로 제한하고 파일명 경로, 확장자, MIME 선언과 내용을 검증합니다. PNG/JPEG는 전체 디코딩과 이미지 크기 제한도 적용합니다. 공개 다운로드는 `Content-Disposition: attachment`와 `X-Content-Type-Options: nosniff`를 사용합니다.

로컬 디스크 실습은 같은 핸들러를 [`cmd/file-share/main.go`](cmd/file-share/main.go)에서 실행합니다. Go 1.22 이상에서 다음처럼 시작하면 `127.0.0.1:8081`의 웹 화면과 API가 `.private_uploads/file-share/`에 암호화된 파일을 저장합니다. 디렉터리는 0700, 파일은 0600으로 생성하며 원본 이름은 저장 경로에 사용하지 않습니다.

```bash
export ADMIN_SESSION_SECRET="$(openssl rand -hex 32)"
export FILE_SHARE_STORAGE=local
export FILE_SHARE_DATA_DIR="$PWD/.private_uploads/file-share"
go run ./cmd/file-share

# 다른 터미널에서
curl -F 'file=@example.png' http://127.0.0.1:8081/api/files
```

VPS가 없어 파일은 서버 디스크에 저장하지 않습니다. 암호화된 파일을 이 저장소의 별도 `file-share-data` 브랜치에 GitHub Contents API로 저장합니다. 저장 파일명은 공개 공유 ID의 HMAC이므로 공개 저장소의 커밋을 보더라도 다운로드 URL을 알아낼 수 없습니다. 파일 내용과 원래 이름은 `ADMIN_SESSION_SECRET`에서 파생한 키로 AES-GCM 암호화합니다. **이 비밀키를 바꾸면 기존 공유 파일을 읽을 수 없습니다.**

배포 전 `file-share-data` 브랜치를 GitHub에 한 번 만들고, Vercel Production 환경에 기존 `ADMIN_SESSION_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO`와 `CRON_SECRET`이 설정되어 있는지 확인합니다. `vercel.json`은 데이터 브랜치의 커밋이 Vercel 배포를 유발하지 않도록 설정합니다. `FILE_SHARE_PUBLIC_BASE_URL`은 기본값 `https://www.cedrai.info`를 사용하며 다른 도메인이라면 변경합니다.

새 공유 링크는 발급 24시간 뒤 Go 서버가 다운로드를 거부합니다. Vercel Cron이 하루 한 번 `/api/files?cleanup=1`을 호출해 만료된 파일을 데이터 브랜치의 현재 상태에서 제거합니다. Hobby 플랜의 정리 시각은 정확히 보장되지 않으므로, **접근 만료와 정리 시각은 다를 수 있습니다.** GitHub의 이전 커밋에는 암호문이 남으므로 이를 완전한 삭제로 간주하지 않습니다. 이전 버전에서 생성한 링크는 만료 정보가 없어 계속 접근 가능합니다.

포트폴리오와 Go 함수를 함께 로컬에서 확인할 때는 `vercel dev`로 실행합니다. `next dev`만으로는 루트 `api/`의 Go 함수를 제공하지 않습니다. 테스트는 `go test -race ./api ./cmd/file-share`, 전체 빌드는 `vercel build --yes --target preview`입니다. 구현 과정과 Go 개념 정리는 [`docs/go-file-share.md`](docs/go-file-share.md)에 있습니다.

현재는 외부 실습을 위해 누구나 업로드할 수 있습니다. 공유 URL을 아는 사람은 만료 전까지 누구나 다운로드할 수 있습니다. PDF 내부 악성코드 검사와 저장 용량 총량 관리가 없는 학습용 서비스입니다. GitHub 커밋 저장은 소량의 파일에만 적합합니다. 구현을 보강할 때는 [Golang 파일 업로드 구현 사례](https://tls456.github.io/posts/Golang-File-Uploader/)의 검증 순서와 만료·삭제 구분을 참고했습니다.

## 관리자 로그인

`.env.example`을 `.env.local`로 복사하고 값을 채웁니다:

```bash
ADMIN_ID=아이디
ADMIN_PASSWORD=비밀번호
ADMIN_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

`.env.local`은 git에 올라가지 않습니다. Vercel에 배포할 때는 `.env.example`의
항목들을 Settings → Environment Variables 에 등록해야 로그인·편집이 동작합니다.

비밀번호 검증은 서버(`app/api/login/route.ts`)에서만 이뤄지고, 브라우저에는
서명된 httpOnly 쿠키만 내려갑니다 — 번들에 비밀번호가 들어가지 않아요.

## 프로젝트 편집 (관리자)

로그인하면 `/projects`에 `+ ADD` / `EDIT` / `✕` 버튼이 생깁니다. 저장하면 서버가
GitHub API로 `data/projects.json`을 커밋하고, Vercel이 자동 재배포하면서 반영됩니다.

동작하려면 GitHub 토큰이 필요해요:

1. github.com/settings/personal-access-tokens → **Fine-grained token** 생성
2. Repository access → `Cedrai05/cedrai-portfolio` 만 선택
3. Permissions → Repository permissions → **Contents: Read and write**
4. 발급된 토큰을 `.env.local`의 `GITHUB_TOKEN=` 에 붙여넣기 (Vercel에도 동일하게 등록)

저장 시 파일의 `sha`를 같이 보내기 때문에, 다른 곳에서 먼저 수정된 경우
덮어쓰지 않고 "새로고침 후 다시 저장해주세요"로 막습니다.

### 스탯 수정
`components/Hero.tsx`의 `STATS` 배열 수정.
