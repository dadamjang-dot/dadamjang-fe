import { ReactNode } from "react";
import { PartnerShell } from "@/_app/shell";
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>;
}
