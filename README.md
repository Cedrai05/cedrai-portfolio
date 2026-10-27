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

글 목록은 `data/blog-catalog.json`에 있습니다. 블로그 메인은 `/blog`이며 공개글 본문과 첨부파일은 이 저장소의 `public/blog-content/`에 저장합니다. GitHub Pages나 티스토리를 거치지 않고 읽습니다. 검색·주제 필터·목록 위치 복원과 계정 로그인으로 비밀글 열람을 지원하며, 기존 포트폴리오 로그인과 테마를 함께 사용합니다.

기존 보호글과 Major/자료구조 글을 포함한 비밀글은 관리자 또는 seKUrity 계정으로 로그인해야 읽을 수 있습니다. 글별 비밀번호와 열람 토큰은 사용하지 않으며, 본문과 첨부파일 요청마다 서버에서 계정을 검사합니다. 블로그/기술문서의 `Major` 주제에서 티스토리 `Major/자료구조`에 있던 글 7개를 찾을 수 있습니다. 이 글들도 계정 로그인 후 열람합니다.

관리자로 로그인하면 `/blog`에 **글 작성** 버튼이 보입니다. `/blog/write`에서 제목·카테고리·주제·태그와 Markdown 본문을 작성하고, 이미지·첨부파일을 추가할 수 있습니다. **비밀글**을 체크하면 관리자와 seKUrity 계정만 읽을 수 있고, 체크하지 않으면 누구나 읽을 수 있습니다. 미리보기와 임시 저장도 지원합니다. 임시 저장한 글은 공개 목록에 나오지 않습니다.

새 글은 비공개 Blob의 `blog-native/v2/`에 저장하고 공개 여부에 따라 서버가 본문을 전달합니다. 글마다 별도 목록 레코드를 사용해 동시에 업로드한 글이 덮어써지지 않으며, 업로드 직후 목록에 반영됩니다. 기존 공개글은 `public/blog-content/`의 정적 파일로 계속 제공합니다. 개발 환경에서는 `.private_uploads/native-blog/`를 사용하며 Git에는 포함하지 않습니다.

`/admin/blog-import`는 기존 이관 도구이며 새 글 작성은 `/blog/write`를 사용합니다.

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
