import type { ReactNode } from "react";
import type { Action } from "../action-button/action-button.types";

export type ProductLayoutHeaderActionsType = [[Action, Action]] | [[Action], [Action]];
export interface ProductLayoutProps {
  headerActions: [[Action, Action]] | [[Action], [Action]];
  children: ReactNode;
}
