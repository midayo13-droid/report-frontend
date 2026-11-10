"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { dateKo, dateShort, man, REPORT_TYPE_LABEL, STATUS_LABEL, STATUS_TONE, num } from "@/lib/format";
import { useAuth } from "@/components/providers";
import { Badge, Chip, Delta, Empty, Icon, Loading, Segmented } from "@/components/ui";

interface Item {
  id: number;
  type: string;
  typeLabel: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  approvedBy: string | null;
  rejectedReason: string | null;
  kpis: { sales: number; adEfficiency: number; orders: number; delta: { sales: number | null } };
  stockSummary: { danger: number; warn: number };
  flags: { adEfficiencyLow: boolean } | null;
  issueCount: number;
  noteCount: number;
}

type Type = "daily" | "weekly" | "monthly";

export default function ReportsPage() {
  const { user } = useAuth();
  const [type, setType] = useState<Type>("daily");
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState("");
  const viewer = user?.role === "viewer";

  useEffect(() => {
    setItems(null);
    setErr("");
    const q = new URLSearchParams({ type, limit: "120" });
    if (!viewer && status !== "all") q.set("status", status);
    api<Item[]>(`/reports?${q}`).then(setItems).catch((e) => setErr(e.message));
  }, [type, status, viewer]);

  const pending = useMemo(() => (items ?? []).filter((i) => i.status === "pending"), [items]);
  const featured = items?.[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">보고서</h1>
          <p className="sub">{viewer ? "승인된 보고서를 화면에서 보고 PDF로 내려받을 수 있어요." : "승인 전 보고서도 함께 보여요."}</p>
        </div>
        <Segmented<Type> value={type} onChange={setType} options={[{ value: "daily", label: "일일" }, { value: "weekly", label: "주간" }, { value: "monthly", label: "월말" }]} />
      </div>

      {!viewer ? (
        <div className="row-wrap mb16">
          {[["all", "전체"], ["pending", "승인 대기"], ["published", "승인됨"], ["rejected", "반려됨"]].map(([v, l]) => (
            <Chip key={v} on={status === v} onClick={() => setStatus(v)}>{l}</Chip>
          ))}
        </div>
      ) : null}

      {user?.role === "admin" && pending.length > 0 && type === "daily" ? (
        <Link href={`/reports/${pending[0].id}`} className="card tint mb12" style={{ display: "block" }}>
          <div className="spread">
            <div>
              <div className="t1">{dateShort(pending[0].date)} 보고서가 승인을 기다리고 있어요</div>
              <div className="cap mt8">확인하고 승인하면 대표와 팀장에게 공개돼요.</div>
            </div>
            <Icon name="right" />
          </div>
        </Link>
      ) : null}

      {err ? <div className="errbox">{err}</div> : items === null ? <Loading /> : items.length === 0 ? (
        <div className="card"><Empty title="보여 드릴 보고서가 없어요">조건을 바꿔 보세요.</Empty></div>
      ) : (
        <>
          {featured && featured.kpis ? (
            <Link href={`/reports/${featured.id}`} className="card card-hero mb12" style={{ display: "block" }}>
              <div className="row mb8">
                <Badge tone={STATUS_TONE[featured.status] as "green"}>{STATUS_LABEL[featured.status]}</Badge>
                <span className="cap">{REPORT_TYPE_LABEL[featured.type]} 보고서 · {dateKo(featured.date)}</span>
              </div>
              <div className="cap">{featured.type === "daily" ? "어제" : featured.type === "weekly" ? "지난주" : "지난달"} 마감 매출</div>
              <div className="hero-amount n">{num(featured.kpis.sales)}원</div>
              <div className="row mt8" style={{ flexWrap: "wrap" }}>
                <span><Delta value={featured.kpis.delta.sales} /> <span className="cap">전 기간보다</span></span>
                <span className="cap">·</span>
                <span className="cap">광고 효율 <b className="n" style={{ color: "var(--g900)" }}>{featured.kpis.adEfficiency}배</b></span>
                <span className="cap">·</span>
                <span className="cap">주문 <b className="n" style={{ color: "var(--g900)" }}>{num(featured.kpis.orders)}건</b></span>
              </div>
            </Link>
          ) : null}

          <div className="card">
            {items.map((i) => (
              <Link key={i.id} href={`/reports/${i.id}`} className="lr">
                <div className="av"><Icon name="report" size={22} /></div>
                <div className="grow">
                  <div className="row-wrap">
                    <span className="semi">{dateShort(i.date)}</span>
                    <Badge tone={STATUS_TONE[i.status] as "green"}>{STATUS_LABEL[i.status]}</Badge>
                    {i.stockSummary.danger > 0 ? <Badge tone="red">재고 위험 {i.stockSummary.danger}</Badge> : null}
                    {i.stockSummary.warn > 0 ? <Badge tone="orange">주의 {i.stockSummary.warn}</Badge> : null}
                    {i.issueCount > 0 ? <Badge tone="orange">수집 확인</Badge> : null}
                    {i.noteCount > 0 ? <Badge tone="blue">메모 {i.noteCount}</Badge> : null}
                  </div>
                  <div className="cap mt8">
                    {i.type !== "daily" ? `${dateShort(i.periodStart)} ~ ${dateShort(i.periodEnd)} · ` : ""}
                    매출 <b className="n" style={{ color: "var(--g900)" }}>{man(i.kpis?.sales)}</b> <Delta value={i.kpis?.delta?.sales} /> · 광고 효율 <span className="n">{i.kpis?.adEfficiency}배</span>
                    {i.status === "rejected" && i.rejectedReason ? ` · 반려: ${i.rejectedReason}` : ""}
                  </div>
                </div>
                <Icon name="right" size={18} />
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
