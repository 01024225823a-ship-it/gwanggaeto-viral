/**
 * 주문정보 입력 폼 문구 — 카테고리별로 달라지는 라벨·안내문구를 한 곳에서 정의한다.
 *
 * 유튜브 상품은 "롱폼 영상 URL / 수량 / 요청사항" 구조를 쓰므로 기본 폼과 문구가 다르다.
 * 주문 화면뿐 아니라 주문완료·주문상세·관리자 주문상세·실행사 작업상세가
 * 같은 라벨을 쓰도록 이 모듈을 공통 기준으로 삼는다.
 */

import { findCategory } from "@/lib/domain/selectors";
import type { AppData, Product } from "@/lib/domain/types";

/** 유튜브 카테고리 슬러그 — 카테고리 ID는 관리자가 새로 만들 수 있어 슬러그로 판별한다 */
export const YOUTUBE_CATEGORY_SLUG = "youtube";

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
  noteHint: string;
  notePlaceholder: string;
  /** 파일 첨부칸 노출 여부 */
  showFile: boolean;
}

/** 해당 카테고리가 유튜브인지 */
export function isYoutubeCategory(data: AppData, categoryId?: string): boolean {
  return findCategory(data, categoryId)?.slug === YOUTUBE_CATEGORY_SLUG;
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
      noteHint: "작업 시 참고할 요청사항을 입력해주세요.",
      notePlaceholder: "예) 강조할 구간, 자막 스타일, 영상 분위기 등",
      // 유튜브 주문정보는 URL·수량·요청사항 3가지로 고정한다
      showFile: false,
    };
  }

  return {
    youtube: false,
    showUrl: product.requiresUrl,
    urlRequired: product.requiresUrl,
    urlLabel: DEFAULT_URL_LABEL,
    urlHint: "작업이 진행될 게시물이나 페이지 주소를 붙여넣어 주세요.",
    urlPlaceholder: product.urlPlaceholder ?? "https://",
    urlMissingMessage: "작업할 주소(URL)를 입력해 주세요",
    noteHint: "",
    notePlaceholder: "강조하고 싶은 키워드나 참고사항을 편하게 적어주세요.",
    showFile: product.allowsFile,
  };
}
