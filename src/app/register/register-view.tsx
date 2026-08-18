"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Info, Store } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/config/brand";
import { ROLE_HOME, accountByRole } from "@/lib/mock/accounts";
import { useSession } from "@/lib/store/session";

export function RegisterView() {
  const router = useRouter();
  const { login } = useSession();

  const [form, setForm] = useState({
    company: "",
    manager: "",
    email: "",
    phone: "",
    password: "",
  });

  function patch(next: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function startDemo() {
    const acc = accountByRole("CUSTOMER");
    login(acc.id);
    router.push(ROLE_HOME.CUSTOMER);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.manager.trim() || !form.email.trim()) {
      toast.error("회사명·담당자·이메일을 입력해 주세요.");
      return;
    }
    toast.success("프로토타입에서는 데모 계정으로 시작합니다.", {
      description: "실제 회원가입은 이후 단계에서 연결됩니다.",
    });
    startDemo();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-surface px-5 py-12 sm:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo href="/" size="lg" showTagline />
        </div>

        <h1 className="mt-8 text-center text-xl font-bold tracking-tight">회원가입</h1>
        <p className="mt-1.5 text-center text-[13px] text-muted-foreground">
          가입하시면 서비스를 주문하고 진행 상황을 확인할 수 있습니다.
        </p>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-accent/50 p-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            1차 프로토타입에서는 실제 가입 대신 <b className="text-foreground">데모 계정</b>으로
            모든 기능을 체험합니다. 입력하신 내용은 저장되지 않습니다.
          </p>
        </div>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="회사명" required>
            <Input
              value={form.company}
              onChange={(e) => patch({ company: e.target.value })}
              placeholder="예) (주)그린푸드컴퍼니"
              className="h-11"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="담당자" required>
              <Input
                value={form.manager}
                onChange={(e) => patch({ manager: e.target.value })}
                className="h-11"
              />
            </Field>
            <Field label="연락처">
              <Input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="010-0000-0000"
                className="num h-11"
              />
            </Field>
          </div>
          <Field label="이메일" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => patch({ email: e.target.value })}
              className="h-11"
              autoComplete="username"
            />
          </Field>
          <Field label="비밀번호">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => patch({ password: e.target.value })}
              className="h-11"
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" size="lg" className="h-11 w-full text-[15px]">
            가입하고 시작하기
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-1 text-[13px]">
          <span className="text-muted-foreground">이미 계정이 있으신가요?</span>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
        </div>

        <Button variant="outline" size="lg" className="mt-5 h-11 w-full text-[15px]" asChild>
          <Link href="/">
            <Store />
            로그인 없이 서비스 둘러보기
          </Link>
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          고객센터 {BRAND.support.phone} · {BRAND.support.email}
        </p>
      </div>
    </div>
  );
}
