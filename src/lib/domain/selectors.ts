import type {
  AppData,
  Category,
  Customer,
  Order,
  OrderStatus,
  Partner,
  Product,
  Role,
} from "@/lib/domain/types";

/* ------------------------------------------------------------------ */
/* 단건 조회                                                            */
/* ------------------------------------------------------------------ */

export function findProduct(data: AppData, id?: string): Product | undefined {
  return id ? data.products.find((p) => p.id === id) : undefined;
}

export function findCategory(data: AppData, id?: string): Category | undefined {
  return id ? data.categories.find((c) => c.id === id) : undefined;
}

export function findCustomer(data: AppData, id?: string): Customer | undefined {
  return id ? data.customers.find((c) => c.id === id) : undefined;
}

export function findPartner(data: AppData, id?: string): Partner | undefined {
  return id ? data.partners.find((p) => p.id === id) : undefined;
}

export function findOrder(data: AppData, orderNo?: string): Order | undefined {
  return orderNo ? data.orders.find((o) => o.orderNo === orderNo) : undefined;
}

/** 화면 표시용 이름 — 데이터가 삭제된 경우에도 안전하게 렌더링되도록 폴백을 둔다 */
export function customerName(data: AppData, id?: string): string {
  return findCustomer(data, id)?.company ?? "-";
}

export function partnerName(data: AppData, id?: string): string {
  return findPartner(data, id)?.name ?? "미배정";
}

export function categoryName(data: AppData, id?: string): string {
  return findCategory(data, id)?.name ?? "-";
}

/* ------------------------------------------------------------------ */
/* 목록 조회                                                            */
/* ------------------------------------------------------------------ */

/** 광고주 주문 목록 (최신순) */
export function customerOrders(data: AppData, customerId?: string): Order[] {
  if (!customerId) return [];
  return data.orders.filter((o) => o.customerId === customerId);
}

/** 실행사에 배정된 주문 목록 (최신순) */
export function partnerOrders(data: AppData, partnerId?: string): Order[] {
  if (!partnerId) return [];
  return data.orders.filter((o) => o.partnerId === partnerId);
}

/** 주문 화면에 노출할 상품 (노출 ON + 활성 카테고리) */
export function visibleProducts(data: AppData): Product[] {
  const activeCategoryIds = new Set(data.categories.filter((c) => c.active).map((c) => c.id));
  return data.products.filter((p) => p.visible && activeCategoryIds.has(p.categoryId));
}

/** 노출 순서로 정렬된 활성 카테고리 */
export function activeCategories(data: AppData): Category[] {
  return data.categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 해당 상품을 수행할 수 있는 실행사 (카테고리 대응 + 활성) */
export function eligiblePartners(data: AppData, productId?: string): Partner[] {
  const product = findProduct(data, productId);
  if (!product) return data.partners.filter((p) => p.active);
  return data.partners.filter((p) => p.active && p.categoryIds.includes(product.categoryId));
}

/** 실행사의 해당 상품 매입단가 (없으면 상품 기본 원가) */
export function resolveUnitCost(data: AppData, partnerId: string, productId: string): number {
  const partner = findPartner(data, partnerId);
  const product = findProduct(data, productId);
  return partner?.unitCosts.find((u) => u.productId === productId)?.cost ?? product?.cost ?? 0;
}

/* ------------------------------------------------------------------ */
/* 집계                                                                 */
/* ------------------------------------------------------------------ */

export interface OrderStats {
  total: number;
  amount: number;
  byStatus: Record<OrderStatus, number>;
  /** 진행중 = 접수완료 ~ 검수중 */
  active: number;
  completed: number;
}

export function orderStats(orders: Order[]): OrderStats {
  const byStatus: Record<OrderStatus, number> = {
    RECEIVED: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    COMPLETED: 0,
    CANCELED: 0,
  };
  let amount = 0;
  for (const order of orders) {
    byStatus[order.status] += 1;
    if (order.status !== "CANCELED") amount += order.amount;
  }
  return {
    total: orders.length,
    amount,
    byStatus,
    active: byStatus.RECEIVED + byStatus.ASSIGNED + byStatus.IN_PROGRESS + byStatus.IN_REVIEW,
    completed: byStatus.COMPLETED,
  };
}

/** 실행사 정산 예정/완료 금액 */
export function settlementTotals(data: AppData, partnerId?: string) {
  const rows = partnerId
    ? data.settlements.filter((s) => s.partnerId === partnerId)
    : data.settlements;
  const sum = (status: string) =>
    rows.filter((s) => s.status === status).reduce((acc, s) => acc + s.amount, 0);
  return {
    rows,
    pending: sum("PENDING"),
    scheduled: sum("SCHEDULED"),
    paid: sum("PAID"),
    total: rows.reduce((acc, s) => acc + s.amount, 0),
  };
}

/* ------------------------------------------------------------------ */
/* 사이드바 뱃지                                                        */
/* ------------------------------------------------------------------ */

export interface BadgeSource {
  role: Role;
  partnerId?: string;
}

/** 사이드바에 표시할 알림 카운트 */
export function badgeCounts(data: AppData, source: BadgeSource) {
  if (source.role === "PARTNER") {
    return {
      newJobs: partnerOrders(data, source.partnerId).filter((o) => o.status === "ASSIGNED").length,
    };
  }
  if (source.role === "ADMIN") {
    return {
      reviewQueue: data.orders.filter((o) => o.status === "IN_REVIEW").length,
      openInquiries: data.inquiries.filter((i) => i.status === "OPEN").length,
    };
  }
  return {};
}
