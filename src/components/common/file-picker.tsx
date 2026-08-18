"use client";

import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AttachedFile } from "@/lib/domain/types";
import { formatFileSize } from "@/lib/format";

/**
 * 파일 첨부 UI.
 *
 * 프로토타입 단계에서는 실제 업로드를 하지 않고 파일의 메타데이터(이름/크기)만 보관한다.
 * 향후 스토리지가 붙으면 onChange 시점에 업로드하고 URL을 함께 저장하면 된다.
 */
export function FilePicker({
  value,
  onChange,
  label = "파일 첨부",
  hint,
  disabled,
}: {
  value: AttachedFile[];
  onChange: (files: AttachedFile[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(fileList: FileList | null) {
    if (!fileList?.length) return;
    const uploadedAt = new Date().toISOString();
    const added: AttachedFile[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      uploadedAt,
    }));
    onChange([...value, ...added]);
    // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 초기화
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleSelect(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip />
          {label}
        </Button>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>

      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {value.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-sm"
            >
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="num shrink-0 text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`${file.name} 삭제`}
                onClick={() => onChange(value.filter((f) => f.id !== file.id))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 읽기 전용 첨부파일 목록 (주문 상세/검수 화면) */
export function FileList({ files }: { files: AttachedFile[] }) {
  if (!files.length) return <p className="text-sm text-muted-foreground">첨부파일 없음</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {files.map((file) => (
        <li key={file.id} className="flex items-center gap-2 text-sm">
          <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="num shrink-0 text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
        </li>
      ))}
    </ul>
  );
}
