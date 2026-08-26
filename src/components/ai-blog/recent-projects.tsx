"use client";

import { FileText, Images, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/lib/ai-blog/options";
import type { AiBlogProject } from "@/lib/ai-blog/types";
import { formatDateTime } from "@/lib/format";

/**
 * 최근 제작한 콘텐츠 — 로그인한 광고주에게만 보여준다.
 * 항목을 누르면 저장된 원고·이미지를 그대로 불러와 이어서 작업할 수 있다.
 */
export function RecentProjects({
  projects,
  onOpen,
  onRemove,
}: {
  projects: AiBlogProject[];
  onOpen: (project: AiBlogProject) => void;
  onRemove: (id: string) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-[15px] font-bold">최근 제작한 콘텐츠</h2>
        <span className="num text-[13px] text-muted-foreground">{projects.length}건</span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 6).map((project) => {
          const title = project.editedArticle?.title || project.generatedArticle?.title || project.topic;
          return (
            <li key={project.id} className="relative flex">
              <button
                type="button"
                onClick={() => onOpen(project)}
                className="flex w-full flex-col gap-1.5 rounded-xl border border-border p-3.5 pr-10 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <span className="text-[11px] text-muted-foreground">
                  {categoryLabel(project.category)}
                </span>
                <span className="line-clamp-2 text-[13px] font-semibold">{title}</span>
                <span className="num mt-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3" />
                    {project.editedArticle ? "원고 있음" : "작성 전"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Images className="size-3" />
                    {project.images.length}장
                  </span>
                  <span>{formatDateTime(project.updatedAt)}</span>
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="삭제"
                className="absolute top-2 right-2 size-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(project.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
