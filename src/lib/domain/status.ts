import type { OrderStatus, Role, SettlementStatus, InquiryStatus } from "./types";

/* ------------------------------------------------------------------ */
/* 주문 상태 정의                                                       */
/* ------------------------------------------------------------------ */

export interface StatusMeta {
  value: OrderStatus;
  label: string;
  /** 진행 단계 순서 (CANCELED는 -1) */
  step: number;
  /** Badge 색상 클래스 */
  className: string;
  /** 점(dot) 색상 클래스 */
  dotClassName: string;
  description: string;
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  RECEIVED: {
    value: "RECEIVED",
    label: "접수완료",
    step: 0,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    dotClassName: "bg-slate-400",
    description: "주문이 접수되었습니다. 담당 실행사 배정을 준비 중입니다.",
  },
  ASSIGNED: {
    value: "ASSIGNED",
    label: "실행사 배정",
    step: 1,
    className: "bg-violet-50 text-violet-700 ring-violet-200",
    dotClassName: "bg-violet-500",
    description: "작업을 수행할 실행사가 배정되었습니다.",
  },
  IN_PROGRESS: {
    value: "IN_PROGRESS",
    label: "작업중",
    step: 2,
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClassName: "bg-amber-500",
    description: "실행사가 작업을 진행하고 있습니다.",
  },
  IN_REVIEW: {
    value: "IN_REVIEW",
    label: "검수중",
    step: 3,
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    dotClassName: "bg-sky-500",
    description: "제출된 작업 결과를 관리자가 검수하고 있습니다.",
  },
  COMPLETED: {
    value: "COMPLETED",
    label: "작업완료",
    step: 4,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClassName: "bg-emerald-500",
    description: "모든 작업이 완료되었습니다. 결과를 확인해 주세요.",
  },
  CANCELED: {
    value: "CANCELED",
    label: "주문취소",
    step: -1,
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    dotClassName: "bg-rose-500",
    description: "취소된 주문입니다.",
  },
};

/** 진행 단계 UI(Stepper)에 표시할 순서 */
export const ORDER_FLOW: OrderStatus[] = [
  "RECEIVED",
  "ASSIGNED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
];

/** 필터 탭에서 사용하는 상태 목록 */
export const ORDER_FILTER_STATUSES: OrderStatus[] = ORDER_FLOW;

export function statusMeta(status: OrderStatus): StatusMeta {
  return ORDER_STATUS_META[status];
}

export function statusLabel(status: OrderStatus): string {
  return ORDER_STATUS_META[status].label;
}

/* ------------------------------------------------------------------ */
/* 상태 전이 규칙                                                       */
/* ------------------------------------------------------------------ */

/**
 * "누가(role) 어떤 상태에서 어떤 상태로 보낼 수 있는가"를 한 곳에서 관리한다.
 * 향후 서버 도입 시 이 테이블을 그대로 백엔드 권한 검증으로 옮길 수 있다.
 */
export const STATUS_TRANSITIONS: Array<{
  from: OrderStatus;
  to: OrderStatus;
  by: Role;
  action: string;
}> = [
  { from: "RECEIVED", to: "ASSIGNED", by: "ADMIN", action: "실행사 배정" },
  { from: "ASSIGNED", to: "IN_PROGRESS", by: "PARTNER", action: "작업 시작" },
  { from: "IN_PROGRESS", to: "IN_REVIEW", by: "PARTNER", action: "작업 완료 요청" },
  { from: "IN_REVIEW", to: "COMPLETED", by: "ADMIN", action: "검수 승인" },
  { from: "IN_REVIEW", to: "IN_PROGRESS", by: "ADMIN", action: "수정 요청" },
  { from: "RECEIVED", to: "CANCELED", by: "ADMIN", action: "주문 취소" },
];

export function canTransition(from: OrderStatus, to: OrderStatus, by: Role): boolean {
  return STATUS_TRANSITIONS.some((t) => t.from === from && t.to === to && t.by === by);
}

/* ------------------------------------------------------------------ */
/* 정산 / 문의 상태                                                     */
/* ------------------------------------------------------------------ */

export const SETTLEMENT_STATUS_META: Record<
  SettlementStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "정산대기", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  SCHEDULED: { label: "정산예정", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  PAID: { label: "정산완료", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export const INQUIRY_STATUS_META: Record<
  InquiryStatus,
  { label: string; className: string }
> = {
  OPEN: { label: "답변대기", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  ANSWERED: { label: "답변완료", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export const INQUIRY_CATEGORY_LABEL: Record<string, string> = {
  ORDER: "주문/작업",
  PAYMENT: "결제/포인트",
  SERVICE: "서비스 문의",
  ETC: "기타",
};
