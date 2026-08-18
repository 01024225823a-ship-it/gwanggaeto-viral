"use client";

import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { SidebarRole } from "@/config/nav";
import { badgeCounts } from "@/lib/domain/selectors";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";

/**
 * 운영자(실행사·관리자) 레이아웃 진입점.
 * AppShell(순수 레이아웃)에 스토어에서 계산한 뱃지를 주입하는 역할만 한다.
 */
export function RoleShell({
  role,
  children,
}: {
  role: SidebarRole;
  children: React.ReactNode;
}) {
  const { account } = useSession();
  const { data, resetData } = useData();

  const badges = badgeCounts(data, { role, partnerId: account?.partnerId });

  return (
    <AppShell
      role={role}
      badges={badges}
      sidebarFooter={
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <RotateCcw />
              데모 데이터 초기화
            </Button>
          }
          title="데모 데이터를 초기화할까요?"
          description="주문·포인트·정산·문의 내역이 모두 초기 상태로 되돌아갑니다. 이 프로토타입은 브라우저에만 데이터를 저장합니다."
          confirmLabel="초기화"
          variant="destructive"
          onConfirm={() => {
            resetData();
            toast.success("데모 데이터를 초기화했습니다.");
          }}
        />
      }
    >
      {children}
    </AppShell>
  );
}
