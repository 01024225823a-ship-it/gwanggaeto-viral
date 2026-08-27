import { buildScene } from "@/lib/ai-blog/render/layout";
import { SceneExportError, sceneToBlob } from "@/lib/ai-blog/render/export";
import { imageTypeLabel } from "@/lib/ai-blog/options";
import type { AiBlogImageAsset, AiBlogImageType } from "@/lib/ai-blog/types";

/**
 * 이미지 다운로드.
 *
 * 화면에 보이는 것과 같은 장면을 출력 해상도로 다시 그려 PNG 로 저장한다.
 * (원본 그래픽 URL 만 내려받으면 웹에서 얹은 한글 텍스트가 빠지므로 그렇게 하지 않는다)
 *
 * ⚠ safeFileName 만 현재 경로에서 계속 쓴다 (render/info-download.ts 가 재사용).
 *   AiBlogImageAsset 을 다루는 나머지 함수는 [LEGACY] 비주얼 파이프라인 전용이며,
 *   AI 블로그 기본 이미지 제작 경로에서는 호출하지 않는다.
 */

/** 파일명에 쓸 수 없는 문자를 걷어낸다 (Windows 기준) */
export function safeFileName(value: string): string {
  return value
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 60);
}

const TYPE_FILE_LABEL: Record<AiBlogImageType, string> = {
  thumbnail: "대표이미지",
  article: "본문이미지",
  infographic: "인포그래픽",
  cardnews: "카드뉴스",
};

/** 관절영양제가_필요한_이유_본문이미지_01.png */
export function assetFileName(asset: AiBlogImageAsset, topic: string, order?: number): string {
  const base = safeFileName(topic) || "AI블로그";
  const label = TYPE_FILE_LABEL[asset.type] ?? "이미지";
  const seq = order ?? (asset.type === "cardnews" ? asset.index : undefined);
  const suffix = seq === undefined ? "" : `_${String(seq).padStart(2, "0")}`;
  return `${base}_${label}${suffix}.png`;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 브라우저가 저장을 시작할 시간을 준 뒤 해제한다
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 자산 1장을 PNG 로 만든다 */
export async function renderAssetBlob(asset: AiBlogImageAsset): Promise<Blob> {
  // 생성에 실패한 비주얼은 placeholder 로 대신 내보내지 않는다
  if (asset.status === "FAILED") {
    throw new SceneExportError(
      asset.error ?? "비주얼 생성에 실패했습니다. 다시 만들기를 눌러주세요.",
    );
  }
  return sceneToBlob(buildScene(asset), asset.mimeType ?? "image/png");
}

/** 이미지 1장 다운로드 */
export async function downloadAsset(
  asset: AiBlogImageAsset,
  topic: string,
  order?: number,
): Promise<void> {
  const blob = await renderAssetBlob(asset);
  triggerDownload(blob, assetFileName(asset, topic, order));
}

/* ------------------------------------------------------------------ */
/* 여러 장 — ZIP                                                        */
/* ------------------------------------------------------------------ */

export interface DownloadProgress {
  done: number;
  total: number;
}

/** ZIP 안에서 순서가 보이도록 앞에 번호를 붙인다 */
function zipEntryName(asset: AiBlogImageAsset, index: number, perTypeOrder: number): string {
  const label = TYPE_FILE_LABEL[asset.type] ?? "이미지";
  const seq = String(index + 1).padStart(2, "0");
  const inner = asset.type === "thumbnail" ? "" : `_${String(perTypeOrder).padStart(2, "0")}`;
  return `${seq}_${label}${inner}.png`;
}

export class ZipDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipDownloadError";
  }
}

/**
 * 여러 이미지를 ZIP 으로 묶어 다운로드한다.
 * 한 장이 실패해도 나머지는 계속 담고, 전부 실패했을 때만 오류를 던진다.
 */
export async function downloadAssetsAsZip(
  assets: AiBlogImageAsset[],
  topic: string,
  options: { zipLabel?: string; onProgress?: (progress: DownloadProgress) => void } = {},
): Promise<{ saved: number; failed: number }> {
  if (assets.length === 0) throw new ZipDownloadError("내보낼 이미지가 없습니다.");

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const perType = new Map<AiBlogImageType, number>();
  let failed = 0;
  let saved = 0;

  for (const [index, asset] of assets.entries()) {
    const order = (perType.get(asset.type) ?? 0) + 1;
    perType.set(asset.type, order);

    try {
      const blob = await renderAssetBlob(asset);
      zip.file(zipEntryName(asset, index, order), blob);
      saved += 1;
    } catch {
      failed += 1;
    }
    options.onProgress?.({ done: index + 1, total: assets.length });
  }

  if (saved === 0) {
    throw new ZipDownloadError("이미지를 만들지 못해 압축 파일을 만들 수 없습니다.");
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const base = safeFileName(topic) || "AI블로그";
  const label = options.zipLabel ? `_${safeFileName(options.zipLabel)}` : "";
  triggerDownload(blob, `${base}${label}_이미지.zip`);

  return { saved, failed };
}

export { SceneExportError };

/** 유형별 묶음 다운로드용 라벨 */
export function typeZipLabel(type: AiBlogImageType): string {
  return imageTypeLabel(type) || TYPE_FILE_LABEL[type];
}
