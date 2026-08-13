import { ReactNode } from "react";
import styles from "./auth-layout.module.css";

export const AuthLayout = ({ children }: { children: ReactNode }) => (
  <>
    <main className={styles.page}>
      <section className={styles.intro} aria-label="다담장 관리자">
        <div className={styles.brand}>
          <span className={styles.brandName}>다담장</span>
          <span className={styles.brandRole}>BACKOFFICE</span>
        </div>
        <div className={styles.introCopy}>
          <h1>판단이 필요한 일만 선명하게.</h1>
          <p>승인, 주문, 운영 이력을 한곳에서 차분하게 관리합니다.</p>
        </div>
      </section>
      <section className={styles.content}>{children}</section>
    </main>
    <section className={styles.unsupported}>
      <p>관리자 화면은 768px 이상 태블릿 또는 데스크톱에서 지원합니다.</p>
    </section>
  </>
);

export { styles as authLayoutStyles };
