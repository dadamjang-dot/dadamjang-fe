import { Tabs } from 'expo-router';

import { colors } from '@dadamjang/design-tokens';

const TabLayout = () => (
  <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
    <Tabs.Screen name="index" options={{ title: '홈' }} />
    <Tabs.Screen name="search" options={{ title: '검색' }} />
    <Tabs.Screen name="wishlist" options={{ title: '위시' }} />
    <Tabs.Screen name="compare" options={{ title: '비교' }} />
    <Tabs.Screen name="cart" options={{ title: '장바구니' }} />
    <Tabs.Screen name="my" options={{ title: 'MY' }} />
  </Tabs>
);

export default TabLayout;
