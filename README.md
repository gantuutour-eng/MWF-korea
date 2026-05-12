# MWA Korea — БНСУ дахь салбар зөвлөл

Cloudflare 기반 풀스택 모바일 웹앱. **Astro + Cloudflare Pages + D1 + KV** 스택.

## 빠른 시작

```bash
npm install

# 1) Cloudflare 리소스 생성 (최초 1회)
npx wrangler login
npx wrangler d1 create mwa-korea-db
npx wrangler kv namespace create SESSIONS
# 위 명령어가 출력한 ID 두 개를 wrangler.toml의 REPLACE_WITH_... 자리에 채워넣기

# 2) 로컬 DB 초기화 + 시드
npm run db:local
npm run db:seed:local

# 3) 개발 서버
npm run dev
# → http://localhost:4321

# 4) 프로덕션 빌드 + 로컬 미리보기 (D1/KV 바인딩 포함)
npm run build
npm run preview

# 5) 배포
npm run db:remote        # 프로덕션 D1에 스키마 적용 (최초 1회)
npm run db:seed:remote   # (선택) 시드 데이터
npm run deploy
```

## 페이지 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 홈 (Stitch 디자인 그대로) |
| `/news` · `/news/[id]` | 뉴스 목록·상세 (D1) |
| `/activities` | 활동 소개 |
| `/training` | 사업/세미나 (D1 events.type='training') |
| `/events` | 전체 이벤트 (D1) |
| `/membership` · `/membership/checkout` · `/membership/pending/[id]` | 회원권 플랜·결제·무통장 입금 안내 |
| `/advice` | 상담·지원 안내 |
| `/about` | 단체 소개 |
| `/profile` · `/profile/login` · `/profile/register` | 회원 영역 |
| `/chat` | 로그인한 회원이 관리자와 1:1 채팅 (3초 polling) |
| `/admin/chat` · `/admin/chat/[user_id]` | admin: 전체 대화 목록 + 개별 스레드 |

## API

- `GET  /api/news?limit=20&offset=0&category=notice|article`
- `GET  /api/news/:id`
- `POST /api/news` (admin) `{ title, subtitle?, body, image_url?, cover_url?, category? }`
- `GET  /api/events?type=...&when=upcoming|past|all`
- `GET  /api/events/:id`
- `GET  /api/portfolio/programs`
- `POST /api/portfolio/programs` (admin) `{ title, description, icon?, image_url?, tone?, since_label?, sort_order? }`
- `GET  /api/portfolio/stats`
- `POST /api/portfolio/stats` (admin) `{ value, label, tone?, sort_order? }`
- `POST /api/membership/order` `{ plan_id: '6m'|'1y', agreed: true }` → 무통장 입금 주문 생성, `reference` 반환
- `GET  /api/chat/messages` (after=, user_id= for admin) · `POST` `{ body, user_id? }`
- `GET  /api/chat/conversations` (admin)
- `POST /api/auth/register` `{ email, password, name, phone? }`
- `POST /api/auth/login` `{ email, password }`
- `POST /api/auth/logout`
- `GET  /api/auth/google?next=/path` — Google OAuth 시작 (redirect)
- `GET  /api/auth/google/callback` — Google에서 호출, 세션 발급 후 `next`로 redirect

Tone 값(포트폴리오): `orange | purple | rose | emerald | blue | amber`

세션은 KV(`SESSIONS`)에 7일 TTL로 저장. 비밀번호는 Web Crypto PBKDF2-SHA256 (10만 iter).

## Google OAuth 설정

1. [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)에서 **OAuth 2.0 Client ID** 생성 (Web application).
2. Authorized redirect URIs에 추가:
   - 로컬: `http://localhost:4321/api/auth/google/callback`
   - 프로덕션: `https://<your-domain>/api/auth/google/callback`
3. 로컬 dev: `.dev.vars.example`를 `.dev.vars`로 복사 후 client id/secret 입력. wrangler가 자동으로 로드.
4. 프로덕션: `npx wrangler pages secret put GOOGLE_OAUTH_CLIENT_ID` + `... GOOGLE_OAUTH_CLIENT_SECRET`.

스키마: `users.password_hash`는 NULL 허용(Google 전용 가입자), `users.google_id` UNIQUE로 연결 식별, `users.avatar_url`은 Google 프로필 사진. 동일 이메일로 비밀번호 가입과 Google 가입 둘 다 있는 경우 → 첫 Google 로그인 시 기존 계정에 `google_id` 자동 연결.

## 관리자 권한 부여

`POST /api/auth/register`로 가입한 사용자는 기본 `role='member'`. 관리자로 승격시키려면 D1에 직접 쿼리:

```bash
npx wrangler d1 execute mwa-korea-db --local --command \
  "UPDATE users SET role='admin' WHERE email='admin@example.com'"
```

승격된 사용자는 다음 채널 사용 가능:
- `POST /api/news`, `POST /api/portfolio/programs`, `POST /api/portfolio/stats` — 콘텐츠 작성
- `/admin/chat` — 회원과의 채팅 모두 열람·응답

## 디자인 토큰

`src/styles/global.css`의 Tailwind v4 `@theme` 블록.

| 토큰 | 값 |
| --- | --- |
| `--color-mwa-burgundy` | `#8b004b` |
| `--color-mwa-surface` | `#fff8f8` |
| `--font-sans` | Inter |
| `--radius-mwa-round` | `12px` |
| `--radius-mwa-banner` | `24px` |

폰트는 현재 Google Fonts CDN. 추후 `public/fonts/`로 셀프호스팅 권장(FOUT 제거).

## 홈 화면 아이콘 교체

`public/images/icons/` 폴더의 6개 SVG 파일은 플레이스홀더입니다. 같은 파일명(news.svg / activities.svg / training.svg / membership.svg / advice.svg / about.svg)으로 실제 일러스트(SVG·PNG)를 덮어쓰면 코드 변경 없이 즉시 반영됩니다. 정사각형(100×100 권장)에 여백을 넉넉히 둔 컬러풀한 아이콘이 권장.

## 아직 미구현

- 알림 종 아이콘 — UI만
- 이미지 업로드 (R2 연동)
- 관리자 UI (admin 권한은 API에서만 사용 가능)
- 다국어 UI 토글 (`src/lib/i18n.ts` 골격만 존재)
