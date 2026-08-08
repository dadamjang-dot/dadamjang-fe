import type { ReactNode } from "react";
import type { Action, ActionButtonGroupVariant } from "@dadamjang/mobile";

export interface ProductLayoutProps {
  headerActions: Action[];
  variant: ActionButtonGroupVariant;
  children: ReactNode;
}
