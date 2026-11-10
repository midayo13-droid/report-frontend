"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth, type User } from "@/components/providers";
import { Button, Field, Loading } from "@/components/ui";

interface Demo { enabled: boolean; accounts: User[] }

const GROUPS: { role: User["role"]; title: string }[] = [
  { role: "viewer", title: "조회자 (대표·팀장)" },
  { role: "user", title: "사용자 (운영·마케팅·재고)" },
  { role: "admin", title: "관리자" },
  { role: "superadmin", title: "총관리자" },
];

export default function LoginPage() {
  const { user, login, demoLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<Demo | null | undefined>(undefined);

  useEffect(() => {
    if (user) router.replace("/reports");
  }, [user, router]);

  useEffect(() => {
    api<Demo>("/auth/demo-accounts").then(setDemo).catch((e: ApiError) => {
      setDemo(null);
      setErr(e.message);
    });
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      router.replace("/reports");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card stack" style={{ gap: 16 }}>
        <div style={{ padding: "0 4px" }}>
          <div className="brand" style={{ marginBottom: 14 }}><i />모아뷰티 리포트</div>
          <h1 className="h1">매일 아침 보고서,<br />확인하고 승인만 하세요</h1>
          <p className="sub">판매처·광고·재고를 자동으로 모아 보고서를 만들어 드려요.</p>
        </div>

        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => login(email, password));
          }}
        >
          <Field label="이메일">
            <input className="input" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="비밀번호" error={err && !demo?.enabled ? err : undefined}>
            <input className="input" type="password" autoComplete="current-password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {err && demo?.enabled ? <div className="errbox">{err}</div> : null}
          <Button type="submit" variant="primary" size="xl" block disabled={busy || !email || !password}>로그인</Button>
        </form>

        {demo === undefined ? <Loading /> : demo?.enabled ? (
          <div className="card stack">
            <div>
              <h2 className="t1">시연용 계정으로 바로 들어가기</h2>
              <p className="cap mt8">과제 시연을 위한 가상 계정이에요. 비밀번호 없이 들어가요.</p>
            </div>
            {GROUPS.map((g) => {
              const list = demo.accounts.filter((a) => a.role === g.role);
              if (!list.length) return null;
              return (
                <div key={g.role}>
                  <div className="cap semi mb8">{g.title}</div>
                  <div className="demo-grid">
                    {list.map((a) => (
                      <button key={a.id} className="demo-btn" disabled={busy} onClick={() => run(() => demoLogin(a.email))}>
                        <b>{a.name}</b>
                        <span>{a.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
