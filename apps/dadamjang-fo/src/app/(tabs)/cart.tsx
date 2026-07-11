import { CartView, useCart, useCartActions } from '@/features/cart';
import { trackCommerceEvent } from '@/features/analytics';
import { ScreenTitle } from '@/shared/components';

const CartScreen = () => {
  const cart = useCart();
  const actions = useCartActions();
  const checkout = () => {
    if (actions.checkout.isPending) return;
    if (cart.data?.cartId) {
      trackCommerceEvent({ eventType: 'CHECKOUT_CLICKED', subjectType: 'CART', subjectId: cart.data.cartId });
    }
    actions.checkout.mutate(undefined);
  };
  const checkoutFailure = () => {
    if (actions.checkout.isPending) return;
    if (cart.data?.cartId) {
      trackCommerceEvent({ eventType: 'CHECKOUT_FAILURE_TEST_CLICKED', subjectType: 'CART', subjectId: cart.data.cartId });
    }
    actions.checkout.mutate({ forcePaymentFailure: true });
  };

  return (
    <>
      <ScreenTitle title="장바구니" subtitle="선택한 위시템을 한 번에 주문해요." />
      <CartView
        cart={cart.data}
        loading={cart.isPending}
        onRemove={(skuId) => actions.remove.mutate(skuId)}
        onChangeQuantity={(skuId, quantity) => actions.upsert.mutate({ skuId, quantity })}
        onCheckout={checkout}
        onCheckoutFailure={checkoutFailure}
        checkoutPending={actions.checkout.isPending}
      />
    </>
  );
};

export default CartScreen;
