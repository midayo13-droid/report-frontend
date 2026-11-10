import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "모아뷰티 리포트",
  description: "매일 아침 매출·광고·재고를 한 번에 보고, 확인하고, 승인하는 보고서 서비스 (가상 데이터로 만든 과제 시연용)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 토스와 가장 비슷한 무료 한글 글꼴(Pretendard). 못 불러오면 시스템 글꼴로 보여요. */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
