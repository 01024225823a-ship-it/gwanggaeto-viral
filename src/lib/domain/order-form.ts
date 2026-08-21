/**
 * 주문정보 입력 폼 문구 — 카테고리·상품별로 달라지는 라벨·안내문구를 한 곳에서 정의한다.
 *
 * - 유튜브 상품은 "롱폼 영상 URL / 수량 / 요청사항" 구조를 쓴다.
 * - 블로그 상품은 배포 방식·키워드·이미지 첨부에 대한 사전 안내가 필요하다.
 * - 카페 바이럴 상품은 고객이 배포할 카페를 수량만큼 직접 고른다.
 *
 * 주문 화면뿐 아니라 주문완료·주문상세·관리자 주문상세·실행사 작업상세가
 * 같은 라벨을 쓰도록 이 모듈을 공통 기준으로 삼는다.
 */

import { findCategory } from "@/lib/domain/selectors";
import type { AppData, Product } from "@/lib/domain/types";

/** 유튜브 카테고리 슬러그 — 카테고리 ID는 관리자가 새로 만들 수 있어 슬러그로 판별한다 */
export const YOUTUBE_CATEGORY_SLUG = "youtube";

/** 블로그 카테고리 슬러그 */
export const BLOG_CATEGORY_SLUG = "blog";

/** 카페 바이럴 카테고리 슬러그 — 카페 직접 선택이 적용되는 카테고리 */
export const CAFE_VIRAL_CATEGORY_SLUG = "cafe-viral";

/** 기본(비유튜브) 주문 폼의 URL 라벨 */
export const DEFAULT_URL_LABEL = "작업 URL";

/** 유튜브 주문 폼의 URL 라벨 */
export const YOUTUBE_URL_LABEL = "유튜브 롱폼 URL";

export interface OrderFormCopy {
  /** 유튜브 전용 폼 여부 */
  youtube: boolean;
  /** URL 입력칸 노출 여부 */
  showUrl: boolean;
  /** URL 필수 입력 여부 */
  urlRequired: boolean;
  urlLabel: string;
  urlHint: string;
  urlPlaceholder: string;
  /** URL 미입력 시 보여줄 문구 */
  urlMissingMessage: string;
  /** 주문정보 입력 영역보다 앞에 노출할 상품 안내 (없으면 빈 배열) */
  notices: string[];
  /** 요청사항 라벨 옆 보조 문구 */
  noteLabelSuffix: string;
  /** 요청사항 입력칸 위에 강조 표시할 안내 (없으면 빈 문자열) */
  noteNotice: string;
  /** 요청사항 입력칸 아래 보조 안내 */
  noteHint: string;
  notePlaceholder: string;
  /** 파일 첨부칸 노출 여부 */
  showFile: boolean;
  /** 파일 첨부칸 위에 표시할 안내 (없으면 빈 문자열) */
  fileNotice: string;
  /** 주문 수량만큼 카페를 직접 선택하는 폼인지 */
  cafeSelection: boolean;
  /** 카페 선택 영역 안내 (없으면 빈 문자열) */
  cafeNotice: string;
  /** 카페 선택 영역 안내 예시 */
  cafeNoticeExample: string;
}

/**
 * 상품별 사전 안내 — 시드 상품 ID 기준.
 * 관리자가 새로 만든 상품에는 적용되지 않으며, 그 경우 기존 상품 안내(guide)만 노출된다.
 */
const PRODUCT_NOTICES: Record<string, string[]> = {
  // 네이버 블로그 일반 배포
  "prd-blog-basic": [
    "상위노출 보장형 상품이 아닙니다.",
    "일 방문자 1,000명 미만의 블로그를 통해 배포됩니다.",
  ],
  // 네이버 블로그 파워 배포
  "prd-blog-power": [
    "상위노출 보장형 상품이 아닙니다.",
    "일 방문자 1,000명 이상의 블로그를 통해 배포됩니다.",
  ],
};

/** 상위노출 관리 상품 — 요청사항으로 희망 키워드를 받는다 */
const KEYWORD_PRODUCT_IDS = new Set(["prd-blog-top"]);

/** 블로그 이미지 첨부 안내 */
const BLOG_FILE_NOTICE = "원활한 포스팅을 위해 8~15개의 이미지를 첨부해주세요.";

/** 같은 카페에 여러 건을 원할 때의 안내 — 중복 선택 대신 요청사항으로 받는다 */
const CAFE_DUPLICATE_NOTICE =
  "동일한 카페에 2건 이상 배포를 희망하시는 경우 요청사항에 카페명과 희망 수량을 남겨주세요.";
const CAFE_DUPLICATE_EXAMPLE = "예) 강서마곡맘모여라 3건 / 아이러브맘 2건";

/** 해당 카테고리가 유튜브인지 */
export function isYoutubeCategory(data: AppData, categoryId?: string): boolean {
  return findCategory(data, categoryId)?.slug === YOUTUBE_CATEGORY_SLUG;
}

/** 해당 카테고리가 블로그인지 */
export function isBlogCategory(data: AppData, categoryId?: string): boolean {
  return findCategory(data, categoryId)?.slug === BLOG_CATEGORY_SLUG;
}

/** 해당 카테고리가 카페 바이럴인지 (카페 댓글은 게시글 URL을 받으므로 제외) */
export function isCafeViralCategory(data: AppData, categoryId?: string): boolean {
  return findCategory(data, categoryId)?.slug === CAFE_VIRAL_CATEGORY_SLUG;
}

/** 주문 상세·작업 상세에서 쓰는 URL 라벨 */
export function orderUrlLabel(data: AppData, categoryId?: string): string {
  return isYoutubeCategory(data, categoryId) ? YOUTUBE_URL_LABEL : DEFAULT_URL_LABEL;
}

/** 상품에 맞는 주문정보 입력 폼 문구 */
export function orderFormCopy(data: AppData, product: Product): OrderFormCopy {
  if (isYoutubeCategory(data, product.categoryId)) {
    return {
      youtube: true,
      // 유튜브 상품은 롱폼 영상 URL이 있어야 작업이 가능하므로 항상 필수로 받는다
      showUrl: true,
      urlRequired: true,
      urlLabel: YOUTUBE_URL_LABEL,
      urlHint: "작업에 활용할 유튜브 롱폼 영상 URL을 입력해주세요.",
      urlPlaceholder: "https://www.youtube.com/watch?v=...",
      urlMissingMessage: "유튜브 롱폼 URL을 입력해 주세요",
      notices: [],
      noteLabelSuffix: "(선택)",
      noteNotice: "",
      noteHint: "작업 시 참고할 요청사항을 입력해주세요.",
      notePlaceholder: "예) 강조할 구간, 자막 스타일, 영상 분위기 등",
      // 유튜브 주문정보는 URL·수량·요청사항 3가지로 고정한다
      showFile: false,
      fileNotice: "",
      cafeSelection: false,
      cafeNotice: "",
      cafeNoticeExample: "",
    };
  }

  const base: OrderFormCopy = {
    youtube: false,
    showUrl: product.requiresUrl,
    urlRequired: product.requiresUrl,
    urlLabel: DEFAULT_URL_LABEL,
    urlHint: "작업이 진행될 게시물이나 페이지 주소를 붙여넣어 주세요.",
    urlPlaceholder: product.urlPlaceholder ?? "https://",
    urlMissingMessage: "작업할 주소(URL)를 입력해 주세요",
    notices: PRODUCT_NOTICES[product.id] ?? [],
    noteLabelSuffix: "(선택)",
    noteNotice: "",
    noteHint: "",
    notePlaceholder: "강조하고 싶은 키워드나 참고사항을 편하게 적어주세요.",
    showFile: product.allowsFile,
    fileNotice: "",
    cafeSelection: false,
    cafeNotice: "",
    cafeNoticeExample: "",
  };

  if (isCafeViralCategory(data, product.categoryId)) {
    return {
      ...base,
      cafeSelection: true,
      cafeNotice: CAFE_DUPLICATE_NOTICE,
      cafeNoticeExample: CAFE_DUPLICATE_EXAMPLE,
      noteNotice:
        "추가 요청사항을 입력해주세요.\n동일한 카페에 여러 건 배포를 희망하시는 경우 카페명과 희망 수량을 함께 작성해주세요.",
      notePlaceholder: CAFE_DUPLICATE_EXAMPLE,
    };
  }

  if (!isBlogCategory(data, product.categoryId)) return base;

  return {
    ...base,
    // 상위노출 관리는 요청사항으로 희망 키워드를 받는다
    ...(KEYWORD_PRODUCT_IDS.has(product.id)
      ? {
          noteLabelSuffix: "(희망 키워드 3~5개)",
          noteNotice:
            "네이버 검색 환경에 따라 상위노출 진행이 어려운 키워드가 있을 수 있습니다.\n작업 가능 여부 확인을 위해 희망 키워드를 3~5개 입력해주세요.",
          notePlaceholder: "예) 키워드1, 키워드2, 키워드3",
        }
      : null),
    // 첨부 기능·허용 형식은 그대로 두고 안내 문구만 덧붙인다
    fileNotice: base.showFile ? BLOG_FILE_NOTICE : "",
  };
}
