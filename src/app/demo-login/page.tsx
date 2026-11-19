"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth, type User } from "@/components/providers";
import { Badge, Button, Field, Icon, Loading } from "@/components/ui";

// 데모 체험용 로그인 화면이에요. 권한(역할)마다 가상 계정 한 명으로 비밀번호 없이 바로 들어가요.
// 기존 로그인(/login)은 그대로 두고, 세일즈 키트나 시연 링크에는 이 주소(/demo-login)를 써요.
interface Demo { enabled: boolean; accounts: User[] }

const ROLES: { role: User["role"]; email: string; label: string; who: string; does: string; icon: string }[] = [
  { role: "viewer", email: "ceo@moabeauty.test", label: "조회자", who: "대표 · 팀장", does: "승인된 보고서 보기, PDF 받기", icon: "report" },
  { role: "user", email: "stock@moabeauty.test", label: "사용자", who: "운영 · 마케팅 · 재고", does: "수집 확인, 확인 메모 쓰기", icon: "criteria" },
  { role: "admin", email: "director@moabeauty.test", label: "관리자", who: "이 이사", does: "승인·반려, 기준 수정안 승인", icon: "approve" },
  { role: "superadmin", email: "sysadmin@moabeauty.test", label: "총관리자", who: "운영 담당 겸임", does: "계정, 권한, 연결 키 관리", icon: "admin" },
];

export default function DemoLoginPage() {
  const { user, login, demoLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [demo, setDemo] = useState<Demo | null | undefined>(undefined);

  useEffect(() => {
    api<Demo>("/auth/demo-accounts").then(setDemo).catch((e: ApiError) => {
      setDemo(null);
      setErr(e.message);
    });
  }, []);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setErr("");
    try {
      await fn();
      router.replace("/reports");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "로그인에 실패했어요.");
      setBusy("");
    }
  }

  const accountOf = (e: string) => demo?.accounts.find((a) => a.email === e);
  const enabled = !!demo?.enabled;

  return (
    <div className="login-wrap">
      <div className="login-card stack" style={{ gap: 16 }}>
        <div style={{ padding: "0 4px" }}>
          <div className="row" style={{ marginBottom: 14, justifyContent: "space-between" }}>
            <div className="brand"><i />모아뷰티 리포트</div>
            <Badge tone="orange">데모</Badge>
          </div>
          <h1 className="h1">매일 아침 보고서,<br />확인하고 승인만 하세요</h1>
          <p className="sub">판매처·광고·재고를 자동으로 모아 보고서를 만들어 드려요.</p>
          {user ? <p className="cap mt8">지금 <b>{user.name} · {user.roleLabel}</b> 계정으로 들어와 있어요. 아래 카드를 누르면 역할이 바뀌어요.</p> : null}
        </div>

        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            run("form", () => login(email, password));
          }}
        >
          <Field label="이메일">
            <input className="input" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="비밀번호">
            <input className="input" type="password" autoComplete="current-password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" size="xl" block disabled={!!busy || !email || !password}>로그인</Button>
        </form>

        <div className="divider-text">또는 데모로 바로 체험</div>

        <div className="card stack">
          <p className="cap" style={{ margin: 0 }}>가상 계정이라 비밀번호 없이 들어가요. 카드를 누르면 그 역할로 자동 로그인돼요.</p>
          {demo === undefined ? <Loading /> : !enabled ? (
            <div className="warnbox">지금은 데모 계정을 쓸 수 없어요. 위의 로그인을 이용해 주세요.</div>
          ) : (
            <div className="role-grid">
              {ROLES.map((r) => {
                const a = accountOf(r.email);
                const who = a ? `${a.name}${r.role === "user" ? `(${a.areaLabel})` : ""}` : r.who;
                return (
                  <button key={r.role} type="button" className="role-card" disabled={!!busy || !a} onClick={() => run(r.role, () => demoLogin(r.email))}>
                    <span className="rt"><Icon name={r.icon} size={18} />{r.label}</span>
                    <span className="rd">{r.who}<br />{r.does}</span>
                    <span className="rn">{busy === r.role ? "들어가는 중…" : `${who} 계정으로 입장`}</span>
                  </button>
                );
              })}
            </div>
          )}
          {err ? <div className="errbox">{err}</div> : null}
        </div>

        <p className="cap-s" style={{ padding: "0 4px", margin: 0 }}>화면의 회사, 사람, 숫자는 모두 과제용 가상 설정이에요. 서버가 쉬고 있으면 처음 한 번은 1분쯤 걸릴 수 있어요.</p>
      </div>
    </div>
  );
}
