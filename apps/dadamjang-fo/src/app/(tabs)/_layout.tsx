import { NativeTabs } from "expo-router/unstable-native-tabs";

import { colors } from "@dadamjang/design-tokens";

const TabLayout = () => (
  <NativeTabs
    backgroundColor={colors.surface}
    blurEffect="none"
    disableTransparentOnScrollEdge
    iconColor={{
      default: colors.muted,
      selected: colors.primary,
    }}
    labelStyle={{
      default: {
        color: colors.muted,
      },
      selected: {
        color: colors.primary,
        fontWeight: "700",
      },
    }}
    labelVisibilityMode="selected"
    minimizeBehavior="never"
    shadowColor={colors.line}
  >
    <NativeTabs.Trigger name="index">
      <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon
        sf={{ default: "house", selected: "house.fill" }}
      />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="style">
      <NativeTabs.Trigger.Label>스타일</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon
        sf={{ default: "plus.square", selected: "plus.square.fill" }}
      />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="shop" testID="e2e.navigation.shop">
      <NativeTabs.Trigger.Label>쇼핑</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="magnifyingglass" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="wish" testID="e2e.navigation.wish">
      <NativeTabs.Trigger.Label>찜</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon
        sf={{ default: "heart", selected: "heart.fill" }}
      />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="my" testID="e2e.navigation.my">
      <NativeTabs.Trigger.Label>마이</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon
        sf={{ default: "person", selected: "person.fill" }}
      />
    </NativeTabs.Trigger>
  </NativeTabs>
);

export default TabLayout;
