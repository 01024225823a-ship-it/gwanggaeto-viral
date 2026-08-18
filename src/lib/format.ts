import { BRAND } from "@/config/brand";

const numberFormat = new Intl.NumberFormat("ko-KR");

/** 1,250,000 */
export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value));
}

/** 1,250,000원 */
export function formatWon(value: number): string {
  return `${formatNumber(value)}원`;
}

/** 1,250,000 P */
export function formatPoint(value: number, opts?: { space?: boolean }): string {
  const space = opts?.space === false ? "" : " ";
  return `${formatNumber(value)}${space}${BRAND.point.unit}`;
}

/** 원 → 포인트 환산 (현재 1:1) */
export function wonToPoint(won: number): number {
  return Math.round(won * BRAND.point.ratio);
}

/** 12.5% */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** ISO 문자열 → 2026.08.13 */
export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** ISO 문자열 → 2026.08.13 14:30 */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 기준일로부터 남은 일수 (음수면 초과) */
export function daysLeft(iso?: string | null, from: Date = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const b = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a - b) / 86_400_000);
}

/** D-3 / D-DAY / D+2 */
export function formatDday(iso?: string | null): string {
  const left = daysLeft(iso);
  if (left === null) return "-";
  if (left === 0) return "D-DAY";
  return left > 0 ? `D-${left}` : `D+${Math.abs(left)}`;
}

/** ISO → 2026-08-13 (input[type=date] 바인딩용) */
export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 2026-08-13 → ISO (마감 기준이므로 해당일 18:00으로 맞춘다) */
export function fromDateInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T18:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** 바이트 → 1.2MB */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 화면 표시용 URL 축약 */
export function shortenUrl(url: string, max = 48): string {
  const trimmed = url.replace(/^https?:\/\//, "");
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
