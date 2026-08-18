import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FolderTree,
  Headphones,
  LayoutDashboard,
  ListChecks,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Timer,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import type { Role } from "@/lib/domain/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** 사이드바 뱃지에 표시할 카운트 종류 */
  badge?: "newJobs" | "reviewQueue" | "openInquiries";
  /** 활성 표시를 정확히 일치시켜야 하는 경우 */
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/**
 * 사이드바를 사용하는 운영자 역할.
 * 광고주(CUSTOMER)는 쇼핑몰형 상단 네비게이션(SHOP_NAV)을 쓰므로 여기에 포함하지 않는다.
 */
export type SidebarRole = Exclude<Role, "CUSTOMER">;

export const NAV: Record<SidebarRole, NavSection[]> = {
  PARTNER: [
    {
      items: [
        { label: "대시보드", href: "/partner/dashboard", icon: LayoutDashboard },
        { label: "신규 작업", href: "/partner/jobs?tab=new", icon: ListChecks, badge: "newJobs" },
        { label: "진행중 작업", href: "/partner/jobs?tab=active", icon: Timer },
        { label: "완료 작업", href: "/partner/jobs?tab=done", icon: ClipboardCheck },
      ],
    },
    {
      title: "정산 · 계정",
      items: [
        { label: "정산내역", href: "/partner/settlements", icon: Receipt },
        { label: "내 정보", href: "/partner/profile", icon: UserCircle },
      ],
    },
  ],
  ADMIN: [
    {
      items: [
        { label: "대시보드", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "주문관리", href: "/admin/orders", icon: ClipboardList },
        { label: "검수관리", href: "/admin/reviews", icon: ClipboardCheck, badge: "reviewQueue" },
      ],
    },
    {
      title: "상품",
      items: [
        { label: "상품관리", href: "/admin/products", icon: Package },
        { label: "카테고리관리", href: "/admin/categories", icon: FolderTree },
      ],
    },
    {
      title: "회원",
      items: [
        { label: "광고주관리", href: "/admin/customers", icon: Users },
        { label: "실행사관리", href: "/admin/partners", icon: Building2 },
      ],
    },
    {
      title: "정산 · 운영",
      items: [
        { label: "포인트관리", href: "/admin/points", icon: Wallet },
        { label: "정산관리", href: "/admin/settlements", icon: Receipt },
        { label: "문의관리", href: "/admin/inquiries", icon: Headphones, badge: "openInquiries" },
        { label: "설정", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 광고주 상단 네비게이션 (쇼핑몰형)                                    */
/* ------------------------------------------------------------------ */

export interface ShopNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** 하위 경로까지 활성 처리할지 (기본: 하위 포함, 홈만 정확히 일치) */
  exact?: boolean;
  /** 로그인한 광고주에게만 노출 */
  authOnly?: boolean;
}

export const SHOP_NAV: ShopNavItem[] = [
  { label: "서비스", href: "/", icon: ShoppingBag, exact: true },
  { label: "주문내역", href: "/orders", icon: ClipboardList, authOnly: true },
  { label: "이용안내", href: "/guide", icon: BookOpen },
  { label: "문의하기", href: "/support", icon: Headphones },
];
