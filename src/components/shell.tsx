"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, type Role } from "@/components/providers";
import { Button, Dialog, Icon, Loading } from "@/components/ui";

interface NavItem { href: string; label: string; icon: string }

// 메뉴는 역할마다 보이는 항목이 달라요. (서버도 같은 규칙으로 한 번 더 막아요)
const NAV: Record<Role, NavItem[]> = {
  viewer: [{ href: "/reports", label: "보고서", icon: "report" }],
  user: [
    { href: "/reports", label: "보고서", icon: "report" },
    { href: "/collect", label: "수집", icon: "collect" },
    { href: "/templates", label: "양식", icon: "template" },
    { href: "/criteria", label: "기준", icon: "criteria" },
    { href: "/audit", label: "이력", icon: "audit" },
  ],
  admin: [
    { href: "/reports", label: "보고서", icon: "report" },
    { href: "/approvals", label: "승인", icon: "approve" },
    { href: "/criteria", label: "기준", icon: "criteria" },
    { href: "/templates", label: "양식", icon: "template" },
    { href: "/collect", label: "수집", icon: "collect" },
    { href: "/audit", label: "이력", icon: "audit" },
    { href: "/demo", label: "시연", icon: "demo" },
  ],
  superadmin: [
    { href: "/reports", label: "보고서", icon: "report" },
    { href: "/collect", label: "수집", icon: "collect" },
    { href: "/admin", label: "계정·연결", icon: "admin" },
    { href: "/audit", label: "이력", icon: "audit" },
  ],
};

export function navFor(role: Role) {
  return NAV[role];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  if (!user) return <Loading text="확인하고 있어요" />;
  const items = NAV[user.role];
  const on = (href: string) => path === href || path.startsWith(href + "/");
  const mobileMain = items.length > 5 ? items.slice(0, 4) : items;
  const mobileMore = items.length > 5 ? items.slice(4) : [];

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/reports" className="brand"><i />모아뷰티 리포트</Link>
          <nav className="nav" aria-label="메뉴">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className={on(i.href) ? "on" : ""}>{i.label}</Link>
            ))}
          </nav>
          <button className="userchip" onClick={() => setMenu(true)} aria-label="내 정보">
            {user.name} · {user.roleLabel}
          </button>
        </div>
      </header>
      <main className="content">{children}</main>

      <nav className="tabbar" aria-label="메뉴">
        {mobileMain.map((i) => (
          <Link key={i.href} href={i.href} className={on(i.href) ? "on" : ""}>
            <Icon name={i.icon} />
            {i.label}
          </Link>
        ))}
        {mobileMore.length ? (
          <button onClick={() => setMore(true)} className={mobileMore.some((i) => on(i.href)) ? "on" : ""}>
            <Icon name="more" />
            더보기
          </button>
        ) : null}
      </nav>

      <Dialog open={more} onClose={() => setMore(false)} title="더보기">
        {mobileMore.map((i) => (
          <Link key={i.href} href={i.href} onClick={() => setMore(false)} className="lr" style={{ borderTop: "1px solid var(--g200)" }}>
            <span className="av"><Icon name={i.icon} /></span>
            <span className="grow semi">{i.label}</span>
            <Icon name="right" size={18} />
          </Link>
        ))}
      </Dialog>

      <Dialog
        open={menu}
        onClose={() => setMenu(false)}
        title="내 정보"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setMenu(false);
              logout();
              router.replace("/login");
            }}
          >
            로그아웃
          </Button>
        }
      >
        <div className="stack">
          <div className="tr"><span className="cap">이름</span><span className="semi">{user.name}</span></div>
          <div className="tr"><span className="cap">직함</span><span className="semi">{user.title || "-"}</span></div>
          <div className="tr"><span className="cap">역할</span><span className="semi">{user.roleLabel}</span></div>
          <div className="tr"><span className="cap">담당 영역</span><span className="semi">{user.areaLabel}</span></div>
          <div className="tr"><span className="cap">이메일</span><span className="semi">{user.email}</span></div>
        </div>
      </Dialog>
    </>
  );
}
