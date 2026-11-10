"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateShort } from "@/lib/format";
import { useAuth, useToast } from "@/components/providers";
import { Badge, Button, Dialog, Empty, Loading } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CHANNELS: [string, string][] = [["", "(실패시키지 않기)"], ["coupang", "쿠팡"], ["smartstore", "스마트스토어"], ["own", "자사몰"], ["st11", "11번가"], ["naver_ad", "네이버 검색광고"], ["meta_ad", "인스타·페이스북 광고"], ["coupang_ad", "쿠팡 광고"]];
const RES: Record<string, [string, "green" | "orange" | "red"]> = { success: ["성공", "green"], retried: ["재시도 끝에 성공", "orange"], failed: ["끝내 실패", "red"] };

export default function DemoPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [info, setInfo] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [fail, setFail] = useState("coupang");
  const [failFirst, setFailFirst] = useState("2");
  const [result, setResult] = useState<any>(null);
  const [made, setMade] = useState<any>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const load = useCallback(() => api("/demo/info").then(setInfo).catch((e) => toast(e instanceof ApiError ? e.message : "불러오지 못했어요.", "err")), [toast]);
  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;
  if (user.role !== "admin") return <div className="card"><Empty title="관리자만 볼 수 있어요" /></div>;
  if (!info) return <Loading />;

  async function run(name: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(name);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "문제가 생겼어요.", "err");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">시연 컨트롤</h1>
          <p className="sub">발표나 시연 중에 정해진 시각을 기다리지 않고 바로 실행할 수 있어요. 관리자만 쓸 수 있고, 모두 이력에 남아요.</p>
        </div>
      </div>
      {!info.enabled ? <div className="warnbox mb12">시연 기능이 꺼져 있어요. (서버 설정 DEMO_MODE)</div> : null}
      <div className="note ai cap mb12">오늘은 <b>{info.today}</b>이에요. 자동 실행(07:30 수집, 09:05 재고, 09:10 보고서, 15:00 재고)은 {info.scheduler ? "켜져 있어요." : "꺼져 있어요."} 가상 데이터를 쓰고, 실제 판매처에는 연결하지 않아요.</div>

      <section className="card">
        <h2 className="t1 mb8">1. 지금 수집 실행</h2>
        <p className="cap mb12">판매처 4곳, 광고 3곳, 재고를 지금 받아요. 일부러 실패시키면 재시도(최대 3번)와 기록이 남는 모습을 볼 수 있어요.</p>
        <div className="row-wrap mb12">
          <Button variant="secondary" disabled={!!busy} onClick={() => run("collect", async () => setResult(await api("/demo/collect", { method: "POST", body: {} })), "수집을 마쳤어요.")}>{busy === "collect" ? "수집 중" : "전체 수집 실행"}</Button>
        </div>
        <div className="row-wrap">
          <select className="select" style={{ width: "auto", minHeight: 40 }} value={fail} onChange={(e) => setFail(e.target.value)} aria-label="실패시킬 수집처">
            {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="select" style={{ width: "auto", minHeight: 40 }} value={failFirst} onChange={(e) => setFailFirst(e.target.value)} aria-label="실패 횟수">
            <option value="1">1번 실패 후 성공</option>
            <option value="2">2번 실패 후 성공</option>
            <option value="3">끝내 실패 (3번)</option>
          </select>
          <Button variant="secondary" disabled={!!busy || !fail} onClick={() => run("fail", async () => setResult(await api("/demo/collect", { method: "POST", body: { failChannel: fail, failFirst: Number(failFirst) } })), "시연 수집을 마쳤어요.")}>일부러 실패시켜 보기</Button>
        </div>
        {result ? (
          <div className="mt12">
            <div className="cap mb8">{dateShort(result.runDate)} 수집 결과 (데이터 날짜 {dateShort(result.dataDay)})</div>
            {result.results.map((x: any) => (
              <div key={x.channel} className="tr">
                <span>{x.name}</span>
                <span className="row"><span className="cap n">{x.tries}번 시도 · {x.rows}줄</span><Badge tone={(RES[x.status] ?? RES.success)[1]}>{(RES[x.status] ?? RES.success)[0]}</Badge></span>
              </div>
            ))}
            <p className="cap-s mt8">결과는 <Link href="/collect" className="up">수집 상태</Link> 화면에서도 볼 수 있어요.</p>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2 className="t1 mb8">2. 재고 수집</h2>
        <div className="row-wrap">
          <Button disabled={!!busy} onClick={() => run("s1", () => api("/demo/stock", { method: "POST", body: { slot: 1 } }), "오전(09:05) 재고를 받았어요.")}>오전 재고 받기</Button>
          <Button disabled={!!busy} onClick={() => run("s2", () => api("/demo/stock", { method: "POST", body: { slot: 2 } }), "오후(15:00) 재고를 받았어요.")}>오후 재고 받기</Button>
        </div>
      </section>

      <section className="card">
        <h2 className="t1 mb8">3. 보고서 만들기</h2>
        <p className="cap mb12">승인 전·반려된 보고서는 다시 만들 수 있고, 이미 공개된 보고서는 다시 만들 수 없어요. 새로 만든 보고서는 &quot;승인 대기&quot;가 돼요.</p>
        <div className="row-wrap">
          {(["daily", "weekly", "monthly"] as const).map((t) => (
            <Button key={t} variant="secondary" disabled={!!busy} onClick={() => run(t, async () => setMade(await api("/demo/generate-report", { method: "POST", body: { type: t } })), "보고서를 만들었어요.")}>
              {t === "daily" ? "오늘 일일 보고서" : t === "weekly" ? "이번 주 주간 보고서" : "이번 달 월말 보고서"}
            </Button>
          ))}
        </div>
        {made ? <p className="b2 mt12">만들었어요: <Link href={`/reports/${made.id}`} className="up semi">{made.date} 보고서 열기</Link> {made.regenerated ? "(다시 만들었어요)" : ""}</p> : null}
      </section>

      <section className="card">
        <h2 className="t1 mb8">4. 가상 데이터 처음으로</h2>
        <p className="cap mb12">우리 서비스의 가상 데이터만 지우고 다시 채워요. 같은 DB의 다른 프로젝트 데이터는 건드리지 않아요. 30초쯤 걸려요.</p>
        <Button variant="danger" disabled={!!busy} onClick={() => setResetOpen(true)}>처음 상태로 되돌리기</Button>
      </section>

      <Dialog
        open={resetOpen}
        onClose={() => !busy && setResetOpen(false)}
        title="가상 데이터를 처음으로 되돌릴까요?"
        footer={<><Button variant="secondary" disabled={!!busy} onClick={() => setResetOpen(false)}>취소</Button><Button variant="danger" disabled={!!busy} onClick={() => run("reset", async () => { await api("/demo/reset", { method: "POST", body: { confirm: "RESET" } }); setResetOpen(false); setResult(null); setMade(null); await load(); }, "처음 상태로 되돌렸어요.")}>{busy === "reset" ? "다시 채우는 중" : "되돌리기"}</Button></>}
      >
        <p className="b2" style={{ margin: 0, color: "var(--g700)" }}>지금까지 시연하면서 만든 보고서, 기준 수정안, 양식 변경이 모두 사라지고 90일치 가상 데이터로 다시 채워져요.</p>
        {busy === "reset" ? <Loading text="30초쯤 걸려요" /> : null}
      </Dialog>
    </>
  );
}
