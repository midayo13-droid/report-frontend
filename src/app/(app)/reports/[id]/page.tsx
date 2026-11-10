"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api, ApiError, download } from "@/lib/api";
import { dateKo, dateTime, man, metricName, num, signed, won, REPORT_TYPE_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/format";
import { useAuth, useToast } from "@/components/providers";
import { Badge, Button, Delta, Dialog, Empty, Field, Icon, Loading } from "@/components/ui";
import { BarPairs, Donut, HBars, ShareBars, TrendLine } from "@/components/charts";
import { CustomChartCard } from "@/components/custom-chart";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COMPARE: Record<string, string> = { daily: "전일", weekly: "전주", monthly: "전월" };
const NOTE_METRICS = ["general", "sales", "orders", "adCost", "adEfficiency", "cancelRate"];

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  // 요약
  const [sumEdit, setSumEdit] = useState(false);
  const [sumText, setSumText] = useState("");
  const [sumAi, setSumAi] = useState<any>(null);
  // 확인 메모
  const [noteText, setNoteText] = useState("");
  const [noteMetric, setNoteMetric] = useState("general");
  const [aiNote, setAiNote] = useState<any>(null);
  const [usedAiId, setUsedAiId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setR(await api(`/reports/${id}`));
      setErr("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "보고서를 불러오지 못했어요.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : "문제가 생겼어요.", "err");
  async function act(name: string, fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(name);
    try {
      await fn();
      if (okMsg) toast(okMsg);
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }

  if (err) return <div className="card"><Empty title="보고서를 열 수 없어요">{err}</Empty><div className="row" style={{ justifyContent: "center" }}><Button onClick={() => router.push("/reports")}>목록으로</Button></div></div>;
  if (!r || !user) return <Loading />;

  const snap = r.snapshot;
  const cfg = r.template?.config ?? { title: `모아뷰티 ${r.typeLabel}`, footer: "", sections: [] };
  const isAdmin = user.role === "admin";
  const canAi = user.role === "user" || isAdmin;
  const canEdit = r.canEdit && canAi;
  const cmp = COMPARE[r.type];
  const aiStock = new Map<number, string>((r.aiStock?.items ?? []).map((x: any) => [x.productId, x.sentence]));

  /* ---------- 섹션 ---------- */
  function renderKpis(sec: any) {
    const k = snap.kpis;
    const defs: Record<string, { label: string; val: string; delta: number | null; suffix?: string }> = {
      sales: { label: "매출", val: won(k.sales), delta: k.delta.sales },
      adCost: { label: "광고비", val: won(k.adCost), delta: k.delta.adCost },
      adEfficiency: { label: "광고 효율", val: `${k.adEfficiency}배`, delta: k.delta.adEfficiency },
      orders: { label: "주문", val: `${num(k.orders)}건`, delta: k.delta.orders },
      cancelRate: { label: "취소율", val: `${k.cancelRate}%`, delta: k.delta.cancelRate, suffix: "%p" },
    };
    const items: string[] = sec.items ?? Object.keys(defs);
    const rest = items.filter((i) => i !== "sales");
    return (
      <section className="card card-hero span2">
        {items.includes("sales") ? (
          <>
            <div className="cap">{snap.meta.type === "daily" ? "어제" : snap.meta.type === "weekly" ? "지난주" : "지난달"} 마감 매출</div>
            <div className="hero-amount n">{defs.sales.val}</div>
            <div className="mt8"><Delta value={k.delta.sales} /> <span className="cap">{cmp}보다</span></div>
          </>
        ) : null}
        {rest.length ? (
          <div className={`kpi-grid ${items.includes("sales") ? "mt16" : ""}`}>
            {rest.map((i) => (
              <div key={i} className="kpi">
                <div className="cap">{defs[i].label}</div>
                <div className="t2 n">{defs[i].val}</div>
                <div className="cap"><Delta value={defs[i].delta} suffix={defs[i].suffix ?? "%"} /> {cmp} 대비</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  function renderStock(sec: any) {
    let list = snap.stockAlerts as any[];
    if (sec.filter === "danger") list = list.filter((a) => a.level === "danger");
    list = list.slice(0, sec.limit ?? 10);
    return (
      <section className="card span2">
        <div className="spread mb8">
          <div className="sec-title" style={{ marginBottom: 0 }}>
            <h2 className="t1">재고를 확인해 주세요</h2>
            <span className="cap">위험 {snap.stockSummary.danger} · 주의 {snap.stockSummary.warn}</span>
          </div>
          {canAi ? (
            <Button size="s" disabled={busy === "stock"} onClick={() => act("stock", async () => { await api("/ai/stock-suggestions", { method: "POST", body: { reportId: r.id } }); await load(); }, "재고 제안을 받아 왔어요.")}>
              {busy === "stock" ? "만드는 중" : r.aiStock ? "AI 제안 다시 받기" : "AI 제안 받기"}
            </Button>
          ) : null}
        </div>
        {snap.stockAlerts.length === 0 ? <div className="cap">확인이 필요한 재고가 없어요.</div> : list.length === 0 ? <div className="cap">조건에 맞는 재고가 없어요.</div> : null}
        {list.map((a: any) => (
          <div key={a.productId} className="lr">
            <div className={`av ${a.level === "danger" ? "red" : "orange"}`}><Icon name="box" size={22} /></div>
            <div className="grow">
              <div className="semi">{a.name}</div>
              <div className="cap n">재고 {a.qty}개 · {a.days >= 999 ? "판매 없음" : `${a.days}일치`}{a.suggestOrderQty > 0 ? ` · 권장 발주 ${a.suggestOrderQty}개` : ""}</div>
              {aiStock.get(a.productId) ? (
                <div className="note ai mt8" style={{ fontSize: 14 }}>
                  <b className="up">AI 제안</b> {aiStock.get(a.productId)}
                </div>
              ) : null}
            </div>
            <Badge tone={a.level === "danger" ? "red" : "orange"}>{a.level === "danger" ? "위험" : "주의"}</Badge>
          </div>
        ))}
        {r.aiStock ? <div className="cap-s mt8">{r.aiStock.source === "gpt" ? "GPT가 쓴 문장이에요." : "미리 정해 둔 문장이에요."} 숫자(재고 일수, 권장 발주 수량)는 시스템이 계산했어요.</div> : null}
      </section>
    );
  }

  function renderNotes() {
    return (
      <section className="card span2">
        <h2 className="t1">확인 메모</h2>
        <p className="cap mb12">어제와 달라진 매출, 취소율, 재고 같은 지표의 이유를 적어 두는 곳이에요. 쓴 사람과 시각이 함께 남고, AI가 원인 후보를 찾아 줄 수도 있어요.</p>
        {r.notes.length === 0 ? <div className="cap">남겨진 메모가 없어요.</div> : null}
        {r.notes.map((n: any) => (
          <div key={n.id} className="lr" style={{ alignItems: "flex-start" }}>
            <div className="av blue"><Icon name="chat" size={20} /></div>
            <div className="grow">
              <div className="b2">{n.note}</div>
              <div className="cap mt8">
                {n.author ?? "-"}{n.authorTitle ? ` · ${n.authorTitle}` : ""} · {metricName(n.metricKey)} · {dateTime(n.createdAt)}
                {n.source === "ai_draft" ? " · AI 초안을 고쳐 썼어요" : ""}
              </div>
            </div>
            {canEdit && (n.authorId === user!.id || isAdmin) ? (
              <button className="icon-btn" aria-label="메모 지우기" onClick={() => act("del", async () => { await api(`/reports/${r.id}/notes/${n.id}`, { method: "DELETE" }); await load(); }, "메모를 지웠어요.")}>
                <Icon name="trash" size={18} />
              </button>
            ) : null}
          </div>
        ))}

        {canEdit ? (
          <div className="stack mt16">
            <div className="row-wrap">
              <select className="select" style={{ width: "auto", minHeight: 40 }} value={noteMetric} onChange={(e) => setNoteMetric(e.target.value)} aria-label="어떤 지표에 대한 메모인가요">
                {NOTE_METRICS.map((m) => <option key={m} value={m}>{m === "general" ? "지표: 전체" : `지표: ${metricName(m)}`}</option>)}
              </select>
              <Button size="m" disabled={busy === "cause"} onClick={() => act("cause", async () => setAiNote(await api("/ai/cause-candidates", { method: "POST", body: { reportId: r.id, metricKey: noteMetric } })))}>
                <Icon name="spark" size={16} /> {busy === "cause" ? "찾는 중" : "AI 원인 후보 보기"}
              </Button>
            </div>
            {aiNote ? (
              <div className="note ai stack" style={{ gap: 10 }}>
                <div className="spread">
                  <b className="up">AI 원인 후보 <span className="cap">(확정이 아니에요)</span></b>
                  <button className="icon-btn" aria-label="닫기" onClick={() => setAiNote(null)}>✕</button>
                </div>
                {aiNote.candidates.map((c: any, i: number) => (
                  <div key={i}>
                    <div className="semi">{i + 1}. {c.title}</div>
                    <div className="b2">{c.explanation}</div>
                    {c.evidence.map((e: string, j: number) => <div key={j} className="cap">· 근거: {e}</div>)}
                  </div>
                ))}
                <div className="row-wrap">
                  <Button size="s" variant="secondary" onClick={() => { setNoteText(aiNote.noteDraft); setUsedAiId(aiNote.id); }}>확인 메모 초안을 아래에 넣기</Button>
                  <span className="cap-s">{aiNote.source === "gpt" ? "GPT가 만든 초안이에요." : "미리 정해 둔 규칙으로 만든 초안이에요."} 고쳐서 저장해 주세요.</span>
                </div>
              </div>
            ) : null}
            <textarea className="textarea" placeholder="선택한 지표가 왜 달라졌는지 적어 주세요. (예: 인스타 이벤트로 주문이 늘었어요)" value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={300} />
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <Button variant="secondary" disabled={noteText.trim().length < 2 || busy === "note"} onClick={() => act("note", async () => {
                await api(`/reports/${r.id}/notes`, { method: "POST", body: { note: noteText, metricKey: noteMetric, source: usedAiId ? "ai_draft" : "manual" } });
                if (usedAiId) await api(`/ai/${usedAiId}/used`, { method: "POST" });
                setNoteText(""); setUsedAiId(null); setAiNote(null);
                await load();
              }, "메모를 남겼어요.")}>메모 남기기</Button>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function renderSection(sec: any) {
    if (!sec.enabled) return null;
    if (String(sec.key).startsWith("custom:")) {
      const cc = r.customCharts?.[sec.key];
      return cc ? <CustomChartCard key={sec.key} cc={cc} /> : null;
    }
    switch (sec.key) {
      case "summary":
        return (
          <section key="summary" className="card tint span2">
            <div className="spread mb8">
              <h2 className="t1">요약</h2>
              {canEdit ? (
                <div className="row-wrap">
                  <Button size="s" disabled={busy === "sum"} onClick={() => act("sum", async () => setSumAi(await api("/ai/summary", { method: "POST", body: { reportId: r.id } })))}>
                    <Icon name="spark" size={14} /> {busy === "sum" ? "만드는 중" : "AI 요약 초안"}
                  </Button>
                  <Button size="s" onClick={() => { setSumEdit(true); setSumText(r.summary); }}>고치기</Button>
                </div>
              ) : null}
            </div>
            {sumEdit ? (
              <div className="stack">
                <textarea className="textarea" style={{ background: "#fff" }} value={sumText} onChange={(e) => setSumText(e.target.value)} maxLength={400} />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <Button size="s" variant="ghost" onClick={() => setSumEdit(false)}>취소</Button>
                  <Button size="s" variant="secondary" onClick={() => act("sumsave", async () => { await api(`/reports/${r.id}/summary`, { method: "PATCH", body: { text: sumText } }); setSumEdit(false); await load(); }, "요약을 고쳤어요.")}>저장</Button>
                </div>
              </div>
            ) : (
              <p className="b2" style={{ margin: 0 }}>{r.summary || "요약이 아직 없어요."}</p>
            )}
            {sumAi ? (
              <div className="note ai mt12" style={{ background: "#fff" }}>
                <b className="up">AI 요약 초안</b>
                <p className="b2" style={{ margin: "6px 0 10px" }}>{sumAi.text}</p>
                <div className="row-wrap">
                  <Button size="s" variant="secondary" onClick={() => act("sumuse", async () => { await api(`/reports/${r.id}/summary`, { method: "PATCH", body: { text: sumAi.text } }); await api(`/ai/${sumAi.id}/used`, { method: "POST" }); setSumAi(null); await load(); }, "요약에 반영했어요.")}>요약에 반영하기</Button>
                  <Button size="s" variant="ghost" onClick={() => setSumAi(null)}>닫기</Button>
                  <span className="cap-s">{sumAi.source === "gpt" ? "GPT가 만든 초안이에요." : "미리 정해 둔 문장 틀로 만들었어요."}</span>
                </div>
              </div>
            ) : null}
          </section>
        );
      case "kpis":
        return <Fragment key="kpis">{renderKpis(sec)}</Fragment>;
      case "target_progress":
        return snap.target ? (
          <section key={sec.key} className="card span2">
            <div className="spread mb8"><h2 className="t1">목표 달성률</h2><span className="t1 n up">{snap.target.achievement}%</span></div>
            <div className="pbar"><i style={{ width: `${Math.min(100, snap.target.achievement)}%` }} /></div>
            <div className="cap mt8">월 매출 목표 {man(snap.target.value)} 중 {man(snap.kpis.sales)}</div>
          </section>
        ) : null;
      case "chart_sales_ad":
        return (
          <section key={sec.key} className="card span2">
            <div className="sec-title"><h2 className="t1">매출과 광고비</h2><span className="cap">{r.type === "monthly" ? "주차별" : "최근 7일"} · 만원</span></div>
            <div className="legend mb8"><span><i style={{ background: "var(--blue-500)" }} />매출</span><span><i style={{ background: "var(--g400)" }} />광고비</span></div>
            <BarPairs series={snap.series} mode={sec.chart === "line" ? "line" : "bar"} />
          </section>
        );
      case "chart_channel_share":
        return (
          <section key={sec.key} className="card">
            <h2 className="t1 mb12">판매처별 매출</h2>
            {sec.chart === "bar" ? <ShareBars items={snap.channelShare} /> : <Donut items={snap.channelShare} />}
          </section>
        );
      case "chart_top_products": {
        const top = (snap.topProducts as any[]).slice(0, sec.limit ?? 10);
        return (
          <section key={sec.key} className="card">
            <div className="sec-title"><h2 className="t1">상품 매출 순위</h2><span className="cap">상위 {top.length}개 · 만원</span></div>
            {sec.chart === "table" ? (
              <div className="tbl-wrap">
                <table className="tbl"><thead><tr><th>순위</th><th>상품</th><th style={{ textAlign: "right" }}>매출</th><th style={{ textAlign: "right" }}>수량</th></tr></thead>
                  <tbody>{top.map((p, i) => <tr key={p.productId}><td className="n">{i + 1}</td><td>{p.name}</td><td className="n" style={{ textAlign: "right" }}>{won(p.amount)}</td><td className="n" style={{ textAlign: "right" }}>{num(p.quantity)}개</td></tr>)}</tbody></table>
              </div>
            ) : <HBars items={top} />}
          </section>
        );
      }
      case "chart_product_movers": {
        const mv = snap.productMovers;
        if (!mv) return null;
        const lim = sec.limit ?? 3;
        const vs = r.type === "daily" ? "전일 대비" : r.type === "weekly" ? "지난주 대비" : "지난달 대비";
        const row = (p: any, up: boolean) => (
          <div key={p.productId} className="spread" style={{ padding: "6px 0", fontSize: 14, gap: 8 }}>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            <span className="row" style={{ gap: 10, flex: "none" }}>
              <b className="n" style={{ color: up ? "var(--blue-500)" : "var(--g600)" }}>{p.rate == null ? "새로 팔렸어요" : `${up ? "▲" : "▼"} ${Math.abs(p.rate)}%`}</b>
              <span className="cap n" style={{ width: 64, textAlign: "right" }}>{up ? "+" : "−"}{man(Math.abs(p.diff))}</span>
            </span>
          </div>
        );
        return (
          <section key={sec.key} className="card">
            <div className="sec-title"><h2 className="t1">많이 달라진 상품</h2><span className="cap">{vs}</span></div>
            {!mv.hasPrev ? (
              <div className="cap">비교할 지난 기간 자료가 없어요.</div>
            ) : (
              <>
                <div className="cap mb8">많이 늘었어요</div>
                {mv.up.length ? mv.up.slice(0, lim).map((p: any) => row(p, true)) : <div className="cap">늘어난 상품이 없어요.</div>}
                <div className="cap mt16 mb8">많이 줄었어요</div>
                {mv.down.length ? mv.down.slice(0, lim).map((p: any) => row(p, false)) : <div className="cap">줄어든 상품이 없어요.</div>}
              </>
            )}
          </section>
        );
      }
      case "chart_ad_efficiency":
        return (
          <section key={sec.key} className="card">
            <div className="sec-title"><h2 className="t1">광고 효율 추이</h2><span className="cap">광고비 1원당 매출(배)</span>{snap.flags?.adEfficiencyLow ? <Badge tone="red">기준({snap.flags.adEfficiencyLowThreshold}배)보다 낮아요</Badge> : null}</div>
            <TrendLine points={snap.efficiencyTrend} unit="배" mode={sec.chart === "bar" ? "bar" : "line"} lowLine={snap.flags?.adEfficiencyLowThreshold} />
          </section>
        );
      case "chart_cancel_trend":
        return snap.cancelTrend?.length ? (
          <section key={sec.key} className="card">
            <div className="sec-title"><h2 className="t1">취소율 추이</h2><span className="cap">%</span></div>
            <TrendLine points={snap.cancelTrend} unit="%" mode={sec.chart === "bar" ? "bar" : "line"} />
          </section>
        ) : null;
      case "stock_table":
        return <Fragment key={sec.key}>{renderStock(sec)}</Fragment>;
      case "notes":
        return <Fragment key={sec.key}>{renderNotes()}</Fragment>;
      default:
        return null;
    }
  }

  const steps = ["수집", "계산", "확인", "공개"];
  const now = r.status === "published" ? 4 : 3;

  return (
    <>
      <Link href="/reports" className="cap row mb8" style={{ display: "inline-flex" }}><Icon name="left" size={16} />보고서 목록</Link>
      <div className="page-head">
        <div>
          <div className="row-wrap mb8">
            <Badge tone={STATUS_TONE[r.status] as "green"}>{STATUS_LABEL[r.status]}</Badge>
            <span className="cap">{REPORT_TYPE_LABEL[r.type]} 보고서 · {snap.meta.basisLabel}</span>
          </div>
          <h1 className="h1">{cfg.title}</h1>
          <p className="sub">{dateKo(r.date)}{r.type !== "daily" ? ` · ${r.periodStart} ~ ${r.periodEnd}` : ""}{r.status === "published" && r.approvedBy ? ` · ${r.approvedBy}이(가) ${dateTime(r.approvedAt)}에 승인했어요` : ""}</p>
        </div>
        <div className="row-wrap">
          {isAdmin && r.status !== "published" ? (
            <Button size="m" disabled={!!busy} onClick={() => act("regen", async () => { await api("/reports/generate", { method: "POST", body: { type: r.type, date: r.date } }); await load(); }, "다시 만들었어요.")}>다시 만들기</Button>
          ) : null}
          <Button variant={r.status === "published" || !isAdmin ? "primary" : "secondary"} size="m" disabled={busy === "pdf"} onClick={() => act("pdf", async () => { const n = await download(`/reports/${r.id}/pdf`, "report.pdf"); toast(`${n} 파일을 내려받았어요.`); })}>
            <Icon name="down" size={18} /> {busy === "pdf" ? "만드는 중" : "PDF로 내려받기"}
          </Button>
        </div>
      </div>

      {r.status !== "published" ? (
        <div className="card mb12">
          <div className="stepper">
            {steps.map((s, i) => (
              <div key={s} style={{ display: "contents" }}>
                <div className="node"><span className={`dot ${i + 1 < now ? "done" : i + 1 === now ? "now" : ""}`}>{i + 1 < now ? "✓" : i + 1}</span><span style={{ color: i + 1 === now ? "var(--blue-500)" : i + 1 < now ? "var(--g900)" : "var(--g500)" }}>{s}</span></div>
                {i < steps.length - 1 ? <div className={`line ${i + 1 < now ? "done" : ""}`} /> : null}
              </div>
            ))}
          </div>
          <p className="cap mt12" style={{ margin: "12px 0 0" }}>{r.status === "rejected" ? "반려된 보고서예요. 고친 뒤 다시 만들어 주세요." : "아직 공개되지 않았어요. 승인되면 대표와 팀장에게 공개돼요."}</p>
        </div>
      ) : null}
      {r.status === "rejected" && r.rejectedReason ? <div className="errbox mb12">반려 이유: {r.rejectedReason}</div> : null}
      {snap.issues?.length ? (
        <div className="warnbox mb12">
          수집 확인이 필요해요 · {snap.issues.map((i: any) => `${i.channel} ${i.status === "partial" ? "일부 누락" : i.status === "failed" ? "실패" : "누락 의심"}`).join(", ")}
        </div>
      ) : null}

      <div className="report-grid">
        {cfg.sections.map((s: any) => renderSection(s))}
      </div>

      <p className="cap-s mt16">
        {r.template ? `양식 v${r.template.versionNo}` : ""}
        {r.criteriaUsed?.length ? ` · 기준: ${r.criteriaUsed.filter((c: any) => ["stock_warn_qty", "stock_warn_days", "stock_danger_qty", "stock_danger_days"].includes(c.code)).map((c: any) => `${c.name} ${c.value}${c.unit}`).join(", ")}` : ""}
        {cfg.footer ? ` · ${cfg.footer}` : ""}
      </p>

      {isAdmin && r.status !== "published" ? (
        <div className="bottom-cta mt16">
          {r.status === "pending" ? (
            <>
              <Button size="xl" variant="secondary" disabled={!!busy} onClick={() => setRejectOpen(true)}>반려</Button>
              <Button size="xl" variant="primary" style={{ flex: 1 }} disabled={!!busy} onClick={() => setApproveOpen(true)}>승인하고 공개하기</Button>
            </>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="이 보고서를 승인할까요?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>계속 확인할게요</Button>
            <Button variant="primary" disabled={busy === "approve"} onClick={() => act("approve", async () => { await api(`/reports/${r.id}/approve`, { method: "POST" }); setApproveOpen(false); await load(); }, "승인했어요. 이제 공개돼요.")}>승인하고 공개하기</Button>
          </>
        }
      >
        <p className="b2" style={{ color: "var(--g700)", margin: 0 }}>승인하면 대표와 팀장이 볼 수 있어요. 공개된 보고서는 고칠 수 없어요.</p>
        {snap.issues?.length ? <div className="warnbox mt12">수집 확인이 필요한 곳이 있어요: {snap.issues.map((i: any) => i.channel).join(", ")}</div> : null}
        {r.notes.length === 0 && snap.stockSummary.danger > 0 ? <div className="note mt12 cap">재고 위험 상품이 있는데 확인 메모는 아직 없어요.</div> : null}
      </Dialog>

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="보고서를 반려할까요?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>취소</Button>
            <Button variant="danger" disabled={reason.trim().length < 2 || busy === "reject"} onClick={() => act("reject", async () => { await api(`/reports/${r.id}/reject`, { method: "POST", body: { reason } }); setRejectOpen(false); setReason(""); await load(); }, "반려했어요.")}>반려하기</Button>
          </>
        }
      >
        <Field label="반려하는 이유" helper="사용자가 고칠 수 있도록 이유를 적어 주세요.">
          <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="예: 핵심 숫자 항목이 빠져 있어요." />
        </Field>
      </Dialog>
      <span className="sr-only">{signed(snap.kpis.delta.sales)}</span>
    </>
  );
}
