# 광개토 Viral

B2B 바이럴 마케팅 주문 플랫폼 프로토타입.

광고주가 유튜브·인스타그램·블로그·카페·플레이스·언론보도 등의 바이럴 서비스를 온라인에서 주문하면,
운영자가 실행사에 배정하고, 실행사가 작업 결과를 등록하면, 검수를 거쳐 광고주가 결과를 확인하는
전체 흐름을 하나의 화면 세트로 구현했습니다.

```
광고주 주문 → 플랫폼 접수 → 실행사 배정 → 실행사 작업 → 결과 등록 → 관리자 검수 → 광고주 결과 확인
```

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 프로덕션 빌드
npm run lint
```

## 두 가지 UI

광고주와 운영자는 성격이 다른 화면을 씁니다.

- **서비스몰 (루트 `/`)** — 일반 소비자·소상공인이 설명 없이 쓸 수 있는 쇼핑몰형 UI.
  상단 네비게이션, 아이콘형 카테고리, 상품 카드, 단계형 주문 화면.
  **로그인 없이 둘러볼 수 있고**, 주문·주문내역·포인트·내 정보만 로그인을 요구합니다.
- **실행사(PARTNER)·관리자(ADMIN)** — 사이드바 기반 **운영 대시보드 UI**. 원가·마진·정산 등 내부 정보를 다룹니다.

### 공개 / 로그인 필요

| 구분 | 경로 |
| --- | --- |
| 누구나 | `/` `/services` `/order/[productId]`(상품 정보) `/guide` `/support`(고객센터 안내) `/login` `/register` |
| 광고주 로그인 필요 | 주문 진행, `/orders` `/orders/[orderNo]` `/points` `/profile`, 문의 등록 |
| 운영자 로그인 필요 | `/admin/*` `/partner/*` |

보호 페이지에 바로 접근하면 `/login?redirect=<원래경로>`로 이동하고, 로그인 후 그 화면으로 되돌아갑니다.
비로그인 상태에서 상품의 **주문하기**를 누르면 로그인 안내 모달이 뜨고, 로그인 후 해당 상품 주문 화면으로 이동합니다.

## 데모 계정

서비스몰은 로그인 없이 바로 열립니다. 주문까지 해보려면 `/login`에서 그대로 **로그인** 버튼을 누르면 광고주로 접속합니다.
운영자 화면은 로그인 화면 하단의 `DEMO · 운영자 화면으로 접속`, 또는 접속 후 우측 상단 메뉴에서 전환합니다.

| 역할 | 계정 | 하는 일 |
| --- | --- | --- |
| 광고주 (CUSTOMER) | 김지훈 / (주)그린푸드컴퍼니 | 서비스 주문, 진행 상황·결과 확인, 포인트 충전, 문의 |
| 실행사 (PARTNER) | 박서연 / A미디어웍스 | 배정 작업 확인, 작업 시작, 결과 등록, 정산 확인 |
| 관리자 (ADMIN) | 이도현 / 운영팀 | 실행사 배정, 검수 승인, 상품·회원·정산·문의 관리 |

### 광고주에게 노출하지 않는 정보

실행사명, 실행원가·매입단가, 마진, 정산 내역, 내부 상태(실행사 배정·검수중)는 광고주 화면에
표시하지 않습니다. 내부 주문 상태는 `lib/domain/customer-status.ts`에서
**주문접수 → 작업준비 → 작업진행 → 작업완료** 4단계로 변환해 보여줍니다.

## 데이터

1차 프로토타입은 **서버 없이 브라우저 localStorage에만** 데이터를 저장합니다.
(실제 PG 결제, 소셜 로그인, 외부 API 연동은 포함하지 않습니다.)

- 최초 진입 시 `src/lib/mock/seed.ts`의 데모 데이터가 생성됩니다. 날짜는 "오늘" 기준 상대값이라
  언제 초기화해도 진행중 주문의 D-day가 자연스럽게 보입니다.
- 사이드바 하단 또는 관리자 → 설정에서 **데모 데이터 초기화**가 가능합니다.

## 구조

```
src/
  app/
    (shop)/              서비스몰 — URL에는 나타나지 않는 라우트 그룹
      layout.tsx           ShopShell (로그인 가드 없음)
      page.tsx             /          홈 (검색 + 카테고리 + 추천 서비스)
      services/            /services  서비스 목록 (?category= / ?q=)
      order/[productId]/   /order/... 상품 정보 + 단계형 주문
      orders/              /orders    주문내역 · 주문 상세   (로그인 필요)
      points/ profile/     /points /profile                 (로그인 필요)
      support/ guide/      /support /guide
    partner/             실행사 화면 (대시보드·작업관리·정산·내정보)
    admin/               관리자 화면 (대시보드·주문/검수·상품/카테고리·회원·정산·문의·설정)
    login/               로그인 (?redirect=) + DEMO 역할 전환
    register/            회원가입
  components/
    auth/                RequireCustomer(페이지 가드) · LoginRequiredDialog(주문 시 로그인 안내)
    layout/              ShopShell(서비스몰 상단 네비) · AppShell(운영자 사이드바) · Logo
    customer/            서비스몰 전용 UI (카테고리 그리드, 상품 카드, 주문 단계, 상태 뱃지)
    common/              PageHeader, StatCard, FilterTabs, FormDialog 등 공통 UI
    order/               주문 도메인 UI (진행 스테퍼, 배정/검수/결과 등록)
    ui/                  shadcn/ui 프리미티브
  config/
    brand.ts             브랜드 값
    nav.ts               NAV(운영자 사이드바) · SHOP_NAV(광고주 상단 메뉴)
    category-icons.ts    카테고리 슬러그 → 아이콘 매핑
  lib/
    domain/              타입, 내부 상태·전이 규칙, 광고주용 단계 변환, selector
    mock/                데모 계정 및 시드 데이터
    store/               세션·데이터 스토어 (localStorage)
```

### 설계 메모

- **도메인 타입(`lib/domain/types.ts`)** 은 그대로 서버 스키마로 옮길 수 있도록 설계했습니다.
- **상태 전이 규칙(`lib/domain/status.ts`)** 은 "누가 어떤 상태로 보낼 수 있는가"를 한 곳에 모아둬,
  이후 백엔드 권한 검증으로 그대로 이관할 수 있습니다. (관리자 → 설정 화면에서 표로 확인 가능)
- **광고주용 표현(`lib/domain/customer-status.ts`)** 은 내부 상태를 건드리지 않고 표시만 단순화합니다.
  주문 이력도 내부 문구(예: "OO미디어웍스 배정") 대신 타임스탬프만으로 다시 구성해 노출합니다.
- **브랜드 값(`config/brand.ts`)** 만 바꾸면 서비스명·주문번호 접두사·고객센터 정보가 전체에 반영됩니다.
- **로그인 가드는 레이아웃이 아니라 페이지 단위**입니다. 서비스몰 레이아웃은 누구에게나 열려 있고,
  개인 데이터를 다루는 페이지만 `RequireCustomer`로 감쌉니다.
- 세션·데이터 스토어는 **하이드레이션이 끝나기 전까지** 서버와 동일한 값(로그아웃 상태 + 시드 카탈로그)을
  노출합니다. 덕분에 비로그인 서비스몰이 서버 HTML에 그대로 담기고 하이드레이션 불일치도 없습니다.
- 각 라우트는 `page.tsx`(서버 컴포넌트, metadata 전용) + `*-view.tsx`(클라이언트 컴포넌트) 로 나눕니다.
- React Compiler가 켜져 있어 `useMemo`/`useCallback` 수동 메모이제이션은 사용하지 않습니다.
  같은 이유로 렌더 중 함수 호출로 아이콘 컴포넌트를 만들지 않고 맵을 직접 조회합니다.

## AI 블로그 콘텐츠 제작 (Claude API)

`/ai-blog` 의 원고 생성·수정은 Anthropic Claude 를 사용합니다.
호출 경로는 **브라우저 → 우리 서버 라우트 → Anthropic API** 이며, API Key 는 서버에서만 읽습니다.

| 라우트 | 역할 |
|---|---|
| `POST /api/ai-blog/generate` | 입력값으로 원고 생성 |
| `POST /api/ai-blog/revise` | 현재 원고를 요청에 맞게 수정 |

### 환경변수

로컬은 `.env.example` 을 `.env.local` 로 복사해 채웁니다. (`.env*` 는 커밋되지 않습니다)

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | provider=claude 일 때 필수 | — | 서버 전용. `NEXT_PUBLIC_` 접두사 금지 |
| `AI_BLOG_PROVIDER` | | `claude` | `claude` \| `mock` |
| `ANTHROPIC_MODEL` | | `claude-sonnet-5` | 사용할 모델 |
| `AI_BLOG_EFFORT` | | (미설정) | `low`\|`medium`\|`high`\|`xhigh`\|`max` — 응답이 느리면 낮춘다 |
| `AI_BLOG_RATE_LIMIT_PER_MINUTE` | | `10` | 계정당 분당 호출 수 |

`AI_BLOG_PROVIDER=claude` 인데 키가 없으면 **조용히 Mock 으로 넘어가지 않고** 설정 오류를 돌려줍니다.
오프라인 개발이나 장애 대응 시에는 `AI_BLOG_PROVIDER=mock` 을 명시하세요.

Vercel 에서는 Project → Settings → Environment Variables 에 같은 이름으로 등록합니다.

### 교체 지점

- 실제 구현: `lib/ai-blog/server/claude-service.ts`
- Mock 구현: `lib/ai-blog/mock-service.ts` (삭제하지 않고 유지)
- 선택 로직: `lib/ai-blog/server/resolve-service.ts`
- 호출 자격·사용량 제한: `lib/ai-blog/server/guard.ts` (실제 인증 도입 시 이 파일만 교체)
- 이미지 생성은 아직 Mock 입니다 (`lib/ai-blog/mock-images.ts`).

## 다음 단계

- 서버/DB 연동 및 실제 인증 (AI 라우트의 `requireCustomer` 교체 포함)
- 참고자료 URL 본문 추출 (현재는 주소만 저장)
- 이미지 생성 API 연동
- PG 결제 연동 (포인트 충전)
- 일부 상품의 외부 API·자동화 연동
- 알림(이메일/카카오) 발송
