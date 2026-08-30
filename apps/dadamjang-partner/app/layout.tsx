import type { Metadata } from "next";
import { ReactNode } from "react";

import { AppProviders } from "@/_app/providers";
import "@/_app/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "다담장 파트너", template: "%s | 다담장 파트너" },
  description: "다담장 파트너 상품 관리",
  robots: { index: false, follow: false },
};
const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="ko">
      <body>
        <div className="mobile-block">
          <h1>지원하지 않는 화면 크기입니다</h1>
          <p>태블릿 또는 데스크톱(768px 이상)에서 이용해 주세요.</p>
        </div>
        <div className="desktop">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
};

export default Layout;
