import type { AiBlogReference } from "@/lib/ai-blog/types";

/**
 * 참고자료 수집 계층.
 *
 * 원고 생성의 2순위 기준이 참고자료이므로, "무엇을 실제로 읽었는가"를
 * 생성 단계가 알 수 있어야 한다. 그래서 입력값을 그대로 프롬프트에 붙이지 않고
 * 이 계층에서 한 번 해석한 뒤 ResolvedReference로 넘긴다.
 *
 * 현재 기본 구현(localReferenceResolver)은 브라우저에서 동작하므로
 * 외부 URL 본문을 가져오지 않는다. URL은 status="NOT_FETCHED"로 표시되고,
 * 원고 생성기는 내용을 아는 척하지 않는다.
 *
 * 실제 API 연동 시에는
 *   URL → 본문 추출 → 핵심정보 정리 → 원고 생성
 * 순서가 되도록, 서버에서 동작하는 ReferenceResolver를 만들어
 * setReferenceResolver()로 갈아 끼우면 된다. 화면 코드는 바뀌지 않는다.
 */

export type ReferenceStatus =
  /** 사용자가 직접 입력한 내용 — 그대로 근거로 사용 */
  | "TEXT"
  /** 외부 URL 본문 수집 성공 */
  | "FETCHED"
  /** 외부 URL이지만 본문을 읽지 못함 — 내용을 반영했다고 말하면 안 됨 */
  | "NOT_FETCHED";

export interface ResolvedReference {
  id: string;
  kind: AiBlogReference["kind"];
  /** 원본 입력값 (URL 또는 텍스트) */
  source: string;
  status: ReferenceStatus;
  /** 원고에 반영할 수 있는 요점 — TEXT/FETCHED일 때만 채워진다 */
  points: string[];
}

export interface ReferenceResolver {
  /** 외부 URL 본문을 실제로 가져올 수 있는 구현인지 */
  readonly canFetchUrl: boolean;
  resolve(references: AiBlogReference[]): Promise<ResolvedReference[]>;
}

/** 직접 입력 텍스트를 문장 단위 요점으로 자른다 */
function toPoints(text: string): string[] {
  return text
    .split(/[\n.]|(?<=다)\s(?=[가-힣])/)
    .map((line) => line.replace(/^[-*•\s]+/, "").trim())
    .filter((line) => line.length >= 8)
    .slice(0, 5);
}

/**
 * 기본 구현 — 브라우저에서 동작하며 외부 요청을 하지 않는다.
 * 직접 입력한 자료만 원고에 반영하고, URL은 저장·표시만 한다.
 */
export const localReferenceResolver: ReferenceResolver = {
  canFetchUrl: false,

  async resolve(references) {
    return references.map((reference) => {
      const source = reference.value.trim();
      if (reference.kind === "text") {
        return {
          id: reference.id,
          kind: reference.kind,
          source,
          status: "TEXT" as const,
          points: toPoints(source),
        };
      }
      return {
        id: reference.id,
        kind: reference.kind,
        source,
        status: "NOT_FETCHED" as const,
        points: [],
      };
    });
  },
};

let current: ReferenceResolver = localReferenceResolver;

/** 실제 URL 수집이 가능한 구현으로 교체 (서버 라우트에서 동작하는 구현을 넣는다) */
export function setReferenceResolver(resolver: ReferenceResolver): void {
  current = resolver;
}

export function getReferenceResolver(): ReferenceResolver {
  return current;
}

/* ------------------------------------------------------------------ */
/* 조회 헬퍼                                                            */
/* ------------------------------------------------------------------ */

/** 원고에 실제로 반영할 수 있는 요점만 모은다 */
export function usablePoints(resolved: ResolvedReference[]): string[] {
  return resolved.flatMap((r) => (r.status === "NOT_FETCHED" ? [] : r.points)).slice(0, 5);
}

/** 내용을 읽지 못한 URL 목록 */
export function unreadUrls(resolved: ResolvedReference[]): string[] {
  return resolved.filter((r) => r.status === "NOT_FETCHED").map((r) => r.source);
}

/** 참고자료 입력 화면에 띄우는 안내 문구 */
export const URL_NOT_ANALYZED_NOTICE =
  "현재 데모에서는 URL 주소만 저장되며 페이지 내용은 자동으로 분석되지 않습니다. 원고에 꼭 반영할 내용은 '직접 입력'으로 넣어주세요.";
