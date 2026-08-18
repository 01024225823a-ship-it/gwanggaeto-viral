import type { Account, Role } from "@/lib/domain/types";

/**
 * 데모 로그인 계정.
 * 1차 프로토타입에서는 실제 인증 대신 이 계정들을 선택해 로그인한다.
 * (향후 실제 회원가입/로그인으로 교체 — 화면 구조는 그대로 유지 가능)
 */
export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "acc-customer-01",
    role: "CUSTOMER",
    name: "김지훈",
    org: "(주)그린푸드컴퍼니",
    email: "customer@demo.gwanggaeto.io",
    description: "서비스를 주문하고 진행 상황과 결과를 확인합니다.",
    customerId: "cust-01",
  },
  {
    id: "acc-partner-01",
    role: "PARTNER",
    name: "박서연",
    org: "A미디어웍스",
    email: "partner@demo.gwanggaeto.io",
    description: "배정받은 작업을 수행하고 결과를 등록합니다.",
    partnerId: "ptn-01",
  },
  {
    id: "acc-admin-01",
    role: "ADMIN",
    name: "이도현",
    org: "광개토 Viral 운영팀",
    email: "admin@demo.gwanggaeto.io",
    description: "주문을 실행사에 배정하고 결과를 검수합니다.",
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "광고주",
  PARTNER: "실행사",
  ADMIN: "관리자",
};

export const ROLE_HOME: Record<Role, string> = {
  // 광고주는 업무형 대시보드가 아니라 서비스몰 홈으로 진입한다
  CUSTOMER: "/",
  PARTNER: "/partner/dashboard",
  ADMIN: "/admin/dashboard",
};

export function findAccount(id: string): Account | undefined {
  return DEMO_ACCOUNTS.find((a) => a.id === id);
}

export function accountByRole(role: Role): Account {
  return DEMO_ACCOUNTS.find((a) => a.role === role) ?? DEMO_ACCOUNTS[0];
}
