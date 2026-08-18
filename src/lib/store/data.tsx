"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { nextOrderNo } from "@/lib/domain/order-no";
import { resolveUnitCost } from "@/lib/domain/selectors";
import type {
  AppData,
  AttachedFile,
  Category,
  Customer,
  Inquiry,
  InquiryCategory,
  Order,
  OrderHistoryEntry,
  Partner,
  PointTx,
  Product,
  Settlement,
  SettlementStatus,
} from "@/lib/domain/types";
import { createSeedData } from "@/lib/mock/seed";
import { useIsHydrated } from "@/lib/store/use-hydrated";

// 카탈로그(카테고리·상품) 구조가 바뀌면 버전을 올려 이전 저장본을 버린다
const STORAGE_KEY = "gkt.data.v2";

/**
 * 하이드레이션 전에 사용하는 시드 스냅샷.
 *
 * 서버 렌더와 첫 클라이언트 렌더가 이 값을 함께 사용하므로, 비로그인 서비스몰의
 * 카테고리·상품이 서버 HTML에도 담긴다. (localStorage 저장본은 하이드레이션 이후에 반영)
 */
let seedSnapshot: AppData | null = null;
function getSeedSnapshot(): AppData {
  seedSnapshot ??= createSeedData();
  return seedSnapshot;
}

function saveData(data: AppData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* 저장 용량 초과 등은 데모에서 무시 */
  }
}

/** 서버에서는 시드 스냅샷, 클라이언트에서는 저장본 또는 새 시드 */
function loadData(): AppData {
  if (typeof window === "undefined") return getSeedSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.orders) && Array.isArray(parsed.products)) return parsed;
    }
  } catch {
    /* 저장 데이터가 손상된 경우 시드로 복구 */
  }
  return createSeedData();
}

function now(): string {
  return new Date().toISOString();
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* 액션 입력 타입                                                       */
/* ------------------------------------------------------------------ */

export interface CreateOrderInput {
  customerId: string;
  productId: string;
  qty: number;
  targetUrl: string;
  requestNote: string;
  files: AttachedFile[];
}

export interface SubmitResultInput {
  doneQty: number;
  resultUrls: string[];
  files: AttachedFile[];
  memo: string;
}

export interface CreateInquiryInput {
  customerId: string;
  category: InquiryCategory;
  title: string;
  content: string;
  orderNo?: string;
}

interface DataValue {
  /** localStorage 복원 완료 여부 */
  ready: boolean;
  data: AppData;

  /* 주문 흐름 */
  createOrder: (input: CreateOrderInput) => Order;
  assignOrder: (orderNo: string, partnerId: string, dueDate?: string) => void;
  startOrder: (orderNo: string) => void;
  submitResult: (orderNo: string, result: SubmitResultInput) => void;
  approveOrder: (orderNo: string) => void;
  requestRevision: (orderNo: string, note: string) => void;
  cancelOrder: (orderNo: string, reason: string) => void;

  /* 포인트 */
  chargePoint: (customerId: string, amount: number, method: "CARD" | "TRANSFER") => void;

  /* 문의 */
  createInquiry: (input: CreateInquiryInput) => void;
  answerInquiry: (id: string, answer: string) => void;

  /* 정산 */
  updateSettlementStatus: (ids: string[], status: SettlementStatus) => void;

  /* 기준정보 */
  upsertCategory: (category: Category) => void;
  upsertProduct: (product: Product) => void;
  upsertCustomer: (customer: Customer) => void;
  upsertPartner: (partner: Partner) => void;

  /** 데모 데이터 초기화 */
  resetData: () => void;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const ready = useIsHydrated();

  // 액션이 항상 최신 상태를 보도록 ref로 함께 관리한다.
  // (setState 콜백 안에서 부수효과를 일으키지 않기 위한 목적도 있다)
  const dataRef = useRef(data);

  // 시드로 생성된 최초 데이터를 저장해 새로고침 시에도 동일한 데모 데이터를 유지한다
  useEffect(() => {
    saveData(dataRef.current);
  }, []);

  const value = useMemo<DataValue>(() => {
    function commit(next: AppData) {
      dataRef.current = next;
      saveData(next);
      setData(next);
    }

    function mutate(fn: (prev: AppData) => AppData) {
      commit(fn(dataRef.current));
    }

    /** 주문 1건을 갱신하면서 이력 항목을 덧붙인다 */
    function updateOrder(
      orderNo: string,
      patch: (order: Order) => Order,
      history?: OrderHistoryEntry,
    ) {
      mutate((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => {
          if (order.orderNo !== orderNo) return order;
          const next = patch(order);
          return history ? { ...next, history: [...next.history, history] } : next;
        }),
      }));
    }

    function addPointTx(
      prev: AppData,
      tx: Omit<PointTx, "id" | "balance">,
    ): { customers: Customer[]; pointTxs: PointTx[] } {
      const customer = prev.customers.find((c) => c.id === tx.customerId);
      const balance = (customer?.point ?? 0) + tx.amount;
      const entry: PointTx = {
        ...tx,
        id: `pt-${tx.createdAt}-${tx.orderNo ?? tx.type}`,
        balance,
      };
      return {
        customers: prev.customers.map((c) => (c.id === tx.customerId ? { ...c, point: balance } : c)),
        pointTxs: [entry, ...prev.pointTxs],
      };
    }

    return {
      ready,
      // 하이드레이션 전에는 서버와 동일한 시드 스냅샷을 노출해 불일치를 막는다
      data: ready ? data : getSeedSnapshot(),

      createOrder(input) {
        const prev = dataRef.current;
        const product = prev.products.find((p) => p.id === input.productId);
        if (!product) throw new Error("상품 정보를 찾을 수 없습니다.");

        const customer = prev.customers.find((c) => c.id === input.customerId);
        if (!customer) throw new Error("광고주 정보를 찾을 수 없습니다.");

        const amount = product.price * input.qty;
        if (customer.point < amount) throw new Error("보유 포인트가 부족합니다.");

        const createdAt = now();
        const order: Order = {
          orderNo: nextOrderNo(prev.orders),
          customerId: input.customerId,
          productId: product.id,
          productName: product.name,
          categoryId: product.categoryId,
          qty: input.qty,
          unitPrice: product.price,
          amount,
          targetUrl: input.targetUrl,
          requestNote: input.requestNote,
          files: input.files,
          status: "RECEIVED",
          createdAt,
          history: [{ status: "RECEIVED", at: createdAt, by: "CUSTOMER", note: "주문 접수" }],
        };

        const point = addPointTx(prev, {
          customerId: input.customerId,
          type: "USE",
          title: `${product.name} 주문 결제`,
          amount: -amount,
          orderNo: order.orderNo,
          createdAt,
        });

        commit({ ...prev, ...point, orders: [order, ...prev.orders] });
        return order;
      },

      assignOrder(orderNo, partnerId, dueDate) {
        const prev = dataRef.current;
        const order = prev.orders.find((o) => o.orderNo === orderNo);
        if (!order) return;
        const partner = prev.partners.find((p) => p.id === partnerId);
        const product = prev.products.find((p) => p.id === order.productId);
        const assignedAt = now();

        updateOrder(
          orderNo,
          (o) => ({
            ...o,
            status: "ASSIGNED",
            partnerId,
            unitCost: resolveUnitCost(prev, partnerId, o.productId),
            assignedAt,
            dueDate: dueDate ?? addDays(assignedAt, product?.leadDays ?? 7),
          }),
          {
            status: "ASSIGNED",
            at: assignedAt,
            by: "ADMIN",
            note: `${partner?.name ?? "실행사"} 배정`,
          },
        );
      },

      startOrder(orderNo) {
        const startedAt = now();
        updateOrder(orderNo, (o) => ({ ...o, status: "IN_PROGRESS", startedAt }), {
          status: "IN_PROGRESS",
          at: startedAt,
          by: "PARTNER",
          note: "작업 시작",
        });
      },

      submitResult(orderNo, result) {
        const submittedAt = now();
        updateOrder(
          orderNo,
          (o) => ({
            ...o,
            status: "IN_REVIEW",
            submittedAt,
            reviewNote: undefined,
            result: { ...result, submittedAt },
          }),
          { status: "IN_REVIEW", at: submittedAt, by: "PARTNER", note: "작업 완료 요청" },
        );
      },

      approveOrder(orderNo) {
        const prev = dataRef.current;
        const order = prev.orders.find((o) => o.orderNo === orderNo);
        if (!order) return;
        const completedAt = now();
        const unitCost = order.unitCost ?? 0;
        const doneQty = order.result?.doneQty ?? order.qty;

        const settlement: Settlement | null = order.partnerId
          ? {
              id: `stl-${order.orderNo}`,
              orderNo: order.orderNo,
              partnerId: order.partnerId,
              qty: doneQty,
              unitCost,
              amount: unitCost * doneQty,
              completedAt,
              status: "PENDING",
              scheduledAt: addDays(completedAt, 15),
            }
          : null;

        commit({
          ...prev,
          orders: prev.orders.map((o) =>
            o.orderNo === orderNo
              ? {
                  ...o,
                  status: "COMPLETED",
                  completedAt,
                  history: [
                    ...o.history,
                    { status: "COMPLETED", at: completedAt, by: "ADMIN", note: "검수 승인" },
                  ],
                }
              : o,
          ),
          settlements: settlement
            ? [settlement, ...prev.settlements.filter((s) => s.orderNo !== orderNo)]
            : prev.settlements,
        });
      },

      requestRevision(orderNo, note) {
        const at = now();
        updateOrder(orderNo, (o) => ({ ...o, status: "IN_PROGRESS", reviewNote: note }), {
          status: "IN_PROGRESS",
          at,
          by: "ADMIN",
          note: "수정 요청",
        });
      },

      cancelOrder(orderNo, reason) {
        const prev = dataRef.current;
        const order = prev.orders.find((o) => o.orderNo === orderNo);
        if (!order) return;
        const at = now();

        const point = addPointTx(prev, {
          customerId: order.customerId,
          type: "REFUND",
          title: `${order.productName} 주문취소 환불`,
          amount: order.amount,
          orderNo: order.orderNo,
          createdAt: at,
        });

        commit({
          ...prev,
          ...point,
          orders: prev.orders.map((o) =>
            o.orderNo === orderNo
              ? {
                  ...o,
                  status: "CANCELED",
                  history: [
                    ...o.history,
                    { status: "CANCELED", at, by: "ADMIN", note: reason || "주문 취소" },
                  ],
                }
              : o,
          ),
        });
      },

      chargePoint(customerId, amount, method) {
        const prev = dataRef.current;
        const point = addPointTx(prev, {
          customerId,
          type: "CHARGE",
          title: method === "CARD" ? "신용카드 충전" : "계좌이체 충전",
          amount,
          method,
          createdAt: now(),
        });
        commit({ ...prev, ...point });
      },

      createInquiry(input) {
        const createdAt = now();
        const inquiry: Inquiry = {
          ...input,
          id: `inq-${createdAt}`,
          status: "OPEN",
          createdAt,
        };
        mutate((prev) => ({ ...prev, inquiries: [inquiry, ...prev.inquiries] }));
      },

      answerInquiry(id, answer) {
        const answeredAt = now();
        mutate((prev) => ({
          ...prev,
          inquiries: prev.inquiries.map((i) =>
            i.id === id ? { ...i, status: "ANSWERED", answer, answeredAt } : i,
          ),
        }));
      },

      updateSettlementStatus(ids, status) {
        const at = now();
        const idSet = new Set(ids);
        mutate((prev) => ({
          ...prev,
          settlements: prev.settlements.map((s) =>
            idSet.has(s.id)
              ? {
                  ...s,
                  status,
                  scheduledAt: status === "SCHEDULED" ? addDays(at, 7) : s.scheduledAt,
                  paidAt: status === "PAID" ? at : undefined,
                }
              : s,
          ),
        }));
      },

      upsertCategory(category) {
        mutate((prev) => ({ ...prev, categories: upsert(prev.categories, category) }));
      },
      upsertProduct(product) {
        mutate((prev) => ({ ...prev, products: upsert(prev.products, product) }));
      },
      upsertCustomer(customer) {
        mutate((prev) => ({ ...prev, customers: upsert(prev.customers, customer) }));
      },
      upsertPartner(partner) {
        mutate((prev) => ({ ...prev, partners: upsert(prev.partners, partner) }));
      },

      resetData() {
        commit(createSeedData());
      },
    };
  }, [data, ready]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/** id를 기준으로 교체하거나 없으면 추가한다 */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData는 DataProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
