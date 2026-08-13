import { ReactNode } from "react";
import { AdminShell } from "@/_app/admin-shell";

const ProtectedLayout = ({ children }: { children: ReactNode }) => (
  <AdminShell>{children}</AdminShell>
);

export default ProtectedLayout;
