/**
 * 브랜드 설정 — 서비스명/로고/주문번호 접두사 등 브랜드 관련 값은 전부 이 파일에서만 정의한다.
 * 향후 브랜드명이 변경되면 이 파일과 components/layout/logo.tsx 두 곳만 수정하면 된다.
 */
export const BRAND = {
  /** 서비스 전체 명칭 */
  name: "광개토 Viral",
  /** 좁은 영역(모바일 헤더 등)에서 사용하는 축약 명칭 */
  shortName: "광개토",
  /** 로고 심볼에 들어가는 텍스트 (이미지 로고로 교체 가능) */
  symbol: "GK",
  /** 서비스 한 줄 소개 */
  tagline: "B2B 바이럴 마케팅 주문 플랫폼",
  /** 주문번호 접두사 — 예: GKT-260813-001 */
  orderPrefix: "GKT",
  /** 고객센터 정보 */
  support: {
    email: "help@gwanggaeto.io",
    phone: "1600-0000",
    hours: "평일 10:00 ~ 18:00 (점심 13:00 ~ 14:00)",
  },
  /** 포인트 단위 — 1원 = 1P */
  point: {
    unit: "P",
    /** 1원당 포인트 비율 */
    ratio: 1,
  },
} as const;
