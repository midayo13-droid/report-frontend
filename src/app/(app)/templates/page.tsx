"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, download } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useToast } from "@/components/providers";
import { Badge, Button, Chip, Icon, Loading, Segmented, Switch } from "@/components/ui";
import { CustomChartCard } from "@/components/custom-chart";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Code = "daily" | "weekly" | "monthly";
const EXAMPLES = ["광고 효율 그래프를 맨 위로 올려줘", "판매처 비중을 막대로 바꿔줘", "재고 표는 위험 상품만 5개 보여줘", "카테고리별 매출을 원그래프로 추가해줘", "최근 2주 일별 매출을 꺾은선으로 추가해줘"];
const newKey = () => `custom:c${Date.now().toString(36).slice(-6)}${Math.floor(Math.random() * 36).toString(36)}`;
const isCustom = (key: string) => key.startsWith("custom:");
const SOURCE_LABEL: Record<string, string> = { seed: "처음 양식", manual: "직접 고침", ai: "AI 제안", upload: "파일 올림", rollback: "되돌림" };

export default function TemplatesPage() {
  const toast = useToast();
  const [code, setCode] = useState<Code>("daily");
  const [data, setData] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState("");
  const [ai, setAi] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [errs, setErrs] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // 그래프 추가 (무엇을 × 무엇별로 × 어떤 모양으로)
  const [cMetric, setCMetric] = useState("sales");
  const [cGroup, setCGroup] = useState("category");
  const [cShape, setCShape] = useState("donut");
  const [cDays, setCDays] = useState(0);
  const [cLimit, setCLimit] = useState(5);
  const [cTitle, setCTitle] = useState("");
  const [cPreview, setCPreview] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const d = await api(`/templates/${code}`);
      setData(d);
      setDraft(JSON.parse(JSON.stringify(d.current.config)));
      setErrs([]);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "불러오지 못했어요.", "err");
    }
  }, [code, toast]);
  useEffect(() => {
    setData(null);
    setAi(null);
    load();
  }, [load]);

  if (!data || !draft) return (
    <>
      <div className="page-head"><h1 className="h1">양식 설정</h1></div>
      <Loading />
    </>
  );

  const dirty = JSON.stringify(draft) !== JSON.stringify(data.current.config);
  const co = data.options.custom;
  const group = co.groups.find((g: any) => g.key === cGroup) ?? co.groups[0];
  const customCount = draft.sections.filter((s: any) => isCustom(s.key)).length;
  const draftSpec = () => ({ title: cTitle.trim(), metric: cMetric, groupBy: cGroup, shape: cShape, days: cDays, limit: cLimit });
  const pickGroup = (g: string) => {
    const gg = co.groups.find((x: any) => x.key === g);
    setCGroup(g);
    setCShape(gg.shapes[0].key);
    setCDays(g === "date" ? 14 : 0);
    setCPreview(null);
  };
  const specText = (c: any) => `${co.metrics.find((m: any) => m.key === c.metric)?.label} × ${co.groups.find((g: any) => g.key === c.groupBy)?.label} × ${co.groups.flatMap((g: any) => g.shapes).find((s: any) => s.key === c.shape)?.label}${c.days ? ` · 최근 ${c.days}일` : ""}`;
  const opt = (key: string) => data.options.sections.find((s: any) => s.key === key);
  const setSec = (i: number, patch: any) => setDraft({ ...draft, sections: draft.sections.map((s: any, k: number) => (k === i ? { ...s, ...patch } : s)) });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= draft.sections.length) return;
    const s = [...draft.sections];
    [s[i], s[j]] = [s[j], s[i]];
    setDraft({ ...draft, sections: s });
  };

  async function run(name: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(name);
    setErrs([]);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrs(e.errors ?? []);
        toast(e.message, "err");
      } else toast("문제가 생겼어요.", "err");
    } finally {
      setBusy("");
    }
  }

  async function importFile(f: File) {
    try {
      const text = await f.text();
      const config = JSON.parse(text);
      await run("import", async () => { await api(`/templates/${code}/import`, { method: "POST", body: { config } }); await load(); }, "설정 파일을 적용했어요.");
    } catch {
      toast("설정 파일을 읽을 수 없어요. 내려받은 샘플 모양의 JSON 파일이어야 해요.", "err");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">양식 설정</h1>
          <p className="sub">보고서의 모양(항목, 순서, 그래프 종류, 표시 개수, 제목)을 바꿔요. 계산 방법은 <Link href="/criteria" className="up semi">기준 관리</Link>에서 바꿔요.</p>
        </div>
        <Segmented<Code> value={code} onChange={setCode} options={[{ value: "daily", label: "일일" }, { value: "weekly", label: "주간" }, { value: "monthly", label: "월말" }]} />
      </div>
      <div className="note ai cap mb12">양식을 바꾸면 <b>승인 전 보고서만</b> 새 양식을 따라가요. 이미 공개된 보고서는 그때 양식 그대로 남아요. 지금 쓰는 양식은 <b>v{data.current.versionNo}</b>예요.</div>

      <section className="card tint mb12" style={{ marginTop: 0 }}>
        <div className="row mb8"><Icon name="spark" size={20} /><h2 className="t1">AI 양식 도우미</h2></div>
        <p className="cap mb8">바꾸고 싶은 것을 말로 적으면 AI가 변경안을 만들어요. 변경 전후를 확인하고 <b>직접 적용</b>해야 반영돼요.</p>
        <div className="row-wrap mb8">
          {EXAMPLES.map((e) => <Chip key={e} onClick={() => setAsk(e)}>{e}</Chip>)}
        </div>
        <div className="row" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
          <input className="input" style={{ background: "#fff", flex: "1 1 220px", width: "auto" }} placeholder="예: 광고 효율 그래프를 맨 위로 올려줘" value={ask} maxLength={200} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask.trim().length > 1 && run("ai", async () => setAi(await api("/ai/template-change", { method: "POST", body: { templateCode: code, request: ask } })))} />
          <Button variant="secondary" disabled={busy === "ai" || ask.trim().length < 2} onClick={() => run("ai", async () => setAi(await api("/ai/template-change", { method: "POST", body: { templateCode: code, request: ask } })))}>{busy === "ai" ? "만드는 중" : "변경안 만들기"}</Button>
        </div>
        {ai ? (
          <div className="note mt12" style={{ background: "#fff" }}>
            <div className="spread mb8">
              <b className={ai.status === "failed" ? "" : "up"}>{ai.status === "failed" ? "바꾸지 못했어요" : "AI 변경안"}</b>
              <span className="cap-s">{ai.source === "gpt" ? "GPT가 만들었어요" : "미리 정해 둔 규칙으로 읽었어요"}</span>
            </div>
            <p className="b2" style={{ margin: "0 0 8px" }}>{ai.message}</p>
            {ai.changes?.length ? <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>{ai.changes.map((c: string, i: number) => <li key={i} className="b2">{c}</li>)}</ul> : null}
            <div className="row-wrap">
              {ai.status === "suggested" ? (
                <>
                  <Button variant="secondary" size="m" disabled={!!busy} onClick={() => run("apply", async () => { await api(`/ai/template-change/${ai.id}/apply`, { method: "POST" }); setAi(null); setAsk(""); await load(); }, "새 양식 버전으로 적용했어요.")}>적용하기</Button>
                  <Button variant="ghost" size="m" disabled={!!busy} onClick={() => run("ignore", async () => { await api(`/ai/${ai.id}/ignore`, { method: "POST" }); setAi(null); })}>무시하기</Button>
                </>
              ) : ai.redirect === "criteria" ? <Link href="/criteria" className="btn btn-m btn-secondary">기준 관리로 가기</Link> : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="sec-title"><h2 className="t1">그래프 추가</h2><span className="cap">{customCount}/{co.max}개 추가했어요</span></div>
        <p className="cap mb12">무엇을, 무엇별로, 어떤 모양으로 볼지 고르면 시스템이 계산해서 보고서에 넣어요. 더하기만 해도 맞는 숫자만 고를 수 있어서 숫자가 틀리지 않아요.</p>
        <div className="grid2" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>무엇을 볼까요</label>
            <select className="select" value={cMetric} onChange={(e) => { setCMetric(e.target.value); setCPreview(null); }}>
              {co.metrics.map((m: any) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>무엇별로 나눌까요</label>
            <select className="select" value={cGroup} onChange={(e) => pickGroup(e.target.value)}>
              {co.groups.map((g: any) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>어떤 모양으로 볼까요</label>
            <select className="select" value={cShape} onChange={(e) => { setCShape(e.target.value); setCPreview(null); }}>
              {group.shapes.map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>기간</label>
            <select className="select" value={cDays} onChange={(e) => { setCDays(Number(e.target.value)); setCPreview(null); }}>
              {group.days.map((d: number) => <option key={d} value={d}>{d === 0 ? "보고서 기간 그대로" : `최근 ${d}일`}</option>)}
            </select>
          </div>
          {cGroup !== "date" ? (
            <div className="field">
              <label>보여 줄 개수</label>
              <input className="input n" type="number" min={3} max={cShape === "donut" ? 8 : 10} value={cLimit} onChange={(e) => { setCLimit(Number(e.target.value)); setCPreview(null); }} />
            </div>
          ) : null}
          <div className="field">
            <label>그래프 이름 (비우면 자동)</label>
            <input className="input" value={cTitle} maxLength={20} onChange={(e) => setCTitle(e.target.value)} placeholder="예: 카테고리별 매출 비중" />
          </div>
        </div>
        <div className="row-wrap">
          <Button variant="secondary" disabled={!!busy} onClick={() => run("cpreview", async () => setCPreview(await api(`/templates/${code}/custom-preview`, { method: "POST", body: { spec: draftSpec() } })))}>{busy === "cpreview" ? "계산 중" : "미리보기"}</Button>
          <Button disabled={!!busy || customCount >= co.max} onClick={() => run("cadd", async () => {
            const check = await api<any>(`/templates/${code}/custom-preview`, { method: "POST", body: { spec: draftSpec() } });
            setCPreview(check);
            setDraft({ ...draft, sections: [...draft.sections.slice(0, Math.max(0, draft.sections.findIndex((s: any) => s.key === "stock_table"))), { key: newKey(), enabled: true, custom: { ...draftSpec(), title: check.title } }, ...draft.sections.slice(Math.max(0, draft.sections.findIndex((s: any) => s.key === "stock_table")))] });
          }, "목록에 넣었어요. 아래에서 순서를 확인하고 저장해 주세요.")}>목록에 넣기</Button>
          {customCount >= co.max ? <span className="cap">최대 {co.max}개까지예요. 하나를 지우면 다시 추가할 수 있어요.</span> : null}
        </div>
        {cPreview ? <div className="mt12"><CustomChartCard cc={cPreview} /></div> : null}
      </section>

      <section className="card">
        <div className="sec-title"><h2 className="t1">항목과 순서</h2><span className="cap">위에서부터 보고서에 나와요</span></div>
        <div className="grid2" style={{ marginBottom: 12 }}>
          <div className="field"><label>보고서 제목</label><input className="input" value={draft.title} maxLength={40} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
          <div className="field"><label>맨 아래 문구 (선택)</label><input className="input" value={draft.footer ?? ""} maxLength={80} onChange={(e) => setDraft({ ...draft, footer: e.target.value })} placeholder="예: 문의는 운영팀으로" /></div>
        </div>
        {draft.sections.map((s: any, i: number) => {
          const o = opt(s.key);
          return (
            <div key={s.key} className="lr" style={{ alignItems: "flex-start", opacity: s.enabled ? 1 : 0.55 }}>
              <div className="stack" style={{ gap: 2 }}>
                <button className="icon-btn" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)} style={{ width: 32, height: 28 }}><Icon name="up" size={16} /></button>
                <button className="icon-btn" aria-label="아래로" disabled={i === draft.sections.length - 1} onClick={() => move(i, 1)} style={{ width: 32, height: 28 }}><Icon name="downarrow" size={16} /></button>
              </div>
              <div className="grow">
                <div className="semi">{i + 1}. {isCustom(s.key) ? s.custom?.title : o?.label ?? s.key}{isCustom(s.key) ? <> <Badge tone="blue">추가한 그래프</Badge></> : null}</div>
                {isCustom(s.key) ? <div className="cap mt8">{specText(s.custom)}</div> : null}
                <div className="row-wrap mt8">
                  {o?.charts?.length ? (
                    <select className="select" style={{ width: "auto", minHeight: 36, padding: "4px 10px" }} value={s.chart} onChange={(e) => setSec(i, { chart: e.target.value })} aria-label={`${o.label} 그래프 종류`}>
                      {o.charts.map((c: any) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  ) : null}
                  {s.key === "stock_table" ? (
                    <>
                      <select className="select" style={{ width: "auto", minHeight: 36, padding: "4px 10px" }} value={s.filter} onChange={(e) => setSec(i, { filter: e.target.value })} aria-label="재고 표시 조건">
                        <option value="all">전체 경고</option>
                        <option value="danger">위험만</option>
                      </select>
                      <input className="input n" style={{ width: 84, minHeight: 36, padding: "4px 10px" }} type="number" min={3} max={20} value={s.limit} onChange={(e) => setSec(i, { limit: Number(e.target.value) })} aria-label="표시 개수" /> <span className="cap">개까지</span>
                    </>
                  ) : null}
                  {s.key === "chart_top_products" ? (
                    <>
                      <input className="input n" style={{ width: 84, minHeight: 36, padding: "4px 10px" }} type="number" min={3} max={20} value={s.limit} onChange={(e) => setSec(i, { limit: Number(e.target.value) })} aria-label="표시 개수" /> <span className="cap">개까지</span>
                    </>
                  ) : null}
                  {s.key === "chart_product_movers" ? (
                    <>
                      <span className="cap">늘어난 상품, 줄어든 상품 각각</span>
                      <input className="input n" style={{ width: 84, minHeight: 36, padding: "4px 10px" }} type="number" min={1} max={5} value={s.limit ?? 3} onChange={(e) => setSec(i, { limit: Number(e.target.value) })} aria-label="표시 개수" /> <span className="cap">개까지</span>
                    </>
                  ) : null}
                  {s.key === "kpis" ? data.options.kpiItems.map((k: any) => (
                    <Chip key={k.key} on={s.items.includes(k.key)} onClick={() => setSec(i, { items: s.items.includes(k.key) ? s.items.filter((x: string) => x !== k.key) : [...s.items, k.key] })}>{k.label}</Chip>
                  )) : null}
                </div>
              </div>
              {isCustom(s.key) ? (
                <button className="icon-btn" aria-label={`${s.custom?.title} 지우기`} onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_: any, k: number) => k !== i) })}>
                  <Icon name="trash" size={18} />
                </button>
              ) : null}
              <Switch on={s.enabled} onChange={(v) => setSec(i, { enabled: v })} label={`${isCustom(s.key) ? s.custom?.title : o?.label ?? s.key} 보여 주기`} />
            </div>
          );
        })}
        {errs.length ? <div className="errbox mt12">{errs.map((e, i) => <div key={i}>{e}</div>)}</div> : null}
        <div className="stack mt16">
          <input className="input" placeholder="이번에 바꾼 내용을 한 줄로 남겨 주세요 (선택)" value={note} maxLength={100} onChange={(e) => setNote(e.target.value)} />
          <div className="row-wrap" style={{ justifyContent: "flex-end" }}>
            <Button variant="secondary" disabled={!dirty || !!busy} onClick={() => setDraft(JSON.parse(JSON.stringify(data.current.config)))}>되돌리기</Button>
            <Button variant="primary" disabled={!dirty || !!busy} onClick={() => run("save", async () => { await api(`/templates/${code}/config`, { method: "PUT", body: { config: draft, note: note || "양식을 고쳤어요." } }); setNote(""); await load(); }, "새 양식 버전으로 저장했어요.")}>{busy === "save" ? "저장 중" : "새 버전으로 저장"}</Button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="spread mb8">
          <h2 className="t1">양식 파일 내려받기·올리기</h2>
        </div>
        <p className="cap mb8">샘플을 내려받아 항목 순서와 켜기·끄기를 고친 뒤 다시 올려도 돼요. 올릴 때도 같은 검사를 거쳐요.</p>
        <div className="row-wrap">
          <Button onClick={() => run("sample", async () => { await download(`/templates/${code}/sample`, `양식샘플_${code}.json`); }, "샘플을 내려받았어요.")}><Icon name="down" size={16} /> 양식 샘플 내려받기</Button>
          <Button onClick={() => fileRef.current?.click()} disabled={!!busy}>설정 파일 올리기</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
        </div>
      </section>

      <section className="card">
        <h2 className="t1 mb8">버전 기록</h2>
        {data.versions.map((v: any) => (
          <div key={v.id} className="lr">
            <div className="grow">
              <div className="row-wrap"><span className="semi">v{v.versionNo}</span>{v.isCurrent ? <Badge tone="blue">지금 쓰는 중</Badge> : null}<Badge tone="grey">{SOURCE_LABEL[v.source] ?? v.source}</Badge></div>
              <div className="cap">{v.note} · {v.createdBy ?? "-"} · {dateTime(v.createdAt)}</div>
            </div>
            {!v.isCurrent ? <Button size="s" disabled={!!busy} onClick={() => run("rb", async () => { await api(`/templates/${code}/rollback`, { method: "POST", body: { versionId: v.id } }); await load(); }, `v${v.versionNo} 모양으로 되돌렸어요.`)}>이 버전으로 되돌리기</Button> : null}
          </div>
        ))}
      </section>
    </>
  );
}
