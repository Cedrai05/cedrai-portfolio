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

글 목록은 `data/blog-catalog.json`에 있습니다. 블로그 메인은 `/blog`이며 공개글 본문과 첨부파일은 이 저장소의 `public/blog-content/`에 저장합니다. GitHub Pages나 티스토리를 거치지 않고 읽습니다. 검색·주제 필터·목록 위치 복원과 글별 비밀번호 열람을 지원하며, 기존 포트폴리오 로그인과 테마를 함께 사용합니다.

보호글 77개는 원래의 글별 비밀번호를 유지합니다. 본문·첨부파일·PBKDF2 검증값은 Vercel의 비공개 Blob 저장소 `blog-native/v1/`에만 보관합니다. `/api/native-blog/unlock`이 비밀번호를 확인하고, 한 시간 동안 해당 글의 첨부파일만 읽을 수 있는 권한을 발급합니다. 비공개 글은 공개 목록과 열람 API에서 제외합니다.

`/admin/blog-import`는 기존 관리자 로그인으로 실행하는 이관 도구입니다. 글쓰기·수정 화면은 추후 구현합니다. 업로드 중 끊기면 같은 탭에서 다시 선택해 완료된 파일을 건너뛸 수 있습니다.

검증: `npm run build`, `node tools/test-native-blog.cjs`.

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
