import type { ReactNode } from "react";
import type { Action } from "../action-button/action-button.types";

type SingleButtonTwoActions = [[Action, Action]];
type TwoButtonsSingleAction = [[Action], [Action]];

export type ProductLayoutHeaderActionsType =
  | SingleButtonTwoActions
  | TwoButtonsSingleAction;
export interface ProductLayoutProps {
  headerActions: ProductLayoutHeaderActionsType;
  children: ReactNode;
}
