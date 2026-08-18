import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/config/brand";
import { DataProvider } from "@/lib/store/data";
import { SessionProvider } from "@/lib/store/session";
import { Toaster } from "@/components/ui/sonner";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: `${BRAND.name}는 유튜브 쇼츠, 블로그, 카페 바이럴, 언론보도 등 바이럴 마케팅 서비스를 온라인에서 간편하게 주문하고 진행 상황을 관리하는 B2B 플랫폼입니다.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full antialiased`}>
      <head>
        {/* 한국어 타이포그래피 — Pretendard (CDN 사용 불가 시 시스템 한글 폰트로 폴백) */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">
        <SessionProvider>
          <DataProvider>
            {children}
            <Toaster position="top-center" richColors />
          </DataProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
