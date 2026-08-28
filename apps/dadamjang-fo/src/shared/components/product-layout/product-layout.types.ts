import type { ReactNode } from "react";
import type { ActionButtonGroupVariant, IconAction } from "@dadamjang/mobile";

export interface ProductLayoutProps {
  headerActions: IconAction[];
  variant: ActionButtonGroupVariant;
  children: ReactNode;
}
