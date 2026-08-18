"use client";

import { useState } from "react";
import { CalendarClock, CircleDollarSign, Receipt } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { FilterTabs } from "@/components/common/filter-tabs";
import { PageHeader } from "@/components/common/page-header";
import { SettlementBadge } from "@/components/common/status-badge";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { findOrder, partnerName, settlementTotals } from "@/lib/domain/selectors";
import { SETTLEMENT_STATUS_META } from "@/lib/domain/status";
import type { SettlementStatus } from "@/lib/domain/types";
import { formatDate, formatNumber, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";

type Filter = SettlementStatus | "ALL";

const STATUSES: SettlementStatus[] = ["PENDING", "SCHEDULED", "PAID"];

export function AdminSettlementsView() {
  const { data, updateSettlementStatus } = useData();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [partnerId, setPartnerId] = useState("ALL");
  const [selected, setSelected] = useState<string[]>([]);

  const totals = settlementTotals(data);
  const all = [...data.settlements].sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const rows = all.filter((s) => {
    if (filter !== "ALL" && s.status !== filter) return false;
    if (partnerId !== "ALL" && s.partnerId !== partnerId) return false;
    return true;
  });

  const tabs = [
    { value: "ALL" as const, label: "전체", count: all.length },
    ...STATUSES.map((status) => ({
      value: status,
      label: SETTLEMENT_STATUS_META[status].label,
      count: all.filter((s) => s.status === status).length,
    })),
  ];

  const visibleIds = rows.map((s) => s.id);
  const selectedIds = selected.filter((id) => visibleIds.includes(id));
  const allChecked = visibleIds.length > 0 && selectedIds.length === visibleIds.length;
  const selectedAmount = rows
    .filter((s) => selectedIds.includes(s.id))
    .reduce((acc, s) => acc + s.amount, 0);

  function apply(status: SettlementStatus, label: string) {
    updateSettlementStatus(selectedIds, status);
    setSelected([]);
    toast.success(`${selectedIds.length}건을 ${label} 처리했습니다.`);
  }

  return (
    <>
      <PageHeader
        title="정산관리"
        description="완료된 작업의 실행사 정산 상태를 관리합니다."
      />

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="정산 대기" value={formatWon(totals.pending)} icon={Receipt} />
          <StatCard
            label="정산 예정"
            value={formatWon(totals.scheduled)}
            icon={CalendarClock}
            tone="amber"
          />
          <StatCard
            label="지급 완료"
            value={formatWon(totals.paid)}
            icon={CircleDollarSign}
            tone="emerald"
          />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <FilterTabs items={tabs} value={filter} onChange={setFilter} />
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 실행사</SelectItem>
                  {data.partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 px-3.5 py-3 ring-1 ring-primary/15">
                <p className="text-sm">
                  <span className="num font-semibold">{selectedIds.length}건</span> 선택 · 합계{" "}
                  <span className="num font-semibold">{formatWon(selectedAmount)}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline">
                        정산 예정 처리
                      </Button>
                    }
                    title="정산 예정으로 변경할까요?"
                    description={`선택한 ${selectedIds.length}건의 정산 예정일이 7일 뒤로 설정됩니다.`}
                    confirmLabel="변경"
                    onConfirm={() => apply("SCHEDULED", "정산 예정")}
                  />
                  <ConfirmDialog
                    trigger={<Button size="sm">지급 완료 처리</Button>}
                    title="지급 완료로 변경할까요?"
                    description={`선택한 ${selectedIds.length}건(${formatWon(
                      selectedAmount,
                    )})을 지급 완료 처리합니다.`}
                    confirmLabel="지급 완료"
                    onConfirm={() => apply("PAID", "지급 완료")}
                  />
                </div>
              </div>
            )}

            {rows.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="정산 건이 없습니다"
                description="검수 승인이 완료되면 정산 건이 생성됩니다."
              />
            ) : (
              <div className="scrollbar-thin overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allChecked}
                          aria-label="전체 선택"
                          onCheckedChange={(checked) => setSelected(checked ? visibleIds : [])}
                        />
                      </TableHead>
                      <TableHead>주문번호</TableHead>
                      <TableHead>실행사</TableHead>
                      <TableHead>서비스</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">매입단가</TableHead>
                      <TableHead className="text-right">정산금액</TableHead>
                      <TableHead>완료일</TableHead>
                      <TableHead>정산 예정일</TableHead>
                      <TableHead className="text-right">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((settlement) => {
                      const order = findOrder(data, settlement.orderNo);
                      const checked = selectedIds.includes(settlement.id);
                      return (
                        <TableRow key={settlement.id}>
                          <TableCell>
                            <Checkbox
                              checked={checked}
                              aria-label={`${settlement.orderNo} 선택`}
                              onCheckedChange={(next) =>
                                setSelected((prev) =>
                                  next
                                    ? [...prev, settlement.id]
                                    : prev.filter((id) => id !== settlement.id),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="num font-medium whitespace-nowrap">
                            {settlement.orderNo}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {partnerName(data, settlement.partnerId)}
                          </TableCell>
                          <TableCell className="max-w-48 truncate">
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
