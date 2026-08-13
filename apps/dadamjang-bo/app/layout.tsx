import type { Metadata } from "next";
import { ReactNode } from "react";
import { AppProviders } from "@/_app/providers";
import "@/_app/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "다담장 관리자", template: "%s | 다담장 관리자" },
  description: "다담장 내부 운영 관리자",
  robots: { index: false, follow: false },
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <html lang="ko">
    <body>
      <AppProviders>{children}</AppProviders>
    </body>
  </html>
);

export default RootLayout;
