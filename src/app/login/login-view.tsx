"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles, Store, Users } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/config/brand";
import type { Role } from "@/lib/domain/types";
import { ROLE_HOME, ROLE_LABEL, accountByRole } from "@/lib/mock/accounts";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  "유튜브·블로그·카페·언론보도까지 한 곳에서",
  "포인트로 결제하고 진행 상황은 실시간 확인",
  "복잡한 견적 없이 표시된 단가 그대로",
];

/** 열린 리다이렉트를 막기 위해 사이트 내부 경로만 허용한다 */
function safeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSession();

  const redirect = safeRedirect(searchParams.get("redirect"));
  const demoCustomer = accountByRole("CUSTOMER");
  const [email, setEmail] = useState(demoCustomer.email);
  const [password, setPassword] = useState("demo1234");

  /** 로그인한 역할이 접근할 수 있는 경로일 때만 원래 화면으로 돌려보낸다 */
  function destinationFor(role: Role): string {
    if (!redirect) return ROLE_HOME[role];
    const isAdminPath = redirect.startsWith("/admin");
    const isPartnerPath = redirect.startsWith("/partner");
    if (role === "ADMIN") return isAdminPath ? redirect : ROLE_HOME[role];
    if (role === "PARTNER") return isPartnerPath ? redirect : ROLE_HOME[role];
    return isAdminPath || isPartnerPath ? ROLE_HOME[role] : redirect;
  }

  function enter(role: Role) {
    const acc = accountByRole(role);
    login(acc.id);
    router.push(destinationFor(role));
  }

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[1fr_1fr]">
      {/* 좌측 브랜드 소개 */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Logo href="/" size="lg" tone="invert" />
        <div className="max-w-md">
          <h1 className="text-3xl leading-snug font-bold tracking-tight">
            마케팅 서비스를
            <br />
            쉽고 빠르게 주문하세요.
          </h1>
          <ul className="mt-8 flex flex-col gap-3">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-center gap-2.5 text-sm text-primary-foreground/85">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Sparkles className="size-3" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} {BRAND.name}. 프로토타입 데모 환경입니다.
        </p>
      </div>

      {/* 우측 로그인 */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="flex justify-center lg:hidden">
            <Logo href="/" size="lg" showTagline />
          </div>

          <h2 className="mt-8 text-center text-xl font-bold tracking-tight lg:mt-0 lg:text-left">
            로그인
          </h2>
          <p className="mt-1.5 text-center text-[13px] text-muted-foreground lg:text-left">
            {redirect
              ? "로그인하면 보고 계시던 화면으로 돌아갑니다."
              : `${BRAND.name} 계정으로 로그인해 주세요.`}
          </p>

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              enter("CUSTOMER");
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-[13px]">
                이메일
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-[13px]">
                비밀번호
              </Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="h-11 w-full text-[15px]">
              로그인
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-1 text-[13px]">
            <span className="text-muted-foreground">아직 계정이 없으신가요?</span>
            <Link href="/register" className="font-semibold text-primary hover:underline">
              회원가입
            </Link>
          </div>

          <Button variant="outline" size="lg" className="mt-5 h-11 w-full text-[15px]" asChild>
            <Link href="/">
              <Store />
              로그인 없이 서비스 둘러보기
            </Link>
          </Button>

          <p className="mt-6 rounded-xl bg-muted/50 p-3 text-center text-xs text-muted-foreground">
            프로토타입 단계에서는 입력값과 관계없이 데모 계정으로 로그인됩니다.
          </p>

          <div className="mt-6 border-t border-border pt-5">
            <DemoDialog onEnter={enter} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            고객센터 {BRAND.support.phone} · {BRAND.support.email}
          </p>
        </div>
      </div>
    </div>
  );
}

const DEMO_ROLES: Array<{ role: Role; icon: React.ElementType; description: string }> = [
  {
    role: "CUSTOMER",
    icon: Sparkles,
    description: "서비스를 주문하고 진행 상황과 결과를 확인합니다.",
  },
  { role: "PARTNER", icon: Users, description: "배정받은 작업을 수행하고 결과를 등록합니다." },
  { role: "ADMIN", icon: ShieldCheck, description: "주문을 배정하고 결과를 검수합니다." },
];

/** 운영자 화면 확인용 — 일반 사용자 화면에서는 눈에 띄지 않게 둔다 */
function DemoDialog({ onEnter }: { onEnter: (role: Role) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mx-auto block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          DEMO · 운영자 화면으로 접속
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>데모 계정 선택</DialogTitle>
          <DialogDescription>
            프로토타입 확인용입니다. 접속 후에도 우측 상단 메뉴에서 화면을 전환할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {DEMO_ROLES.map(({ role, icon: Icon, description }) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                setOpen(false);
                onEnter(role);
              }}
              className="group flex items-center gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  role === "ADMIN" ? "bg-slate-900 text-white" : "bg-accent text-accent-foreground",
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{ROLE_LABEL[role]} 화면</span>
                <span className="block truncate text-xs text-muted-foreground">{description}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
