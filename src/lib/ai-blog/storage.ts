"use client";

import { useSyncExternalStore } from "react";
import type { AiBlogInput, AiBlogProject } from "@/lib/ai-blog/types";

/**
 * AI 블로그 콘텐츠 작업물 저장소 (localStorage).
 *
 * 향후 서버 DB로 옮길 때 이 파일의 함수 시그니처만 유지하면 되도록
 * 화면에서는 직접 localStorage를 만지지 않는다.
 *
 * useEffect + setState 대신 useSyncExternalStore를 쓴다.
 * (서버 렌더/최초 하이드레이션에서는 항상 빈 배열을 돌려주므로 불일치가 생기지 않는다)
 */

const STORAGE_KEY = "gkt.aiblog.v1";

/** 데모 환경에서 저장 용량이 넘치지 않도록 최근 작업물만 보관한다 */
const MAX_PROJECTS = 20;

const EMPTY: AiBlogProject[] = [];

let cache: AiBlogProject[] | null = null;
const listeners = new Set<() => void>();

function read(): AiBlogProject[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as AiBlogProject[];
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    /* 저장 데이터가 손상된 경우 빈 목록으로 복구 */
    return EMPTY;
  }
}

function write(next: AiBlogProject[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 저장 용량 초과 등은 데모에서 무시 */
  }
  for (const listener of listeners) listener();
}

function snapshot(): AiBlogProject[] {
  cache ??= read();
  return cache;
}

function serverSnapshot(): AiBlogProject[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* 조회 · 저장                                                          */
/* ------------------------------------------------------------------ */

/** 최근 수정순 작업물 목록 (userId를 주면 해당 사용자 것만) */
export function useAiBlogProjects(userId?: string): AiBlogProject[] {
  const all = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const rows = userId ? all.filter((p) => p.userId === userId) : all;
  return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function findAiBlogProject(id: string): AiBlogProject | undefined {
  return snapshot().find((p) => p.id === id);
}

/** 같은 id가 있으면 교체, 없으면 추가 */
export function saveAiBlogProject(project: AiBlogProject): void {
  const prev = snapshot();
  const next = prev.some((p) => p.id === project.id)
    ? prev.map((p) => (p.id === project.id ? project : p))
    : [project, ...prev];
  write(
    [...next]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_PROJECTS),
  );
}

export function removeAiBlogProject(id: string): void {
  write(snapshot().filter((p) => p.id !== id));
}

/* ------------------------------------------------------------------ */
/* 생성                                                                 */
/* ------------------------------------------------------------------ */

export function createProjectId(): string {
  return `aib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** STEP 1 입력으로 새 작업물을 만든다 (아직 저장하지는 않는다) */
export function createAiBlogProject(input: AiBlogInput, userId?: string): AiBlogProject {
  const at = new Date().toISOString();
  return {
    ...input,
    id: createProjectId(),
    userId,
    imageTypes: [],
    imageStyle: "clean",
    thumbnailRatio: "1:1",
    cardCount: 6,
    imagePrompts: [],
    images: [],
    createdAt: at,
    updatedAt: at,
  };
}
