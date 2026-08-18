/**
 * 광개토 Viral 도메인 타입
 * - 프로토타입 단계에서는 Mock Store가 이 타입을 그대로 사용한다.
 * - 향후 DB/API 도입 시 이 타입을 그대로 서버 스키마로 옮길 수 있도록 설계한다.
 */

/* ------------------------------------------------------------------ */
/* 사용자 / 권한                                                        */
/* ------------------------------------------------------------------ */

export type Role = "CUSTOMER" | "PARTNER" | "ADMIN";

/** 데모 로그인 계정 (향후 실제 인증으로 교체) */
export interface Account {
  id: string;
  role: Role;
  /** 담당자 이름 */
  name: string;
  /** 소속 (광고주 회사명 / 실행사명 / 플랫폼) */
  org: string;
  email: string;
  /** 로그인 화면 설명 문구 */
  description: string;
  /** 연결된 광고주 ID (role=CUSTOMER) */
  customerId?: string;
  /** 연결된 실행사 ID (role=PARTNER) */
  partnerId?: string;
}

/* ------------------------------------------------------------------ */
/* 카테고리 / 상품                                                      */
/* ------------------------------------------------------------------ */

export interface Category {
  id: string;
  name: string;
  /** URL/필터용 슬러그 */
  slug: string;
  /** 짧은 설명 (주문 화면 카테고리 안내) */
  description: string;
  /** 노출 순서 (오름차순) */
  sortOrder: number;
  active: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  /** 판매가 (원/건) */
  price: number;
  /** 실행원가 (원/건) — 관리자 전용 */
  cost: number;
  minQty: number;
  maxQty: number;
  /** 수량 단위 표기 — "건", "개" 등 */
  unitLabel: string;
  /** 기본 실행사 ID (관리자 배정 시 우선 추천) */
  defaultPartnerId?: string;
  /** 예상 작업 소요일 — 배정 시 작업기한 기본값 계산에 사용 */
  leadDays: number;
  /** 광고주 주문 화면 노출 여부 */
  visible: boolean;
  /** 추천 상품 여부 */
  recommended: boolean;
  /** 작업 URL 입력 필요 여부 */
  requiresUrl: boolean;
  /** 파일 첨부 허용 여부 */
  allowsFile: boolean;
  /** 주문 폼 안내 문구 (URL 입력 힌트 등) */
  urlPlaceholder?: string;
  /** 상품 상세 안내 (주문 화면 우측 안내 박스) */
  guide?: string[];
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* 광고주 / 실행사                                                      */
/* ------------------------------------------------------------------ */

export interface Customer {
  id: string;
  /** 회사명 */
  company: string;
  /** 담당자 */
  manager: string;
  phone: string;
  email: string;
  /** 사업자등록번호 */
  bizNo: string;
  /** 보유 포인트 */
  point: number;
  /** 등급 (향후 등급별 단가 확장 지점) */
  grade: "BASIC" | "PRO" | "VIP";
  active: boolean;
  createdAt: string;
}

/** 실행사가 특정 상품을 수행할 때의 매입단가 */
export interface PartnerUnitCost {
  productId: string;
  cost: number;
}

export interface Partner {
  id: string;
  name: string;
  manager: string;
  phone: string;
  email: string;
  /** 대응 가능한 카테고리 */
  categoryIds: string[];
  /** 서비스(상품)별 매입단가 — 없으면 상품의 기본 cost 사용 */
  unitCosts: PartnerUnitCost[];
  /** 전문분야 요약 문구 */
  specialty: string;
  active: boolean;
  createdAt: string;
  memo?: string;
}

/* ------------------------------------------------------------------ */
/* 주문                                                                 */
/* ------------------------------------------------------------------ */

export type OrderStatus =
  | "RECEIVED" // 접수완료
  | "ASSIGNED" // 실행사 배정
  | "IN_PROGRESS" // 작업중
  | "IN_REVIEW" // 검수중
  | "COMPLETED" // 작업완료
  | "CANCELED"; // 주문취소 (향후 확장)

/** 첨부파일 — 프로토타입에서는 실제 업로드 없이 메타데이터만 저장 */
export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
}

/** 실행사가 등록하는 작업 결과 */
export interface OrderResult {
  doneQty: number;
  resultUrls: string[];
  files: AttachedFile[];
  memo: string;
  submittedAt: string;
}

/** 주문 상태 변경 이력 */
export interface OrderHistoryEntry {
  status: OrderStatus;
  at: string;
  /** 변경 주체 */
  by: Role;
  /** 표시용 라벨 (예: "관리자 승인", "A미디어웍스 배정") */
  note?: string;
}

export interface Order {
  /** 주문번호 = PK. 예: GKT-260813-001 */
  orderNo: string;
  customerId: string;
  productId: string;
  /** 주문 시점의 상품명 스냅샷 (상품 수정에 영향받지 않도록) */
  productName: string;
  categoryId: string;
  qty: number;
  /** 주문 시점 판매 단가 */
  unitPrice: number;
  /** 총 주문금액 = qty * unitPrice */
  amount: number;
  targetUrl: string;
  requestNote: string;
  files: AttachedFile[];
  status: OrderStatus;

  /** 배정 정보 */
  partnerId?: string;
  /** 실행사 매입단가 스냅샷 */
  unitCost?: number;
  assignedAt?: string;
  /** 작업기한 */
  dueDate?: string;

  createdAt: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;

  result?: OrderResult;
  /** 관리자 수정요청 메모 */
  reviewNote?: string;
  history: OrderHistoryEntry[];
}

/* ------------------------------------------------------------------ */
/* 포인트                                                               */
/* ------------------------------------------------------------------ */

export type PointTxType = "CHARGE" | "USE" | "REFUND";

export interface PointTx {
  id: string;
  customerId: string;
  type: PointTxType;
  /** 내용 */
  title: string;
  /** 증감액 (양수: 충전/환불, 음수: 사용) */
  amount: number;
  /** 거래 후 잔액 */
  balance: number;
  orderNo?: string;
  /** 결제수단 (충전 시) */
  method?: "CARD" | "TRANSFER";
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* 정산                                                                 */
/* ------------------------------------------------------------------ */

export type SettlementStatus = "PENDING" | "SCHEDULED" | "PAID";

export interface Settlement {
  id: string;
  orderNo: string;
  partnerId: string;
  qty: number;
  unitCost: number;
  amount: number;
  completedAt: string;
  status: SettlementStatus;
  /** 정산 예정일 */
  scheduledAt?: string;
  paidAt?: string;
}

/* ------------------------------------------------------------------ */
/* 문의                                                                 */
/* ------------------------------------------------------------------ */

export type InquiryStatus = "OPEN" | "ANSWERED";
export type InquiryCategory = "ORDER" | "PAYMENT" | "SERVICE" | "ETC";

export interface Inquiry {
  id: string;
  customerId: string;
  category: InquiryCategory;
  title: string;
  content: string;
  orderNo?: string;
  status: InquiryStatus;
  createdAt: string;
  answer?: string;
  answeredAt?: string;
}

/* ------------------------------------------------------------------ */
/* 스토어 전체 형태                                                     */
/* ------------------------------------------------------------------ */

export interface AppData {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  partners: Partner[];
  orders: Order[];
  pointTxs: PointTx[];
  settlements: Settlement[];
  inquiries: Inquiry[];
}
