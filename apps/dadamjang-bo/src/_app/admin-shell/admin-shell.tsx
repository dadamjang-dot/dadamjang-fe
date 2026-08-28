"use client";

import { ActionButton, Callout, SidePanel, Skeleton } from "@seed-design/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { AdminApiError } from "@/shared/api";
import {
  adminSessionQuery,
  invalidateSession,
  logoutAdminSession,
} from "@/shared/auth";
import { useAdminSnackbar } from "@/shared/ui";
import styles from "./admin-shell.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/partners", label: "파트너 승인" },
  { href: "/products", label: "상품 승인" },
  { href: "/orders", label: "주문 관리" },
  { href: "/categories", label: "카테고리" },
  { href: "/admins", label: "관리자" },
  { href: "/audit-logs", label: "감사 로그" },
] as const;

const Navigation = ({
  pathname,
  close,
}: {
  pathname: string;
  close?: () => void;
}) => (
  <nav className={styles.navigation} aria-label="관리자 메뉴">
    {NAV_ITEMS.map((item) => {
      const active =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
          aria-current={active ? "page" : undefined}
          onClick={close}
        >
          {item.label}
        </Link>
      );
    })}
  </nav>
);

const Brand = () => (
  <div className={styles.brand}>
    <span className={styles.brandName}>다담장</span>
    <span className={styles.brandRole}>BACKOFFICE</span>
  </div>
);

export const AdminShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const notify = useAdminSnackbar();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const session = useQuery(adminSessionQuery());
  const logout = useMutation({
    mutationFn: logoutAdminSession,
    onError: (error) =>
      notify(
        error instanceof AdminApiError
          ? error.message
          : "로그아웃하지 못했습니다.",
      ),
  });

  useEffect(() => {
    if (session.data && session.data.role !== "ADMIN") invalidateSession();
    else if (session.isError) router.replace("/login");
  }, [router, session.data, session.isError]);

  if (session.isPending)
    return (
      <div className={styles.gate} aria-label="관리자 세션 확인 중">
        <Skeleton width="280px" height="48px" />
      </div>
    );

  if (!session.data || session.data.role !== "ADMIN")
    return (
      <div className={styles.gate}>
        <Callout.Root tone="critical">
          <Callout.Content>
            <Callout.Title>관리자 권한을 확인할 수 없습니다</Callout.Title>
            <Callout.Description>
              로그인 화면으로 이동합니다.
            </Callout.Description>
          </Callout.Content>
        </Callout.Root>
      </div>
    );

  const navigation = (
    <div className={styles.navInner}>
      <Brand />
      <Navigation pathname={pathname} close={() => setNavigationOpen(false)} />
      <div className={styles.navFooter}>
        <span className={styles.userId}>{session.data.userid}</span>
        <ActionButton
          variant="neutralOutline"
          size="small"
          loading={logout.isPending}
          onClick={() => logout.mutate()}
        >
          로그아웃
        </ActionButton>
      </div>
    </div>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.desktopNav}>{navigation}</aside>
      <div className={styles.content}>
        <header className={styles.tabletHeader}>
          <Brand />
          <ActionButton
            variant="neutralOutline"
            onClick={() => setNavigationOpen(true)}
            aria-label="관리자 메뉴 열기"
          >
            메뉴
          </ActionButton>
        </header>
        <SidePanel.Root
          open={navigationOpen}
          onOpenChange={setNavigationOpen}
          direction="left"
        >
          <SidePanel.Backdrop className={styles.panelNavBackdrop} />
          <SidePanel.Positioner className={styles.panelNavPositioner}>
            <SidePanel.Content className={styles.panelNavContent}>
              <SidePanel.Title className="sr-only">관리자 메뉴</SidePanel.Title>
              <SidePanel.Body className={styles.panelNavBody}>
                {navigation}
              </SidePanel.Body>
            </SidePanel.Content>
          </SidePanel.Positioner>
        </SidePanel.Root>
        <main className={styles.main}>{children}</main>
      </div>
      <section className={styles.unsupported}>
        <div>
          <h1>더 넓은 화면이 필요합니다</h1>
          <p>관리자 화면은 768px 이상 태블릿 또는 데스크톱에서 지원합니다.</p>
        </div>
      </section>
    </div>
  );
};
