import type { useCartActions } from "@/features/cart/hooks";
import type { CheckoutCartOptions } from "@/features/cart/types";
import type { useToggleStylePostLike } from "@/features/style/hooks";
import type { useWishActions } from "@/features/wish/hooks";
import type { useUpdateFoNotificationPreferences } from "@/features/notification/hooks";
import type { UpdateFoNotificationPreferencesInput } from "@/features/notification/types";

type Exact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;
type Checkout = ReturnType<typeof useCartActions>["checkout"];
type Style = ReturnType<typeof useToggleStylePostLike>;
type Wish = ReturnType<typeof useWishActions>["add"];
type Preferences = ReturnType<typeof useUpdateFoNotificationPreferences>;
type CallbackVariables<Options> = Options extends {
  onSuccess?: (...args: infer Args) => unknown;
}
  ? Args[1]
  : never;

export type CheckoutVariables = Assert<
  Exact<Checkout["variables"], CheckoutCartOptions | undefined>
>;
export type StyleVariables = Assert<
  Exact<
    Style["variables"],
    { stylePostId: string; nextLiked: boolean } | undefined
  >
>;
export type WishVariables = Assert<
  Exact<Wish["variables"], string | undefined>
>;
export type PreferenceVariables = Assert<
  Exact<
    Preferences["variables"],
    UpdateFoNotificationPreferencesInput | undefined
  >
>;
export type CheckoutCallback = Assert<
  Exact<
    CallbackVariables<NonNullable<Parameters<Checkout["mutate"]>[1]>>,
    CheckoutCartOptions | undefined
  >
>;
export type StyleCallback = Assert<
  Exact<
    CallbackVariables<NonNullable<Parameters<Style["mutate"]>[1]>>,
    { stylePostId: string; nextLiked: boolean }
  >
>;
export type WishCallback = Assert<
  Exact<CallbackVariables<NonNullable<Parameters<Wish["mutate"]>[1]>>, string>
>;
export type PreferenceCallback = Assert<
  Exact<
    CallbackVariables<NonNullable<Parameters<Preferences["mutate"]>[1]>>,
    UpdateFoNotificationPreferencesInput
  >
>;
