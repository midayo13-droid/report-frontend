"use client";
// 토스 차트 규칙: 축 선과 구분선이 없고, 강조할 막대(가장 최근)만 파랑, 나머지는 회색. 축은 하나만 써요.
// 그래프는 화면 폭에 맞춰 실제 크기로 그려서, 휴대폰에서도 글자가 작아지지 않아요.
import { useEffect, useRef, useState } from "react";
import { man, num } from "@/lib/format";

const BLUE = "#3182f6";
const G200 = "#e5e8eb";
const G400 = "#b0b8c1";
const G500 = "#8b95a1";
const G900 = "#191f28";
export const SHARE_COLORS = [BLUE, G500, G400, G200];

function topRound(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** 칸 폭을 알아내서 그래프를 그 폭에 맞춰요. */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(470);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(220, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** 칸이 좁으면 라벨을 줄여요. 11/03(화) → 3(화) → 화 */
function shortLabel(label: string, slot: number): string {
  const m = label.match(/^(\d{2})\/(\d{2})\((.)\)$/);
  if (!m) return label;
  if (slot >= 58) return label;
  if (slot >= 36) return `${Number(m[2])}(${m[3]})`;
  return m[3];
}

export interface SeriesPoint { label: string; sales: number; adCost: number }

export function BarPairs({ series, mode = "bar", height = 170 }: { series: SeriesPoint[]; mode?: "bar" | "line"; height?: number }) {
  const [ref, W] = useWidth();
  const n = series.length;
  const gw = W / n;
  const base = height - 28;
  const max = Math.max(1, ...series.map((s) => s.sales));
  const k = (base - 26) / max;
  const last = series[n - 1];
  const bw = Math.max(6, Math.min(22, gw * 0.3));
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label={`매출과 광고비 그래프. 가장 최근 매출은 ${man(last?.sales)}이에요.`} style={{ display: "block", maxWidth: "100%" }}>
        {mode === "bar" ? (
          series.map((s, i) => {
            const cx = i * gw + gw / 2;
            const h1 = Math.max(2, s.sales * k);
            const h2 = Math.max(2, s.adCost * k);
            return (
              <g key={i}>
                <path d={topRound(cx - bw - 1, base - h1, bw, h1, 4)} fill={i === n - 1 ? BLUE : G200} />
                <path d={topRound(cx + 1, base - h2, bw, h2, 4)} fill={G400} />
              </g>
            );
          })
        ) : (
          <g fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
            <polyline stroke={G400} points={series.map((s, i) => `${i * gw + gw / 2},${base - s.adCost * k}`).join(" ")} />
            <polyline stroke={BLUE} points={series.map((s, i) => `${i * gw + gw / 2},${base - s.sales * k}`).join(" ")} />
            <circle cx={(n - 1) * gw + gw / 2} cy={base - last.sales * k} r="4.5" fill={BLUE} stroke="#fff" strokeWidth="2" />
          </g>
        )}
        {series.map((s, i) => (
          <text key={i} x={i * gw + gw / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={i === n - 1 ? G900 : G500} fontWeight={i === n - 1 ? 600 : 500}>
            {shortLabel(s.label, gw)}
          </text>
        ))}
        {last ? (
          <text x={Math.min(W - 18, (n - 1) * gw + gw / 2)} y={Math.max(14, base - last.sales * k - 8)} textAnchor="middle" fontSize="12" fontWeight="700" fill={BLUE}>
            {num(Math.round(last.sales / 10000))}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

export function TrendLine({ points, unit = "", mode = "line", height = 150, lowLine }: { points: { label: string; value: number }[]; unit?: string; mode?: "line" | "bar"; height?: number; lowLine?: number | null }) {
  const [ref, W] = useWidth();
  const n = points.length;
  if (!n) return null;
  const gw = W / n;
  const base = height - 28;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals, lowLine ?? Infinity) * 0.85;
  const hi = Math.max(...vals, lowLine ?? 0) * 1.08 || 1;
  const y = (v: number) => base - ((v - lo) / Math.max(hi - lo, 0.0001)) * (base - 30);
  const last = points[n - 1];
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label={`추이 그래프. 가장 최근 값은 ${last.value}${unit}이에요.`} style={{ display: "block", maxWidth: "100%" }}>
        {lowLine != null ? <line x1="0" x2={W} y1={y(lowLine)} y2={y(lowLine)} stroke={G200} strokeDasharray="4 4" /> : null}
        {mode === "line" ? (
          <g fill="none" strokeLinejoin="round" strokeLinecap="round">
            <polyline stroke={BLUE} strokeWidth="2.4" points={points.map((p, i) => `${i * gw + gw / 2},${y(p.value)}`).join(" ")} />
            <circle cx={(n - 1) * gw + gw / 2} cy={y(last.value)} r="4.5" fill={BLUE} stroke="#fff" strokeWidth="2" />
          </g>
        ) : (
          points.map((p, i) => {
            const bw = Math.min(30, gw * 0.5);
            const h = Math.max(3, base - y(p.value));
            return <path key={i} d={topRound(i * gw + gw / 2 - bw / 2, base - h, bw, h, 4)} fill={i === n - 1 ? BLUE : G200} />;
          })
        )}
        <text x={Math.min(W - 22, (n - 1) * gw + gw / 2)} y={Math.max(14, y(last.value) - 10)} textAnchor="middle" fontSize="12" fontWeight="700" fill={BLUE}>
          {last.value}
          {unit}
        </text>
        {points.map((p, i) => (
          <text key={i} x={i * gw + gw / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={i === n - 1 ? G900 : G500} fontWeight={i === n - 1 ? 600 : 500}>
            {shortLabel(p.label, gw)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function Donut({ items }: { items: { name: string; share: number; amount: number }[] }) {
  const size = 120;
  const r = 46;
  const rin = 29;
  const c = size / 2;
  const total = items.reduce((a, b) => a + b.share, 0) || 1;
  let a0 = -Math.PI / 2;
  const p = (rad: number, a: number) => `${c + rad * Math.cos(a)},${c + rad * Math.sin(a)}`;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="124" height="124" role="img" aria-label={`판매처별 매출 비중. ${items.map((i) => `${i.name} ${i.share}%`).join(", ")}`} style={{ flex: "none" }}>
        {items.map((it, i) => {
          const a1 = a0 + (it.share / total) * Math.PI * 2;
          const big = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M ${p(r, a0)} A ${r} ${r} 0 ${big} 1 ${p(r, a1)} L ${p(rin, a1)} A ${rin} ${rin} 0 ${big} 0 ${p(rin, a0)} Z`;
          a0 = a1;
          return <path key={i} d={d} fill={SHARE_COLORS[i % SHARE_COLORS.length]} stroke="#fff" strokeWidth="1.5" />;
        })}
      </svg>
      <div style={{ flex: "1 1 150px", minWidth: 0 }}>
        {items.map((it, i) => (
          <div key={i} className="spread" style={{ padding: "3px 0", fontSize: 14 }}>
            <span className="row" style={{ gap: 8 }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: SHARE_COLORS[i % SHARE_COLORS.length], display: "inline-block" }} />
              {it.name}
            </span>
            <span className="n bold">{it.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShareBars({ items }: { items: { name: string; share: number }[] }) {
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ padding: "7px 0" }}>
          <div className="spread" style={{ fontSize: 14, marginBottom: 6 }}>
            <span>{it.name}</span>
            <span className="n bold">{it.share}%</span>
          </div>
          <div className="pbar"><i className={i === 0 ? "" : "grey"} style={{ width: `${Math.max(2, it.share)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function HBars({ items, scale = 10000 }: { items: { name: string; amount: number }[]; scale?: number }) {
  const max = Math.max(1, ...items.map((i) => i.amount));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="row" style={{ gap: 10, padding: "4px 0", fontSize: 13 }}>
          <span style={{ width: 108, flex: "none", color: "var(--g700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.name}>
            {it.name}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", height: 9, width: `${Math.max(2, (it.amount / max) * 100)}%`, borderRadius: "0 5px 5px 0", background: i === 0 ? BLUE : G200 }} />
          </span>
          <span className="n" style={{ width: 48, flex: "none", textAlign: "right", fontWeight: i === 0 ? 700 : 500 }}>
            {num(Math.round(it.amount / scale))}
          </span>
        </div>
      ))}
    </div>
  );
}
