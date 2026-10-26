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
티스토리 카테고리 목록(`app/api/blog/route.ts`)을 읽어옵니다.

- **대분류를 기준으로 자동 분류** — 티스토리에서 카테고리를 추가·삭제·이름변경하면
  코드 수정 없이 그대로 반영됩니다.
- **보호글도 표시**됩니다 (제목 + 🔒 표시). 목록에 제목은 공개되기 때문이에요.
- **비공개글은 표시할 수 없습니다.** 서버가 403을 돌려주기 때문에 어떤 방법으로도
  가져올 수 없어요. 보이게 하려면 티스토리에서 *비공개 → 보호* 로 바꿔야 합니다.
- 반영 주기는 `BLOG_REVALIDATE`(초). `0`으로 두면 매 요청마다 새로 읽습니다.
- 스크레이핑이 실패하면 자동으로 RSS로 넘어갑니다(이 경우 보호글은 빠집니다).

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
