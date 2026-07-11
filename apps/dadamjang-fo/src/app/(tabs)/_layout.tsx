import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@dadamjang/design-tokens';

const TabLayout = () => (
  <NativeTabs
    backgroundColor="#FFFFFF"
    blurEffect="systemChromeMaterialLight"
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
        fontWeight: '700',
      },
    }}
    minimizeBehavior="never"
  >
    <NativeTabs.Trigger name="index">
      <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="search">
      <NativeTabs.Trigger.Label>검색</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="magnifyingglass" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="wishlist">
      <NativeTabs.Trigger.Label>위시</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="compare">
      <NativeTabs.Trigger.Label>비교</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="rectangle.split.2x1" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="cart">
      <NativeTabs.Trigger.Label>장바구니</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="my">
      <NativeTabs.Trigger.Label>MY</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
    </NativeTabs.Trigger>
  </NativeTabs>
);

export default TabLayout;
