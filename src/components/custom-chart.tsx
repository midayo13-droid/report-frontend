"use client";
// "그래프 추가"로 만든 그래프를 그려요. 숫자는 서버가 이미 계산해서 보내 줘요.
import { num } from "@/lib/format";
import { Donut, HBars, TrendLine } from "@/components/charts";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CustomChartData {
  title: string;
  metricLabel: string;
  unit: string;
  scale: number;
  groupLabel: string;
  shape: string;
  note?: string;
  points: { label: string; value: number; share?: number }[];
  others: number;
  total: number;
}

export function CustomChartCard({ cc, bare = false }: { cc: CustomChartData; bare?: boolean }) {
  const show = (v: number) => num(cc.scale > 1 ? Math.round(v / cc.scale) : v);
  const empty = !cc.points.length || cc.total <= 0;
  const body = empty ? (
    <div className="cap">이 기간에는 보여 줄 숫자가 없어요.</div>
  ) : cc.shape === "donut" ? (
    <Donut
      items={[
        ...cc.points.map((p) => ({ name: p.label, share: p.share ?? 0, amount: p.value })),
        ...(cc.others > 0 ? [{ name: "기타", share: Math.round((cc.others / cc.total) * 1000) / 10, amount: cc.others }] : []),
      ]}
    />
  ) : cc.shape === "hbar" ? (
    <HBars items={cc.points.map((p) => ({ name: p.label, amount: p.value }))} scale={cc.scale} />
  ) : cc.shape === "table" ? (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr><th>순위</th><th>{cc.groupLabel}</th><th style={{ textAlign: "right" }}>{cc.metricLabel}({cc.unit})</th><th style={{ textAlign: "right" }}>비중</th></tr>
        </thead>
        <tbody>
          {cc.points.map((p, i) => (
            <tr key={p.label}><td className="n">{i + 1}</td><td>{p.label}</td><td className="n" style={{ textAlign: "right" }}>{show(p.value)}</td><td className="n" style={{ textAlign: "right" }}>{p.share ?? 0}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <TrendLine
      points={cc.points.map((p) => ({ label: p.label, value: Math.round((p.value / cc.scale) * 10) / 10 }))}
      unit=""
      mode={cc.shape === "vbar" ? "bar" : "line"}
    />
  );
  if (bare) return <>{body}</>;
  return (
    <section className="card">
      <div className="sec-title">
        <h2 className="t1">{cc.title}</h2>
        <span className="cap">{cc.note ? `${cc.note} · ` : ""}{cc.unit}</span>
      </div>
      {body}
    </section>
  );
}
