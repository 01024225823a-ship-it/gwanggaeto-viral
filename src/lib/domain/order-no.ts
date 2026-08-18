import { BRAND } from "@/config/brand";

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

/** Date → 260813 (주문번호 중간 날짜 파트) */
export function orderDateKey(at: Date): string {
  return `${String(at.getFullYear()).slice(2)}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
}

/**
 * 같은 날짜의 기존 주문 뒤에 이어지는 주문번호를 만든다. — GKT-260813-001
 * 시드 생성과 신규 주문 생성이 같은 규칙을 쓰도록 한 곳에 둔다.
 */
export function nextOrderNo(orders: ReadonlyArray<{ orderNo: string }>, at: Date = new Date()): string {
  const prefix = `${BRAND.orderPrefix}-${orderDateKey(at)}-`;
  const lastSeq = orders.reduce((max, o) => {
    if (!o.orderNo.startsWith(prefix)) return max;
    const seq = Number(o.orderNo.slice(prefix.length));
    return Number.isFinite(seq) ? Math.max(max, seq) : max;
  }, 0);
  return `${prefix}${pad(lastSeq + 1, 3)}`;
}
