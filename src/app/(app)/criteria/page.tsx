"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateShort, dateTime } from "@/lib/format";
import { critValue, tomorrowKst } from "@/lib/crit";
import { useAuth, useToast } from "@/components/providers";
import { Badge, Button, Dialog, Field, Icon, Loading } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const AREAS = ["재고", "운영", "마케팅", "관리자"];

export default function CriteriaPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<any[] | null>(null);
  const [target, setTarget] = useState<any>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await api("/criteria"));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "불러오지 못했어요.", "err");
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  if (!user || !list) return <Loading />;
  const isAdmin = user.role === "admin";
  const canPropose = (c: any) => c.editable && (isAdmin || (user.role === "user" && c.ownerAreaLabel === user.areaLabel));

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const r = await api(`/criteria/${target.code}/proposals`, { method: "POST", body: { value: Number(value), reason } });
      toast(r.status === "approved" ? `승인했어요. ${r.effectiveFrom}부터 적용돼요.` : "수정안을 올렸어요. 관리자가 승인하면 다음 날부터 적용돼요.");
      setTarget(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "올리지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(p: any, kind: "approve" | "reject") {
    setBusy(true);
    try {
      await api(`/criteria/proposals/${p.id}/${kind}`, { method: "POST", body: kind === "reject" ? { reason: "관리자가 반려했어요." } : undefined });
      toast(kind === "approve" ? "승인했어요. 내일부터 적용돼요." : "반려했어요.");
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "문제가 생겼어요.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">기준 관리</h1>
          <p className="sub">경고와 계산에 쓰는 기준이에요. 바꾸려면 수정안을 올리고, 관리자가 승인하면 <b>다음 날부터</b> 적용돼요. 지난 보고서는 그때의 기준 그대로 남아요.</p>
        </div>
      </div>
      {user.role === "user" ? <div className="note ai mb12 cap">내 담당 영역({user.areaLabel})의 기준만 수정안을 올릴 수 있어요.</div> : null}

      {AREAS.map((area) => {
        const rows = list.filter((c) => c.ownerAreaLabel === area);
        if (!rows.length) return null;
        return (
          <section key={area} className="card">
            <h2 className="t1 mb8">{area} 담당 기준</h2>
            {rows.map((c) => (
              <div key={c.code} className="lr" style={{ alignItems: "flex-start" }}>
                <div className="grow">
                  <div className="row-wrap">
                    <span className="semi">{c.name}</span>
                    {!c.editable ? <Badge tone="grey">계산 방법 · 고정</Badge> : null}
                    {c.pending.length ? <Badge tone="orange">수정안 승인 대기</Badge> : null}
                  </div>
                  <div className="cap">{c.description}</div>
                  {c.editable ? <div className="cap-s">바꿀 수 있는 범위: {critValue(c, c.min)} ~ {critValue(c, c.max)}</div> : null}
                  {c.upcoming ? <div className="cap mt8" style={{ color: "var(--blue-500)" }}>{dateShort(c.upcoming.effectiveFrom)}부터 {critValue(c, c.upcoming.value)}(으)로 바뀌어요.</div> : null}
                  {c.pending.map((p: any) => (
                    <div key={p.id} className="note mt8">
                      <div className="cap"><b className="n" style={{ color: "var(--g900)" }}>{critValue(c, p.value)}</b>(으)로 바꿔 달라는 수정안 · {p.proposedBy} · {dateTime(p.createdAt)}</div>
                      <div className="cap">{p.reason}</div>
                      {isAdmin ? (
                        <div className="row-wrap mt8">
                          <Button size="s" variant="secondary" disabled={busy} onClick={() => decide(p, "approve")}>승인 (내일부터 적용)</Button>
                          <Button size="s" variant="ghost" disabled={busy} onClick={() => decide(p, "reject")}>반려</Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {c.history.length ? (
                    <details className="mt8">
                      <summary className="cap" style={{ cursor: "pointer" }}>바뀐 기록 {c.history.length}건 보기</summary>
                      {c.history.map((h: any) => (
                        <div key={h.id} className="cap mt8">
                          {h.status === "approved" ? <Badge tone="green">승인</Badge> : <Badge tone="red">반려</Badge>}{" "}
                          <b className="n" style={{ color: "var(--g900)" }}>{critValue(c, h.value)}</b>
                          {h.effectiveFrom ? ` · ${dateShort(h.effectiveFrom)}부터` : ""} · {h.reason}{h.rejectReason ? ` (반려: ${h.rejectReason})` : ""}
                        </div>
                      ))}
                    </details>
                  ) : null}
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div className="h2 n">{critValue(c, c.currentValue)}</div>
                  {c.currentSince ? <div className="cap-s">{dateShort(c.currentSince)}부터</div> : null}
                  {canPropose(c) ? (
                    <Button size="s" className="mt8" disabled={c.pending.length > 0} onClick={() => { setTarget(c); setValue(String(c.currentValue ?? "")); setReason(""); setErr(""); }}>
                      <Icon name="criteria" size={14} /> 수정안 올리기
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      <Dialog
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? `${target.name} 수정안` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>취소</Button>
            <Button variant="primary" disabled={busy || !value || reason.trim().length < 2} onClick={submit}>{isAdmin ? "올리고 바로 승인" : "수정안 올리기"}</Button>
          </>
        }
      >
        {target ? (
          <div className="stack">
            <div className="note cap">
              지금 값: <b className="n" style={{ color: "var(--g900)" }}>{critValue(target, target.currentValue)}</b><br />
              {isAdmin ? "관리자가 올리면 바로 승인돼요." : "관리자가 승인하면"} <b>{tomorrowKst()}</b>(내일)부터 적용돼요. 오늘 보고서는 바뀌지 않아요.
            </div>
            <Field label={`바꿀 값 (${target.unit || "숫자"})`} helper={`${critValue(target, target.min)} ~ ${critValue(target, target.max)}`} error={err}>
              <input className={`input n ${err ? "err" : ""}`} type="number" inputMode="decimal" step={target.decimal ? "0.1" : "1"} value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            <Field label="바꾸려는 이유">
              <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="예: 이벤트 때 품절이 빨라서 여유를 두고 싶어요." />
            </Field>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
