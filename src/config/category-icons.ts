import type { LucideIcon } from "lucide-react";
import {
  Camera,
  Flame,
  LayoutGrid,
  MessageCircle,
  MessagesSquare,
  MonitorPlay,
  Newspaper,
  PenLine,
  Package,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";

/**
 * 카테고리 슬러그 → 아이콘.
 *
 * 도메인 타입(Category)에 아이콘을 두지 않고 여기서만 매핑한다.
 * 새 카테고리를 만들면 슬러그를 키로 추가하면 되고, 없으면 기본 아이콘이 쓰인다.
 *
 * lucide v1에는 브랜드 로고 아이콘(Youtube/Instagram 등)이 없으므로
 * 의미가 통하는 일반 아이콘(영상/카메라)으로 대체한다.
 *
 * 렌더 중 함수 호출로 컴포넌트를 만들면 React Compiler가 경고하므로,
 * 사용하는 쪽에서 이 맵을 직접 조회한다.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  youtube: MonitorPlay,
  blog: PenLine,
  "cafe-viral": MessagesSquare,
  "cafe-comment": MessageCircle,
  hotdeal: Flame,
  news: Newspaper,
  review: Star,
  instagram: Camera,
  "ai-blog": WandSparkles,
  package: Package,
  etc: LayoutGrid,
};

/** 매핑되지 않은 카테고리에 쓰는 기본 아이콘 */
export const DEFAULT_CATEGORY_ICON: LucideIcon = LayoutGrid;

/** 추천 서비스 탭 등 실제 카테고리가 아닌 항목에 쓰는 아이콘 */
export const RECOMMEND_ICON: LucideIcon = Sparkles;
