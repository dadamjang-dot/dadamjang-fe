import type {
  Action,
  ActionButtonGroupProps,
  ActionButtonProps,
  IconAction,
} from "@dadamjang/mobile";
import type { ProductLayoutProps } from "../src/shared/components/product-layout/product-layout.types";

type Handler = () => void;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type Assert<T extends true> = T;
type Reject<T extends false> = T;

type IconActionInput = {
  accessibilityLabel: "장바구니";
  icon: { md: "shopping_cart"; sf: "cart" };
  onPress: Handler;
};

type TextActionInput = { label: "취소"; onPress: Handler };

type LabeledIconActionInput = IconActionInput & { label: "장바구니" };

export type IconActionIsValid = Assert<
  IsAssignable<IconActionInput, Action>
>;

export type TextActionIsValid = Assert<
  IsAssignable<TextActionInput, Action>
>;

export type IconAndLabelActionIsInvalid = Reject<
  IsAssignable<LabeledIconActionInput, IconAction>
>;

export type EmptyActionIsInvalid = Reject<
  IsAssignable<{ onPress: Handler }, Action>
>;

export type IconWithoutAccessibleNameIsInvalid = Reject<
  IsAssignable<
    {
      icon: { md: "shopping_cart"; sf: "cart" };
      onPress: Handler;
    },
    Action
  >
>;

export type AccessibleNameWithoutContentIsInvalid = Reject<
  IsAssignable<
    { accessibilityLabel: "장바구니"; onPress: Handler },
    Action
  >
>;

export type IconAndLabelWithoutAccessibleNameIsInvalid = Reject<
  IsAssignable<
    {
      icon: { md: "shopping_cart"; sf: "cart" };
      label: "장바구니";
      onPress: Handler;
    },
    Action
  >
>;

export type TextWithIconIsInvalid = Reject<
  IsAssignable<
    {
      icon: { md: "shopping_cart"; sf: "cart" };
      label: "장바구니";
      onPress: Handler;
    },
    Action
  >
>;

export type ActionButtonAcceptsIconActions = Assert<
  IsAssignable<{ actions: IconActionInput[] }, ActionButtonProps>
>;

export type ActionButtonAcceptsTextActions = Assert<
  IsAssignable<{ actions: TextActionInput[] }, ActionButtonProps>
>;

export type ActionButtonGroupAcceptsIconActions = Assert<
  IsAssignable<{ actions: IconActionInput[] }, ActionButtonGroupProps>
>;

export type ActionButtonGroupRejectsTextActions = Reject<
  IsAssignable<{ actions: TextActionInput[] }, ActionButtonGroupProps>
>;

export type CircularPairAcceptsExactlyTwoActions = Assert<
  IsAssignable<
    {
      actions: [IconActionInput, IconActionInput];
      variant: "circularPair";
    },
    ActionButtonGroupProps
  >
>;

export type CircularPairRejectsOneAction = Reject<
  IsAssignable<
    { actions: [IconActionInput]; variant: "circularPair" },
    ActionButtonGroupProps
  >
>;

export type CircularPairRejectsUnboundedActions = Reject<
  IsAssignable<
    { actions: IconActionInput[]; variant: "circularPair" },
    ActionButtonGroupProps
  >
>;

export type ProductLayoutAcceptsIconHeaderActions = Assert<
  IsAssignable<
    {
      children: null;
      headerActions: IconActionInput[];
      variant: "capsule";
    },
    ProductLayoutProps
  >
>;

export type ProductLayoutRejectsTextHeaderActions = Reject<
  IsAssignable<
    {
      children: null;
      headerActions: TextActionInput[];
      variant: "capsule";
    },
    ProductLayoutProps
  >
>;

export type CircularProductLayoutRejectsOneAction = Reject<
  IsAssignable<
    {
      children: null;
      headerActions: [IconActionInput];
      variant: "circularPair";
    },
    ProductLayoutProps
  >
>;
