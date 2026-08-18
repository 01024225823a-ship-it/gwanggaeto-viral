"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BRAND } from "@/config/brand";
import { STATUS_TRANSITIONS } from "@/lib/domain/status";
import { ROLE_LABEL } from "@/lib/mock/accounts";
import { useData } from "@/lib/store/data";

export function AdminSettingsView() {
  const { data, resetData } = useData();

  return (
    <>
      <PageHeader title="설정" description="서비스 기본 정보와 운영 규칙을 확인합니다." />

      <div className="flex flex-col gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>서비스 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="서비스명" value={BRAND.name} />
              <Row label="한 줄 소개" value={BRAND.tagline} />
              <Row label="주문번호 접두사" value={BRAND.orderPrefix} />
              <Row
                label="포인트 단위"
                value={`1원 = ${BRAND.point.ratio}${BRAND.point.unit}`}
              />
              <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                브랜드 관련 값은 <span className="num">src/config/brand.ts</span> 한 곳에서
                관리됩니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>고객센터</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="대표번호" value={BRAND.support.phone} />
              <Row label="이메일" value={BRAND.support.email} />
              <Row label="운영시간" value={BRAND.support.hours} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>주문 상태 전이 규칙</CardTitle>
            <p className="text-sm text-muted-foreground">
              어떤 권한이 주문을 어느 상태로 넘길 수 있는지 정의합니다. 모든 화면의 버튼이 이 규칙을
              따릅니다.
            </p>
          </CardHeader>
          <CardContent>
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>현재 상태</TableHead>
                    <TableHead>변경 후</TableHead>
                    <TableHead>수행 권한</TableHead>
                    <TableHead>동작</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STATUS_TRANSITIONS.map((rule) => (
                    <TableRow key={`${rule.from}-${rule.to}-${rule.by}`}>
                      <TableCell>
                        <StatusBadge status={rule.from} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={rule.to} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{ROLE_LABEL[rule.by]}</TableCell>
                      <TableCell className="text-muted-foreground">{rule.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>데모 데이터</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="카테고리" value={data.categories.length} />
              <Stat label="상품" value={data.products.length} />
              <Stat label="광고주" value={data.customers.length} />
              <Stat label="실행사" value={data.partners.length} />
              <Stat label="주문" value={data.orders.length} />
              <Stat label="포인트 내역" value={data.pointTxs.length} />
              <Stat label="정산" value={data.settlements.length} />
              <Stat label="문의" value={data.inquiries.length} />
            </div>

            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 p-3.5 text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 text-[13px]">
                <p className="font-medium">이 프로토타입은 브라우저에만 데이터를 저장합니다.</p>
                <p className="mt-0.5">
                  모든 주문·포인트·정산 내역은 localStorage에 보관되며, 초기화하면 되돌릴 수 없습니다.
                  실제 서버·PG 연동은 이후 단계에서 진행됩니다.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <ConfirmDialog
                trigger={
                  <Button variant="destructive">
                    <RotateCcw />
                    데모 데이터 초기화
                  </Button>
                }
                title="데모 데이터를 초기화할까요?"
                description="주문·포인트·정산·문의 내역이 모두 초기 상태로 되돌아갑니다."
                confirmLabel="초기화"
                variant="destructive"
                onConfirm={() => {
                  resetData();
                  toast.success("데모 데이터를 초기화했습니다.");
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="num min-w-0 text-right font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
