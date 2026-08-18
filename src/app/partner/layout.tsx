"use client";

import { RoleShell } from "@/components/layout/role-shell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="PARTNER">{children}</RoleShell>;
}
