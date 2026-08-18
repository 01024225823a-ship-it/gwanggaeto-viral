"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { FilterTabs } from "@/components/common/filter-tabs";
import { PageHeader } from "@/components/common/page-header";
import { SettlementBadge } from "@/components/common/status-badge";
import { StatCard } from "@/components/common/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { findOrder, settlementTotals } from "@/lib/domain/selectors";
import { SETTLEMENT_STATUS_META } from "@/lib/domain/status";
import type { SettlementStatus } from "@/lib/domain/types";
import { formatDate, formatNumber, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";

type Filter = SettlementStatus | "ALL";

const STATUSES: SettlementStatus[] = ["PENDING", "SCHEDULED", "PAID"];

export function PartnerSettlementsView() {
  const { account } = useSession();
  const { data } = useData();
  const [filter, setFilter] = useState<Filter>("ALL");

  const totals = settlementTotals(data, account?.partnerId);
  const all = [...totals.rows].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const rows = filter === "ALL" ? all : all.filter((s) => s.status === filter);

  const tabs = [
    { value: "ALL" as const, label: "전체", count: all.length },
    ...STATUSES.map((status) => ({
      value: status,
      label: SETTLEMENT_STATUS_META[status].label,
      count: all.filter((s) => s.status === status).length,
    })),
  ];

  return (
    <>
      <PageHeader
        title="정산내역"
        description="완료된 작업의 정산 금액과 지급 상태를 확인합니다."
      />

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="정산 대기" value={formatWon(totals.pending)} icon={Receipt} />
          <StatCard
            label="정산 예정"
            value={formatWon(totals.scheduled)}
            icon={Receipt}
            tone="amber"
          />
          <StatCard
            label="지급 완료"
            value={formatWon(totals.paid)}
            icon={Receipt}
            tone="emerald"
          />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <FilterTabs items={tabs} value={filter} onChange={setFilter} />

            {rows.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="정산 내역이 없습니다"
                description="작업이 완료되고 검수가 승인되면 정산 건이 생성됩니다."
              />
            ) : (
              <div className="scrollbar-thin overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>서비스</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">매입단가</TableHead>
                      <TableHead className="text-right">정산금액</TableHead>
                      <TableHead>작업 완료일</TableHead>
                      <TableHead>정산 예정일</TableHead>
                      <TableHead className="text-right">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((settlement) => {
                      const order = findOrder(data, settlement.orderNo);
                      return (
                        <TableRow key={settlement.id}>
                          <TableCell className="num font-medium whitespace-nowrap">
                            {settlement.orderNo}
                          </TableCell>
                          <TableCell className="max-w-56 truncate">
                            {order?.productName ?? "-"}
                          </TableCell>
                          <TableCell className="num text-right">
                            {formatNumber(settlement.qty)}
                          </TableCell>
                          <TableCell className="num text-right whitespace-nowrap text-muted-foreground">
                            {formatWon(settlement.unitCost)}
                          </TableCell>
                          <TableCell className="num text-right font-medium whitespace-nowrap">
                            {formatWon(settlement.amount)}
                          </TableCell>
                          <TableCell className="num whitespace-nowrap text-muted-foreground">
                            {formatDate(settlement.completedAt)}
                          </TableCell>
                          <TableCell className="num whitespace-nowrap text-muted-foreground">
                            {settlement.status === "PAID"
                              ? formatDate(settlement.paidAt)
                              : formatDate(settlement.scheduledAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <SettlementBadge status={settlement.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
