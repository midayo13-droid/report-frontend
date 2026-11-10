"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateShort, dateTime, REPORT_TYPE_LABEL, man } from "@/lib/format";
import { useAuth, useToast } from "@/components/providers";
import { Badge, Button, Dialog, Empty, Field, Icon, Loading } from "@/components/ui";
import { critValue, tomorrowKst } from "@/lib/crit";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ApprovalsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState<any[] | null>(null);
  const [crit, setCrit] = useState<any[] | null>(null);
  const [rej, setRej] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([api<any[]>("/reports?status=pending&limit=50"), api<any[]>("/criteria")]);
      setReports(r);
      setCrit(c);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "불러오지 못했어요.", "err");
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;
  if (user.role !== "admin") return <div className="card"><Empty title="관리자만 볼 수 있어요" /></div>;
  if (!reports || !crit) return <Loading />;

  const proposals = crit.flatMap((c) => c.pending.map((p: any) => ({ ...p, c })));

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
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
          <h1 className="h1">승인</h1>
          <p className="sub">보고서와 기준 수정안을 확인하고 승인해 주세요.</p>
        </div>
      </div>

      <section className="card">
        <h2 className="t1 mb8">승인을 기다리는 보고서 <span className="cap">{reports.length}건</span></h2>
        {reports.length === 0 ? <Empty title="기다리는 보고서가 없어요">새 보고서가 만들어지면 여기에 나와요.</Empty> : reports.map((r) => (
          <Link key={r.id} href={`/reports/${r.id}`} className="lr">
            <div className="av orange"><Icon name="report" size={22} /></div>
            <div className="grow">
              <div className="semi">{REPORT_TYPE_LABEL[r.type]} 보고서 · {dateShort(r.date)}</div>
              <div className="cap">매출 {man(r.kpis?.sales)} · 재고 위험 {r.stockSummary?.danger ?? 0}건, 주의 {r.stockSummary?.warn ?? 0}건{r.issueCount ? " · 수집 확인 필요" : ""}</div>
            </div>
            <Badge tone="orange">승인 대기</Badge>
            <Icon name="right" size={18} />
          </Link>
        ))}
      </section>

      <section className="card">
        <h2 className="t1 mb8">기준 수정안 <span className="cap">{proposals.length}건</span></h2>
        <p className="cap mb8">승인하면 <b>{tomorrowKst()}</b>(내일)부터 적용돼요. 오늘 보고서와 지난 보고서는 그대로예요.</p>
        {proposals.length === 0 ? <Empty title="기다리는 수정안이 없어요" /> : proposals.map((p: any) => (
          <div key={p.id} className="lr" style={{ alignItems: "flex-start" }}>
            <div className="av blue"><Icon name="criteria" size={22} /></div>
            <div className="grow">
              <div className="semi">{p.c.name}</div>
              <div className="b2 n">
                <span style={{ color: "var(--g500)", textDecoration: "line-through" }}>{critValue(p.c, p.c.currentValue)}</span>
                {" → "}
                <b>{critValue(p.c, p.value)}</b>
              </div>
              <div className="b2" style={{ color: "var(--g700)" }}>{p.reason}</div>
              <div className="cap">{p.proposedBy}이(가) {dateTime(p.createdAt)}에 올렸어요 · 담당 영역: {p.c.ownerAreaLabel}</div>
            </div>
            <div className="row-wrap" style={{ justifyContent: "flex-end" }}>
              <Button size="m" variant="ghost" disabled={busy} onClick={() => { setRej(p); setReason(""); }}>반려</Button>
              <Button size="m" variant="secondary" disabled={busy} onClick={() => run(() => api(`/criteria/proposals/${p.id}/approve`, { method: "POST" }), "승인했어요. 내일부터 적용돼요.")}>수정안 승인</Button>
            </div>
          </div>
        ))}
      </section>

      <Dialog
        open={!!rej}
        onClose={() => setRej(null)}
        title="수정안을 반려할까요?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRej(null)}>취소</Button>
            <Button variant="danger" disabled={reason.trim().length < 2 || busy} onClick={() => run(async () => { await api(`/criteria/proposals/${rej.id}/reject`, { method: "POST", body: { reason } }); setRej(null); }, "반려했어요.")}>반려하기</Button>
          </>
        }
      >
        <Field label="반려하는 이유" helper="올린 사람이 볼 수 있어요.">
          <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </Field>
      </Dialog>
    </>
  );
}
