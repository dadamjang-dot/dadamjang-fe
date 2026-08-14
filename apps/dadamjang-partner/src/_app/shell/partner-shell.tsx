"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { ActionButton } from "@seed-design/react";
import { logout, myPartner, sessionQuery } from "@/shared/auth";
export const PartnerShell = ({ children }: { children: ReactNode }) => {
  const path = usePathname();
  const router = useRouter();
  const client = useQueryClient();
  const session = useQuery(sessionQuery());
  const partner = useQuery({
    queryKey: ["my-partner"],
    queryFn: myPartner,
    enabled: session.isSuccess && session.data.role === "PARTNER",
    retry: false,
  });
  if (session.isPending)
    return <main className="center">세션을 확인하고 있습니다.</main>;
  if (session.isError || session.data.role !== "PARTNER")
    return (
      <main className="center">
        <h1>파트너 계정이 아닙니다</h1>
        <ActionButton onClick={() => router.replace("/login")}>
          로그인으로
        </ActionButton>
      </main>
    );
  if (partner.isPending)
    return <main className="center">파트너 정보를 확인하고 있습니다.</main>;
  if (partner.isError)
    return (
      <main className="center" role="alert">
        파트너 정보를 불러오지 못했습니다.
      </main>
    );
  const linked =
    partner.data?.myPartner?.status === "APPROVED" &&
    !!partner.data.myPartner.brand;
  if (!linked)
    return (
      <main className="center">
        <div role="alert" className="gate">
          승인된 파트너와 연결 브랜드가 있어야 상품을 관리할 수 있습니다.
        </div>
        <ActionButton
          variant="neutralOutline"
          onClick={async () => {
            await logout();
            client.clear();
            router.replace("/login");
          }}
        >
          로그아웃
        </ActionButton>
      </main>
    );
  return (
    <div className="shell">
      <aside>
        <b>다담장 파트너</b>
        <nav>
          <Link
            className={path === "/dashboard" ? "active" : ""}
            href="/dashboard"
          >
            대시보드
          </Link>
          <Link
            className={path.startsWith("/products") ? "active" : ""}
            href="/products"
          >
            상품 관리
          </Link>
        </nav>
        <ActionButton
          variant="neutralOutline"
          onClick={async () => {
            await logout();
            client.clear();
            router.replace("/login");
          }}
        >
          로그아웃
        </ActionButton>
      </aside>
      <main>{children}</main>
    </div>
  );
};
