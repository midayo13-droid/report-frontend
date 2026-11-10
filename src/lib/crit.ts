import { man } from "@/lib/format";

/** 내일 날짜(한국 시간). 승인한 기준은 항상 내일부터 적용돼요. */
export function tomorrowKst(): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + 86400000);
  return d.toISOString().slice(0, 10);
}

export function critValue(c: { code: string; unit: string }, v: string | number | null | undefined) {
  if (v == null) return "-";
  const n = Number(v);
  if (c.code === "monthly_target") return man(n);
  return `${n.toLocaleString("ko-KR")}${c.unit}`;
}
