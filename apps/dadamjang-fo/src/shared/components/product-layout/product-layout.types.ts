import type { ReactNode } from "react";
import type { ActionButtonGroupVariant, IconAction } from "@dadamjang/mobile";

interface ProductLayoutBaseProps {
  children: ReactNode;
}

interface CircularProductLayoutProps extends ProductLayoutBaseProps {
  headerActions: readonly [IconAction, IconAction];
  variant: Extract<ActionButtonGroupVariant, "circularPair">;
}

interface CapsuleProductLayoutProps extends ProductLayoutBaseProps {
  headerActions: readonly IconAction[];
  variant: Extract<ActionButtonGroupVariant, "capsule">;
}

export type ProductLayoutProps =
  CircularProductLayoutProps | CapsuleProductLayoutProps;
