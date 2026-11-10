"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ACTION_LABEL, dateTime } from "@/lib/format";
import { useAuth, useToast } from "@/components/providers";
import { Chip, Empty, Loading } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const FILTERS: [string, string][] = [["", "전체"], ["report", "보고서"], ["criteria", "기준"], ["template", "양식"], ["collect", "수집"], ["ai", "AI"], ["auth", "로그인"], ["user", "계정"]];

function summary(a: any): string {
  const d = a.detail ?? {};
  const parts: string[] = [];
  if (d.type) parts.push(`${({ daily: "일일", weekly: "주간", monthly: "월말" } as any)[d.type] ?? d.type}`);
  if (d.date) parts.push(d.date);
  if (d.reason) parts.push(`이유: ${d.reason}`);
  if (d.value) parts.push(`값 ${d.value}`);
  if (d.effectiveFrom) parts.push(`${d.effectiveFrom}부터 적용`);
  if (d.version) parts.push(`v${d.version}`);
  if (d.source) parts.push(d.source === "gpt" ? "GPT" : "미리 정해 둔 답");
  if (d.failed !== undefined) parts.push(`실패 ${d.failed}곳`);
  if (d.masked) parts.push(d.masked);
  if (d.email) parts.push(d.email);
  if (!parts.length && a.target_id) parts.push(`${a.target_type} ${a.target_id}`);
  return parts.join(" · ");
}

export default function AuditPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    setRows(null);
    api<any[]>(`/audit?limit=150${f ? `&action=${f}` : ""}`).then(setRows).catch((e) => toast(e instanceof ApiError ? e.message : "불러오지 못했어요.", "err"));
  }, [f, toast]);

  if (!user) return null;
  const all = user.role === "admin" || user.role === "superadmin";

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">이력</h1>
          <p className="sub">{all ? "누가 언제 무엇을 했는지 모두 보여요. 이력은 지우거나 고칠 수 없어요." : "내가 한 일만 보여요."}</p>
        </div>
      </div>
      <div className="row-wrap mb16">{FILTERS.map(([v, l]) => <Chip key={v} on={f === v} onClick={() => setF(v)}>{l}</Chip>)}</div>
      <section className="card">
        {rows === null ? <Loading /> : rows.length === 0 ? <Empty title="이력이 없어요" /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>시각</th><th>한 사람</th><th>한 일</th><th>내용</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="n" style={{ whiteSpace: "nowrap" }}>{dateTime(a.created_at)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{a.actor_name ?? "시스템"}</td>
                    <td className="semi">{ACTION_LABEL[a.action] ?? a.action}</td>
                    <td className="cap">{summary(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
