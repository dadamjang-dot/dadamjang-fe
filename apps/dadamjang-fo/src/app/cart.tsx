import { LegendList } from "@legendapp/list/react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import { useCart, useCartActions } from "@/features/cart";
import { Button } from "@/shared/components";

const CartScreen = () => {
  const router = useRouter();
  const {
    authStatus,
    data: currentUser,
    isAuthenticated,
    redirectToSignIn,
    retryAuth,
  } = useAuthActionGate("/cart");
  const cart = useCart(isAuthenticated);
  const actions = useCartActions(currentUser?.userId);
  const checkoutAttempt = actions.checkoutAttempt;
  const hasUnavailableCart =
    cart.isLoading || cart.isError || !cart.data?.items.length;
  const isRecovering =
    (checkoutAttempt?.phase === "submitting" && hasUnavailableCart) ||
    checkoutAttempt?.phase === "uncertain" ||
    checkoutAttempt?.phase === "checking" ||
    checkoutAttempt?.phase === "retrying";
  const recoveryBusy =
    actions.isPending ||
    actions.check.isPending ||
    checkoutAttempt?.phase === "submitting" ||
    checkoutAttempt?.phase === "checking" ||
    checkoutAttempt?.phase === "retrying";
  const recoveryHeadline =
    checkoutAttempt?.phase === "submitting"
      ? "주문 요청을 보내고 있어요."
      : checkoutAttempt?.phase === "checking"
        ? "주문 결과를 확인하고 있어요."
        : checkoutAttempt?.phase === "retrying"
          ? "주문을 다시 요청하고 있어요."
          : "주문 처리 결과를 확인해 주세요.";
  const hasRecoveryError =
    actions.checkout.isError || actions.check.isError || actions.retry.isError;
  const recoveryActions = checkoutAttempt ? (
    <>
      <Button
        disabled={recoveryBusy || checkoutAttempt.phase !== "uncertain"}
        label="주문 결과 확인"
        onPress={() => actions.check.mutate()}
        testID="e2e.checkout.check"
      />
      {checkoutAttempt.expectedCart ? (
        <Button
          disabled={recoveryBusy || !actions.canRetry}
          label="주문 다시 시도"
          onPress={() => actions.retry.mutate()}
          testID="e2e.checkout.retry"
          variant="secondary"
        />
      ) : null}
    </>
  ) : null;

  useEffect(() => {
    if (authStatus === "unauthenticated") redirectToSignIn(true);
  }, [authStatus, redirectToSignIn]);

  useEffect(() => {
    if (
      isAuthenticated &&
      checkoutAttempt?.phase === "confirmed" &&
      checkoutAttempt.orderId
    )
      router.replace(`/order/${checkoutAttempt.orderId}`);
  }, [
    checkoutAttempt?.orderId,
    checkoutAttempt?.phase,
    isAuthenticated,
    router,
  ]);

  if (authStatus === "loading" || authStatus === "offline")
    return (
      <Text style={s.state}>
        {authStatus === "offline"
          ? "연결을 기다리고 있어요."
          : "로그인 상태를 확인하고 있어요."}
      </Text>
    );
  if (authStatus === "error") {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>로그인 상태를 확인하지 못했어요.</Text>
        <Button
          accessibilityLabel="다시 시도"
          onPress={() => void retryAuth()}
          variant="bare"
        >
          <Text style={s.link}>다시 시도</Text>
        </Button>
      </View>
    );
  }
  if (!isAuthenticated)
    return <Text style={s.state}>로그인 화면으로 이동하고 있어요.</Text>;

  if (isRecovering && checkoutAttempt) {
    return (
      <View style={s.container} testID="e2e.checkout.recovery">
        <LegendList
          accessibilityLabel="처음 요청한 상품 목록"
          contentContainerStyle={s.recoveryContent}
          data={checkoutAttempt.expectedCart ?? []}
          keyExtractor={(item) => item.cartItemId}
          ListHeaderComponent={
            <View style={s.recoveryIntro}>
              <Text style={s.recoveryTitle}>{recoveryHeadline}</Text>
              <Text style={s.recoveryCopy}>
                처음 보낸 주문 요청이 아직 처리 중일 수 있어요.
              </Text>
              <Text style={s.recoveryCopy}>
                주문 결과 확인은 주문을 만들지 않고 결과만 조회해요.
              </Text>
              <Text style={s.recoveryCopy}>
                주문 다시 시도는 기존 주문이 완료되지 않은 경우에만 표시된
                상품으로 주문을 만들 수 있어요.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={s.recoveryCopy}>
              처음 요청한 상품 정보가 남아 있지 않아 결과만 확인할 수 있어요.
            </Text>
          }
          ListFooterComponent={
            <View style={s.recoveryFooter}>
              {hasRecoveryError ? (
                <Text
                  accessibilityRole="alert"
                  style={s.error}
                  testID="e2e.checkout.communication-error"
                >
                  통신 중 주문 결과를 확인하지 못했어요. 주문이 실패한 것으로
                  확인된 것은 아니에요.
                </Text>
              ) : null}
              {recoveryActions}
              <Text style={s.recoveryLimit}>
                앱을 종료하거나 로그아웃하면 이 주문 시도는 복원되지 않아요.
              </Text>
              <Text style={s.recoveryLimit}>
                장바구니 내용이 바뀌어도 새 주문을 자동으로 시작하지 않아요.
              </Text>
            </View>
          }
          recycleItems
          renderItem={({ item }) => (
            <View style={s.item}>
              <Text style={s.itemTitle}>{item.productTitle}</Text>
              <Text style={s.itemMeta}>{item.optionName}</Text>
              <Text style={s.itemMeta}>
                수량 {item.quantity}개 · 단가
                {` ${item.unitPrice.toLocaleString("ko-KR")}원`}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          style={s.list}
        />
      </View>
    );
  }

  if (cart.isLoading)
    return <Text style={s.state}>장바구니를 불러오는 중이에요.</Text>;
  if (cart.isError || !cart.data) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>장바구니를 불러오지 못했어요.</Text>
        <Button
          accessibilityLabel="다시 시도"
          onPress={() => cart.refetch()}
          testID="e2e.cart.retry"
          variant="bare"
        >
          <Text style={s.link}>다시 시도</Text>
        </Button>
      </View>
    );
  }

  const handleCheckout = () => {
    actions.checkout.mutate({ items: cart.data.items });
  };

  return (
    <View style={s.container} testID="e2e.cart.screen">
      <LegendList
        accessibilityLabel="장바구니 상품 목록"
        contentContainerStyle={s.content}
        data={cart.data.items}
        keyExtractor={(item) => item.cartItemId}
        ListEmptyComponent={
          <Text style={s.state}>장바구니가 비어 있어요.</Text>
        }
        recycleItems
        renderItem={({ item }) => (
          <View style={s.item} testID={`e2e.cart.item.${item.sku.skuId}`}>
            <Text style={s.itemTitle}>{item.product.title}</Text>
            <Text style={s.itemMeta}>{item.sku.optionName}</Text>
            <View style={s.quantityRow}>
              <Button
                accessibilityLabel={`${item.product.title} 수량 줄이기`}
                disabled={item.quantity <= 1 || actions.isPending}
                onPress={() =>
                  actions.upsert.mutate({
                    skuId: item.sku.skuId,
                    quantity: Math.max(1, item.quantity - 1),
                  })
                }
                testID={`e2e.cart.decrement.${item.sku.skuId}`}
                variant="bare"
              >
                <Text style={s.link}>−</Text>
              </Button>
              <Text>{item.quantity}</Text>
              <Button
                accessibilityLabel={`${item.product.title} 수량 늘리기`}
                disabled={actions.isPending}
                onPress={() =>
                  actions.upsert.mutate({
                    skuId: item.sku.skuId,
                    quantity: item.quantity + 1,
                  })
                }
                testID={`e2e.cart.increment.${item.sku.skuId}`}
                variant="bare"
              >
                <Text style={s.link}>+</Text>
              </Button>
              <Button
                accessibilityLabel={`${item.product.title} 삭제`}
                disabled={actions.isPending}
                onPress={() => actions.remove.mutate(item.sku.skuId)}
                testID={`e2e.cart.remove.${item.sku.skuId}`}
                variant="bare"
              >
                <Text style={s.link}>삭제</Text>
              </Button>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        style={s.list}
      />
      {checkoutAttempt?.phase === "submitting" ? (
        <View style={s.submittingActions}>{recoveryActions}</View>
      ) : null}
      {checkoutAttempt?.phase === "rejected" ? (
        <Text
          accessibilityRole="alert"
          style={s.error}
          testID="e2e.checkout.rejected"
        >
          주문 요청이 거절됐어요. 장바구니 내용을 확인한 뒤 다시 시도해 주세요.
        </Text>
      ) : null}
      <Button
        disabled={cart.data.items.length === 0 || actions.isPending}
        label="결제하기"
        onPress={handleCheckout}
        style={s.checkout}
        testID="e2e.checkout.submit"
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { flex: 1 },
  content: { gap: 12, padding: 20 },
  recoveryContent: { gap: 12, padding: 20 },
  recoveryIntro: { gap: 10 },
  recoveryTitle: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  recoveryCopy: { color: colors.ink, lineHeight: 21 },
  recoveryFooter: { gap: 12 },
  submittingActions: { gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  recoveryLimit: { color: colors.muted, lineHeight: 20 },
  item: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  itemTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  itemMeta: { color: colors.muted },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  stateGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  error: { paddingHorizontal: 20, color: colors.danger, textAlign: "center" },
  checkout: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
});

export default CartScreen;
