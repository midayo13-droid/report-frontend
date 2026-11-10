"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAuth, useToast } from "@/components/providers";
import { Badge, Button, Dialog, Empty, Field, Loading, Segmented, Switch } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES = [["viewer", "조회자"], ["user", "사용자"], ["admin", "관리자"], ["superadmin", "총관리자"]];
const AREAS = [["none", "없음"], ["ops", "운영"], ["marketing", "마케팅"], ["stock", "재고"]];
const CONN: Record<string, [string, "green" | "orange" | "red"]> = { ok: ["정상", "green"], expired: ["만료", "orange"], error: ["오류", "red"] };

export default function AdminPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<"users" | "conns">("users");
  const [users, setUsers] = useState<any[] | null>(null);
  const [conns, setConns] = useState<any[] | null>(null);
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState<any>({ role: "user", area: "none" });
  const [pw, setPw] = useState<any>(null);
  const [pwText, setPwText] = useState("");
  const [key, setKey] = useState<any>(null);
  const [keyText, setKeyText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, c] = await Promise.all([api<any[]>("/users"), api<any[]>("/connections")]);
      setUsers(u);
      setConns(c);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "불러오지 못했어요.", "err");
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;
  if (user.role !== "superadmin") return <div className="card"><Empty title="총관리자만 볼 수 있어요" /></div>;
  if (!users || !conns) return <Loading />;

  async function run(fn: () => Promise<unknown>, ok: string, onFail?: (m: string) => void) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      toast(ok);
      await load();
    } catch (e) {
      const m = e instanceof ApiError ? e.message : "문제가 생겼어요.";
      if (onFail) onFail(m);
      else toast(m, "err");
    } finally {
      setBusy(false);
    }
  }
  const patch = (id: number, body: any) => run(() => api(`/users/${id}`, { method: "PATCH", body }), "저장했어요.");

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">계정·연결</h1>
          <p className="sub">계정과 권한, 판매처·광고·재고 연결 키를 관리해요.</p>
        </div>
        <Segmented<"users" | "conns"> value={tab} onChange={setTab} options={[{ value: "users", label: "계정" }, { value: "conns", label: "연결 키" }]} />
      </div>

      {tab === "users" ? (
        <section className="card">
          <div className="spread mb8">
            <h2 className="t1">계정 {users.length}개</h2>
            <Button variant="secondary" onClick={() => { setCreate(true); setForm({ role: "user", area: "none" }); setErr(""); }}>계정 만들기</Button>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>담당 영역</th><th>사용</th><th /></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><div className="semi">{u.name}</div><div className="cap-s">{u.title}</div></td>
                    <td className="cap">{u.email}</td>
                    <td>
                      <select className="select" style={{ minHeight: 36, padding: "4px 8px" }} value={u.role} disabled={busy || u.id === user.id} onChange={(e) => patch(u.id, { role: e.target.value })} aria-label={`${u.name} 역할`}>
                        {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="select" style={{ minHeight: 36, padding: "4px 8px" }} value={u.area} disabled={busy} onChange={(e) => patch(u.id, { area: e.target.value })} aria-label={`${u.name} 담당 영역`}>
                        {AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td><Switch on={u.is_active} label={`${u.name} 사용`} onChange={(v) => u.id !== user.id && patch(u.id, { isActive: v })} /></td>
                    <td><Button size="s" onClick={() => { setPw(u); setPwText(""); setErr(""); }}>비밀번호</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cap-s mt12">내 계정은 역할을 낮추거나 정지할 수 없어요. (관리가 막히는 것을 막기 위해서예요)</p>
        </section>
      ) : (
        <section className="card">
          <h2 className="t1 mb8">연결 키</h2>
          <p className="cap mb8">키 원문은 저장하지 않고 암호화한 값만 저장해요. 화면에는 끝 4자리만 보여요.</p>
          {conns.map((c) => (
            <div key={c.code} className="lr">
              <div className="grow">
                <div className="semi">{c.name}</div>
                <div className="cap">{c.keyMasked || "키 없음"} · {c.updatedBy ?? "-"} · {dateTime(c.checkedAt)}</div>
              </div>
              <Badge tone={(CONN[c.status] ?? CONN.error)[1]}>{(CONN[c.status] ?? CONN.error)[0]}</Badge>
              <Button size="s" onClick={() => { setKey(c); setKeyText(""); setErr(""); }}>키 교체</Button>
            </div>
          ))}
        </section>
      )}

      <Dialog
        open={create}
        onClose={() => setCreate(false)}
        title="계정 만들기"
        footer={<><Button variant="secondary" onClick={() => setCreate(false)}>취소</Button><Button variant="primary" disabled={busy} onClick={() => run(async () => { await api("/users", { method: "POST", body: form }); setCreate(false); }, "계정을 만들었어요.", setErr)}>만들기</Button></>}
      >
        <div className="stack">
          <Field label="이름"><input className="input" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="이메일"><input className="input" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="비밀번호" helper="8자 이상"><input className="input" type="password" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <div className="grid2" style={{ gap: 12 }}>
            <Field label="역할"><select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="담당 영역"><select className="select" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>{AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          </div>
          <Field label="직함 (선택)"><input className="input" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          {err ? <div className="errbox">{err}</div> : null}
        </div>
      </Dialog>

      <Dialog
        open={!!pw}
        onClose={() => setPw(null)}
        title={pw ? `${pw.name} 비밀번호 바꾸기` : ""}
        footer={<><Button variant="secondary" onClick={() => setPw(null)}>취소</Button><Button variant="primary" disabled={busy || pwText.length < 8} onClick={() => run(async () => { await api(`/users/${pw.id}`, { method: "PATCH", body: { password: pwText } }); setPw(null); }, "비밀번호를 바꿨어요.", setErr)}>바꾸기</Button></>}
      >
        <Field label="새 비밀번호" helper="8자 이상" error={err}><input className="input" type="password" value={pwText} onChange={(e) => setPwText(e.target.value)} autoComplete="new-password" /></Field>
      </Dialog>

      <Dialog
        open={!!key}
        onClose={() => setKey(null)}
        title={key ? `${key.name} 연결 키 교체` : ""}
        footer={<><Button variant="secondary" onClick={() => setKey(null)}>취소</Button><Button variant="primary" disabled={busy || keyText.length < 8} onClick={() => run(async () => { await api(`/connections/${key.code}`, { method: "PUT", body: { key: keyText } }); setKey(null); }, "연결 키를 바꿨어요.", setErr)}>교체하기</Button></>}
      >
        <Field label="새 연결 키" helper="화면에 남지 않고 암호화해서 저장해요." error={err}><input className="input" type="password" value={keyText} onChange={(e) => setKeyText(e.target.value)} autoComplete="off" /></Field>
      </Dialog>
    </>
  );
}
