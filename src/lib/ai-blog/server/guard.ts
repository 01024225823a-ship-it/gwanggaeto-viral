import { findAccount } from "@/lib/mock/accounts";
import type { Account } from "@/lib/domain/types";

/**
 * 호출 자격 확인 — 비용이 드는 AI 호출 앞에 두는 게이트.
 *
 * ⚠ 현재 이 프로젝트에는 서버 세션이 없다.
 *    로그인은 브라우저 localStorage 에 데모 계정 ID 를 담아두는 프로토타입 방식이라,
 *    서버는 클라이언트가 보낸 accountId 를 데모 계정 목록과 대조하는 것 말고는 할 수 있는 게 없다.
 *    즉 **위조 가능한 확인**이다. 비로그인 사용자의 실수/우발적 호출은 막지만,
 *    악의적인 호출은 막지 못한다.
 *
 *    실제 인증(NextAuth·세션 쿠키·JWT 등)을 붙일 때는 이 파일의
 *    requireCustomer() 한 곳만 교체하면 된다. 라우트 코드는 그대로 둬도 된다.
 */

export class AiBlogAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBlogAuthError";
  }
}

export class AiBlogRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBlogRateLimitError";
  }
}

/** 광고주 계정인지 확인한다 */
export function requireCustomer(accountId: unknown): Account {
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new AiBlogAuthError("로그인 후 이용할 수 있습니다.");
  }

  const account = findAccount(accountId.trim());
  if (!account) {
    throw new AiBlogAuthError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
  }
  if (account.role !== "CUSTOMER") {
    throw new AiBlogAuthError("광고주 계정으로 로그인해야 이용할 수 있습니다.");
  }
  return account;
}

/* ------------------------------------------------------------------ */
/* 사용량 제한                                                          */
/* ------------------------------------------------------------------ */

/**
 * 계정별 호출 횟수 (메모리).
 *
 * ⚠ 서버 인스턴스마다 따로 센다. Vercel 처럼 인스턴스가 여러 개인 환경에서는
 *    정확한 총량 제한이 아니라 "폭주 방지" 수준이다.
 *    정확한 사용량 관리가 필요해지면 이 함수만 Redis·DB 기반으로 바꾸면 된다.
 */
const buckets = new Map<string, number[]>();

const WINDOW_MS = 60_000;

export function checkRateLimit(accountId: string, limitPerMinute: number): void {
  const now = Date.now();
  const recent = (buckets.get(accountId) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= limitPerMinute) {
    throw new AiBlogRateLimitError(
      "짧은 시간에 요청이 많았습니다. 1분 뒤에 다시 시도해 주세요.",
    );
  }

  recent.push(now);
  buckets.set(accountId, recent);

  // 오래된 계정 기록은 정리한다 (메모리 누수 방지)
  if (buckets.size > 500) {
    for (const [key, times] of buckets) {
      if (times.every((at) => now - at >= WINDOW_MS)) buckets.delete(key);
    }
  }
}

/** 향후 사용량 집계를 붙일 지점 — 지금은 호출 사실만 남긴다 */
export function recordUsage(
  account: Account,
  action: "generate" | "revise" | "plan-visuals",
): void {
  // TODO: 사용량/과금 집계가 필요해지면 여기에서 DB 기록으로 연결한다.
  console.info(`[ai-blog] ${action} by ${account.id} (${account.org})`);
}
