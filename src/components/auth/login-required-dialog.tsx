"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * 비로그인 사용자가 로그인이 필요한 동작(주문 등)을 눌렀을 때 보여주는 안내 모달.
 * 로그인 후 원래 하려던 화면으로 돌아오도록 redirect 파라미터를 함께 넘긴다.
 */
export function LoginRequiredDialog({
  trigger,
  redirectTo,
  title = "로그인이 필요한 서비스입니다",
  description = "주문을 진행하려면 로그인해 주세요.",
}: {
  trigger: React.ReactNode;
  /** 로그인 후 이동할 경로 */
  redirectTo: string;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">
              취소
            </Button>
          </DialogClose>
          <Button
            size="lg"
            onClick={() => {
              setOpen(false);
              router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
            }}
          >
            <LogIn />
            로그인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
