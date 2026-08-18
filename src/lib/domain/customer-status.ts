import type { Order, OrderStatus } from "./types";

/**
 * 광고주(CUSTOMER)에게 보여줄 단순화된 진행 단계.
 *
 * 내부 운영 상태(OrderStatus)는 그대로 유지하고, 화면 표시에만 이 단계를 사용한다.
 * - 실행사 배정/검수 같은 내부 절차는 광고주에게 노출하지 않는다.
 */
export type CustomerStage = "ORDERED" | "PREPARING" | "WORKING" | "DONE" | "CANCELED";

export interface CustomerStageMeta {
  key: CustomerStage;
  label: string;
  /** 진행 순서 (취소는 -1) */
  step: number;
  className: string;
  dotClassName: string;
  description: string;
}

export const CUSTOMER_STAGE_META: Record<CustomerStage, CustomerStageMeta> = {
  ORDERED: {
    key: "ORDERED",
    label: "주문접수",
    step: 0,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    dotClassName: "bg-slate-400",
    description: "주문이 접수되었습니다. 담당자가 작업을 준비하고 있습니다.",
  },
  PREPARING: {
    key: "PREPARING",
    label: "작업준비",
    step: 1,
    className: "bg-violet-50 text-violet-700 ring-violet-200",
    dotClassName: "bg-violet-500",
    description: "작업 담당자가 배정되었습니다. 곧 작업이 시작됩니다.",
  },
  WORKING: {
    key: "WORKING",
    label: "작업진행",
    step: 2,
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClassName: "bg-amber-500",
    description: "작업이 진행 중입니다. 완료되면 결과를 확인하실 수 있습니다.",
  },
  DONE: {
    key: "DONE",
    label: "작업완료",
    step: 3,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClassName: "bg-emerald-500",
    description: "모든 작업이 완료되었습니다. 작업 결과를 확인해 주세요.",
  },
  CANCELED: {
    key: "CANCELED",
    label: "주문취소",
    step: -1,
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    dotClassName: "bg-rose-500",
    description: "취소된 주문입니다. 결제 포인트는 환불되었습니다.",
  },
};

/** 광고주 화면 진행바에 표시할 순서 */
export const CUSTOMER_FLOW: CustomerStage[] = ["ORDERED", "PREPARING", "WORKING", "DONE"];

/** 필터 탭에서 사용하는 단계 목록 */
export const CUSTOMER_FILTER_STAGES: CustomerStage[] = CUSTOMER_FLOW;

const STATUS_TO_STAGE: Record<OrderStatus, CustomerStage> = {
  RECEIVED: "ORDERED",
  ASSIGNED: "PREPARING",
  IN_PROGRESS: "WORKING",
  // 검수는 내부 절차이므로 광고주에게는 여전히 "작업진행"으로 보인다
  IN_REVIEW: "WORKING",
  COMPLETED: "DONE",
  CANCELED: "CANCELED",
};

export function customerStage(status: OrderStatus): CustomerStage {
  return STATUS_TO_STAGE[status];
}

export function customerStageMeta(status: OrderStatus): CustomerStageMeta {
  return CUSTOMER_STAGE_META[customerStage(status)];
}

export function customerStageLabel(status: OrderStatus): string {
  return customerStageMeta(status).label;
}

/**
 * 광고주에게 보여줄 진행 이력.
 *
 * order.history에는 "OO미디어웍스 배정" 같은 내부 문구가 들어 있으므로 그대로 쓰지 않고,
 * 주문의 타임스탬프만으로 안전한 이력을 다시 만든다.
 */
export interface CustomerTimelineEntry {
  stage: CustomerStage;
  label: string;
  at: string | null;
  note: string;
}

export function customerTimeline(order: Order): CustomerTimelineEntry[] {
  if (order.status === "CANCELED") {
    const canceledAt = order.history.find((h) => h.status === "CANCELED")?.at ?? null;
    return [
      {
        stage: "ORDERED",
        label: "주문접수",
        at: order.createdAt,
        note: "주문이 접수되었습니다.",
      },
      {
        stage: "CANCELED",
        label: "주문취소",
        at: canceledAt,
        note: "주문이 취소되고 포인트가 환불되었습니다.",
      },
    ];
  }

  return [
    {
      stage: "ORDERED",
      label: "주문접수",
      at: order.createdAt,
      note: "주문이 접수되었습니다.",
    },
    {
      stage: "PREPARING",
      label: "작업준비",
      at: order.assignedAt ?? null,
      note: "작업 담당자가 배정되었습니다.",
    },
    {
      stage: "WORKING",
      label: "작업진행",
      at: order.startedAt ?? null,
      note: "작업이 시작되었습니다.",
    },
    {
      stage: "DONE",
      label: "작업완료",
      at: order.completedAt ?? null,
      note: "작업이 완료되었습니다.",
    },
  ];
}
