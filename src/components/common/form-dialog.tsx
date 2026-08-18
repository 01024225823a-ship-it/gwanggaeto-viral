"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

/**
 * 등록/수정 폼 모달 공통 껍데기.
 *
 * 폼 상태는 모달이 열릴 때마다 새로 만들어지는 내부 컴포넌트가 소유하므로,
 * 닫았다 다시 열면 항상 initial() 기준으로 초기화된다.
 */
export function FormDialog<T>({
  trigger,
  title,
  description,
  submitLabel = "저장",
  initial,
  onSubmit,
  children,
  className,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  submitLabel?: string;
  /** 폼 초기값 */
  initial: () => T;
  /** 검증 실패 시 에러 메시지를 반환하면 모달이 닫히지 않는다 */
  onSubmit: (value: T) => string | void;
  children: (value: T, patch: (next: Partial<T>) => void) => React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <FormBody
          initial={initial}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          close={() => setOpen(false)}
        >
          {children}
        </FormBody>
      </DialogContent>
    </Dialog>
  );
}

function FormBody<T>({
  initial,
  onSubmit,
  submitLabel,
  close,
  children,
}: {
  initial: () => T;
  onSubmit: (value: T) => string | void;
  submitLabel: string;
  close: () => void;
  children: (value: T, patch: (next: Partial<T>) => void) => React.ReactNode;
}) {
  const [value, setValue] = useState<T>(initial);

  function handleSubmit() {
    const error = onSubmit(value);
    if (typeof error === "string") {
      toast.error(error);
      return;
    }
    close();
  }

  return (
    <>
      <div className="scrollbar-thin flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
        {children(value, (next) => setValue((prev) => ({ ...prev, ...next })))}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" size="lg">
            취소
          </Button>
        </DialogClose>
        <Button size="lg" onClick={handleSubmit}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
