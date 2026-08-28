import type { Action } from "@dadamjang/mobile";

type Handler = () => void;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type Assert<T extends true> = T;
type Reject<T extends false> = T;

export type IconActionIsValid = Assert<
  IsAssignable<
    {
      accessibilityLabel: "장바구니";
      icon: { md: "shopping_cart"; sf: "cart" };
      onPress: Handler;
    },
    Action
  >
>;

export type TextActionIsValid = Assert<
  IsAssignable<{ label: "취소"; onPress: Handler }, Action>
>;

export type IconAndLabelActionIsValid = Assert<
  IsAssignable<
    {
      accessibilityLabel: "장바구니 열기";
      icon: { md: "shopping_cart"; sf: "cart" };
      label: "장바구니";
      onPress: Handler;
    },
    Action
  >
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
