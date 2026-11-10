"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Loading } from "@/components/ui";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user === undefined) return;
    router.replace(user ? "/reports" : "/login");
  }, [user, router]);
  return <Loading text="들어가고 있어요" />;
}
