import { SceneExportError, sceneToBlob } from "@/lib/ai-blog/render/export";
import { buildInfoScene } from "@/lib/ai-blog/render/info-layout";
import { safeFileName } from "@/lib/ai-blog/render/download";
import type { InfoVisualImage } from "@/lib/ai-blog/types";

/**
 * 정보 이미지 다운로드.
 *
 * 화면 미리보기(SVG)와 같은 장면을 실제 출력 해상도로 캔버스에 다시 그려 PNG 로 저장한다.
 * 한글은 브라우저 폰트로 그리므로 글자가 깨지지 않는다.
 *
 * 파일명 처리(safeFileName)와 ZIP 묶음, 진행률 표시는 기존 다운로드 구조를 그대로 쓴다.
 */

export interface InfoDownloadProgress {
  done: number;
  total: number;
}

export class InfoZipDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InfoZipDownloadError";
  }
}

/** 대표 이미지는 제목 대신 고정 라벨을 쓴다 */
function fileLabel(image: InfoVisualImage, index: number): string {
  if (image.plan.type === "thumbnail") return "대표이미지";
  return safeFileName(image.plan.title) || `정보이미지_${String(index + 1).padStart(2, "0")}`;
}

/** 관절영양제가_필요한_이유_관절영양제_선택기준.png */
export function infoImageFileName(image: InfoVisualImage, topic: string, index = 0): string {
  const base = safeFileName(topic) || "AI블로그";
  return `${base}_${fileLabel(image, index)}.png`;
}

/** ZIP 안에서 순서가 보이도록 앞에 번호를 붙인다 — 01_대표이미지.png */
function zipEntryName(image: InfoVisualImage, index: number): string {
  return `${String(index + 1).padStart(2, "0")}_${fileLabel(image, index)}.png`;
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

/** 이미지 1장을 PNG 로 만든다 */
export function renderInfoImageBlob(image: InfoVisualImage): Promise<Blob> {
  return sceneToBlob(buildInfoScene(image), image.mimeType);
}

/** 이미지 1장 다운로드 */
export async function downloadInfoImage(
  image: InfoVisualImage,
  topic: string,
  index = 0,
): Promise<void> {
  const blob = await renderInfoImageBlob(image);
  triggerDownload(blob, infoImageFileName(image, topic, index));
}

/**
 * 전체 이미지를 ZIP 으로 묶어 다운로드한다.
 * 한 장이 실패해도 나머지는 계속 담고, 전부 실패했을 때만 오류를 던진다.
 */
export async function downloadInfoImagesAsZip(
  images: InfoVisualImage[],
  topic: string,
  options: { onProgress?: (progress: InfoDownloadProgress) => void } = {},
): Promise<{ saved: number; failed: number }> {
  if (images.length === 0) throw new InfoZipDownloadError("내보낼 이미지가 없습니다.");

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  let saved = 0;
  let failed = 0;

  for (const [index, image] of images.entries()) {
    try {
      zip.file(zipEntryName(image, index), await renderInfoImageBlob(image));
      saved += 1;
    } catch {
      failed += 1;
    }
    options.onProgress?.({ done: index + 1, total: images.length });
  }

  if (saved === 0) {
    throw new InfoZipDownloadError("이미지를 만들지 못해 압축 파일을 만들 수 없습니다.");
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${safeFileName(topic) || "AI블로그"}_이미지.zip`);

  return { saved, failed };
}

export { SceneExportError, safeFileName };
