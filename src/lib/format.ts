export const won = (n: number | null | undefined) => (n == null ? "-" : `${Math.round(n).toLocaleString("ko-KR")}원`);
export const man = (n: number | null | undefined) => (n == null ? "-" : `${Math.round(n / 10000).toLocaleString("ko-KR")}만원`);
export const num = (n: number | null | undefined) => (n == null ? "-" : Math.round(n).toLocaleString("ko-KR"));

/** +12.3% / −0.4%p 처럼 부호를 붙여요. 없으면 "-" */
export function signed(d: number | null | undefined, suffix = "%"): string {
  if (d == null) return "-";
  if (d === 0) return `0${suffix}`;
  return `${d > 0 ? "+" : "−"}${Math.abs(d)}${suffix}`;
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function parts(d: string): [number, number, number, number] {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return [y, m, day, new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
}
export const dateKo = (d: string) => {
  const [y, m, day, w] = parts(d);
  return `${y}년 ${m}월 ${day}일 ${WEEK[w]}요일`;
};
export const dateShort = (d: string) => {
  const [, m, day, w] = parts(d);
  return `${m}월 ${day}일 (${WEEK[w]})`;
};
export const md = (d: string) => {
  const [, m, day] = parts(d);
  return `${m}/${day}`;
};

/** 2026-11-10T00:38:00.000Z → "11/10 09:38" (한국 시간) */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(k.getUTCMonth() + 1)}/${p(k.getUTCDate())} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
}

export const REPORT_TYPE_LABEL: Record<string, string> = { daily: "일일", weekly: "주간", monthly: "월말" };
export const STATUS_LABEL: Record<string, string> = { pending: "승인 대기", published: "승인됨", rejected: "반려됨" };
export const STATUS_TONE: Record<string, string> = { pending: "orange", published: "green", rejected: "red" };
export const METRIC_LABEL: Record<string, string> = { sales: "매출", adCost: "광고비", adEfficiency: "광고 효율", orders: "주문", cancelRate: "취소율", general: "전체", orders_: "주문" };
export const metricName = (k: string) => (k.startsWith("stock:") ? "재고" : METRIC_LABEL[k] ?? k);

export const ACTION_LABEL: Record<string, string> = {
  "auth.login": "로그인",
  "auth.demo_login": "시연 로그인",
  "auth.login_failed": "로그인 실패",
  "report.generate": "보고서 만들기",
  "report.publish": "보고서 승인·공개",
  "report.reject": "보고서 반려",
  "report.summary": "요약 고침",
  "report.download": "PDF 내려받기",
  "note.add": "사유 메모 작성",
  "note.delete": "사유 메모 삭제",
  "criteria.propose": "기준 수정안 작성",
  "criteria.propose_approve": "기준 수정안 작성·승인",
  "criteria.approve": "기준 수정안 승인",
  "criteria.reject": "기준 수정안 반려",
  "template.update": "양식 고침",
  "template.ai": "양식 고침(AI 제안)",
  "template.rollback": "양식 되돌리기",
  "template.upload": "양식 설정 파일 올림",
  "collect.run": "수집 실행",
  "collect.retry": "수집 재시도",
  "collect.stock": "재고 수집",
  "connection.update": "연결 키 등록·교체",
  "user.create": "계정 만들기",
  "user.update": "계정 고침",
  "ai.template_change": "AI 양식 변경안",
  "ai.cause_candidates": "AI 원인 후보",
  "ai.stock_suggestion": "AI 재고 제안",
  "ai.summary": "AI 요약 초안",
  "ai.apply": "AI 제안 적용",
  "ai.ignore": "AI 제안 무시",
  "demo.reset": "가상 데이터 처음으로",
};
