import { CartView, useCart, useCartActions } from '@/features/cart';
import { ScreenTitle } from '@/shared/components';

const CartScreen = () => {
  const cart = useCart();
  const actions = useCartActions();

  return (
    <>
      <ScreenTitle title="장바구니" subtitle="선택한 위시템을 한 번에 주문해요." />
      <CartView
        cart={cart.data}
        loading={cart.isPending}
        onRemove={(skuId) => actions.remove.mutate(skuId)}
        onCheckout={() => actions.checkout.mutate()}
      />
    </>
  );
};

export default CartScreen;
