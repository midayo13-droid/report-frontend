"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateShort, dateTime, md } from "@/lib/format";
import { useAuth, useToast } from "@/components/providers";
import { Badge, Button, Empty, Icon, Loading } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const RUN_LABEL: Record<string, [string, "green" | "orange" | "red"]> = {
  success: ["성공", "green"],
  partial: ["일부 누락", "orange"],
  failed: ["실패", "red"],
};
const CONN_LABEL: Record<string, [string, "green" | "orange" | "red"]> = {
  ok: ["연결 정상", "green"],
  expired: ["키 만료", "orange"],
  error: ["연결 오류", "red"],
};
const TYPE_LABEL: Record<string, string> = { sales: "판매처", ad: "광고", stock: "재고" };

export default function CollectPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api("/collect/status"));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "불러오지 못했어요.", "err");
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  if (!user || !data) return <Loading />;

  async function retry(code: string) {
    setBusy(code);
    try {
      const r = await api("/collect/retry", { method: "POST", body: { channel: code } });
      const res = r.results?.[0];
      toast(res?.status === "failed" ? "다시 시도했지만 아직 안 돼요. 총관리자에게 연결 키를 확인해 달라고 해 주세요." : "다시 받아 왔어요.", res?.status === "failed" ? "err" : "ok");
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "문제가 생겼어요.", "err");
    } finally {
      setBusy("");
    }
  }

  const bad = data.channels.filter((c: any) => c.latest && c.latest.status !== "success" && c.latest.date === data.today);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">수집 상태</h1>
          <p className="sub">판매처 4곳, 광고 3곳, 재고를 정해진 시각에 자동으로 받아요. 실패하면 3번까지 다시 시도해요.</p>
        </div>
        <Button onClick={load}><Icon name="collect" size={16} /> 새로 고침</Button>
      </div>

      {bad.length ? <div className="warnbox mb12">오늘 확인이 필요한 곳이 {bad.length}곳 있어요: {bad.map((c: any) => c.name).join(", ")}</div> : <div className="card tint mb12"><b>오늘 수집은 모두 잘 됐어요.</b> <span className="cap">({data.today} 기준)</span></div>}

      <div className="grid2" style={{ gap: 12 }}>
        {data.channels.map((c: any) => {
          const run = c.latest ? RUN_LABEL[c.latest.status] : null;
          const conn = CONN_LABEL[c.connection.status] ?? CONN_LABEL.error;
          const canRetry = c.latest && c.latest.status !== "success" && c.type !== "stock";
          return (
            <section key={c.code} className="card" style={{ marginTop: 0 }}>
              <div className="spread mb8">
                <div>
                  <div className="t1">{c.name}</div>
                  <div className="cap">{TYPE_LABEL[c.type]} · {c.connection.keyMasked || "연결 키 없음"}</div>
                </div>
                <Badge tone={conn[1]}>{conn[0]}</Badge>
              </div>
              {c.latest ? (
                <div className="note">
                  <div className="spread">
                    <span className="semi">{dateShort(c.latest.date)} 수집</span>
                    {run ? <Badge tone={run[1]}>{run[0]}</Badge> : null}
                  </div>
                  <div className="cap mt8">받은 줄 {c.latest.rows.toLocaleString("ko-KR")}개{c.latest.tries > 1 ? ` · ${c.latest.tries}번째 시도에 ${c.latest.status === "success" ? "성공" : "실패"}` : ""} · {dateTime(c.latest.at)}</div>
                  {c.latest.error ? <div className="cap mt8" style={{ color: "var(--orange)" }}>{c.latest.error}</div> : null}
                </div>
              ) : <div className="cap">수집 기록이 아직 없어요.</div>}
              <div className="row mt12" style={{ justifyContent: "space-between" }}>
                <div className="dayrow" aria-label="최근 14일 수집 결과">
                  {[...c.history].reverse().map((h: any, i: number) => <i key={i} className={h.status} title={`${md(h.date)} ${RUN_LABEL[h.status]?.[0] ?? h.status}`} />)}
                </div>
                {canRetry ? <Button size="s" variant="secondary" disabled={busy === c.code} onClick={() => retry(c.code)}>{busy === c.code ? "받는 중" : "다시 받기"}</Button> : null}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card mt12">
        <h2 className="t1 mb8">최근 문제 기록</h2>
        {data.problems.length === 0 ? <Empty title="최근 2주간 문제가 없었어요" /> : data.problems.map((p: any, i: number) => (
          <div key={i} className="lr">
            <div className={`av ${p.status === "failed" ? "red" : "orange"}`}><Icon name="alert" size={20} /></div>
            <div className="grow">
              <div className="semi">{dateShort(p.date)} · {data.channels.find((c: any) => c.code === p.channel)?.name ?? p.channel}</div>
              <div className="cap">{p.error || "-"}</div>
            </div>
            <Badge tone={RUN_LABEL[p.status]?.[1] ?? "grey"}>{RUN_LABEL[p.status]?.[0] ?? p.status}</Badge>
          </div>
        ))}
      </section>
    </>
  );
}
