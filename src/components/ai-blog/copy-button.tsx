"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** 클립보드 복사 — 지원하지 않는 환경에서는 안내만 띄운다 */
export async function copyText(text: string, label = "복사했습니다."): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("복사에 실패했습니다. 내용을 직접 선택해 복사해 주세요.");
  }
}

export function CopyButton({
  text,
  label = "전체 복사",
  toastLabel,
  variant = "outline",
  size = "default",
  className,
}: {
  text: string;
  label?: string;
  toastLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => copyText(text, toastLabel)}
    >
      <Copy className="size-4" />
      {label}
    </Button>
  );
}
