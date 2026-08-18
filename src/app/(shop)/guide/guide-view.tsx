"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Headphones,
  PackageSearch,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { CUSTOMER_FLOW, CUSTOMER_STAGE_META } from "@/lib/domain/customer-status";

const STEPS = [
  {
    icon: PackageSearch,
    title: "서비스 선택",
    description:
      "카테고리에서 필요한 서비스를 고릅니다. 단가와 최소 주문수량이 카드에 그대로 표시됩니다.",
  },
  {
    icon: ClipboardList,
    title: "주문정보 입력",
    description:
      "작업할 주소(URL)와 수량, 요청사항을 입력합니다. 참고할 사진이나 원고가 있으면 첨부해 주세요.",
  },
  {
    icon: Wallet,
    title: "포인트로 결제",
    description:
      "충전해 둔 포인트에서 주문금액이 차감되며 바로 주문이 접수됩니다. 1원 = 1P로 환산됩니다.",
  },
  {
    icon: Truck,
    title: "진행·결과 확인",
    description:
      "주문내역에서 진행 단계를 확인하고, 작업이 완료되면 결과 링크와 메모를 확인할 수 있습니다.",
  },
];

const FAQ = [
  {
    q: "주문한 뒤 얼마나 걸리나요?",
    a: "서비스마다 예상 소요기간이 다릅니다. 주문 화면에 표시된 '예상 소요기간'을 참고해 주세요. 주문 상세에서 완료 예정일도 확인할 수 있습니다.",
  },
  {
    q: "포인트는 어떻게 충전하나요?",
    a: "상단 보유 포인트 버튼에서 '포인트 충전'으로 이동해 금액을 선택하면 됩니다. 세금계산서가 필요하면 충전 후 문의하기로 요청해 주세요.",
  },
  {
    q: "주문을 취소할 수 있나요?",
    a: "작업이 시작되기 전이라면 문의하기로 요청해 주세요. 취소가 확정되면 사용한 포인트가 전액 환불됩니다.",
  },
  {
    q: "요청사항은 어떻게 적으면 좋을까요?",
    a: "강조하고 싶은 키워드, 브랜드명, 피해야 할 표현 등을 자유롭게 적어주시면 작업에 반영됩니다. 자세할수록 결과가 좋아집니다.",
  },
  {
    q: "결과는 어디에서 확인하나요?",
    a: "작업이 완료되면 주문 상세 화면에 결과 링크와 작업 메모가 공개됩니다. 완료 전에는 진행 단계만 표시됩니다.",
  },
];

export function CustomerGuideView() {
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-3xl bg-accent/50 px-5 py-9 text-center sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight">이용안내</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {BRAND.name}은 주문부터 결과 확인까지 4단계로 끝납니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">이용 방법</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="flex gap-3.5 rounded-2xl border border-border p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    <span className="num mr-1.5 text-primary">0{i + 1}</span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">주문 진행 단계</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          주문 후 아래 순서대로 진행되며, 현재 단계는 주문내역에서 확인할 수 있습니다.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOMER_FLOW.map((stage, i) => {
            const meta = CUSTOMER_STAGE_META[stage];
            return (
              <li key={stage} className="rounded-2xl border border-border p-5">
                <span className="num text-[11px] font-bold text-primary">STEP 0{i + 1}</span>
                <p className="mt-1 text-[15px] font-semibold">{meta.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {meta.description}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">자주 묻는 질문</h2>
        <ul className="mt-4 flex flex-col gap-2.5">
          {FAQ.map((item) => (
            <li key={item.q} className="rounded-2xl border border-border p-5">
              <p className="text-[15px] font-semibold">
                <span className="mr-2 text-primary">Q.</span>
                {item.q}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{item.a}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-center gap-4 rounded-3xl border border-border p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <p className="text-[15px] font-bold">더 궁금한 점이 있으신가요?</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            고객센터 {BRAND.support.phone} · {BRAND.support.hours}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/support">
              <Headphones />
              문의하기
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/services">
              서비스 둘러보기
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
