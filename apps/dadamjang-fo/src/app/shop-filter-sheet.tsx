import { useLocalSearchParams, useRouter } from 'expo-router';

import { ShopFilterSheet } from '@/shared/components';
import type { ShopFilterMode } from '@/features/catalog';

const filterModes: ShopFilterMode[] = ['category', 'brand', 'color', 'size', 'price', 'sort'];

const isShopFilterMode = (value: string | string[] | undefined): value is ShopFilterMode =>
  typeof value === 'string' && filterModes.includes(value as ShopFilterMode);

const ShopFilterSheetRoute = () => {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const filterMode = isShopFilterMode(mode) ? mode : 'sort';

  return (
    <ShopFilterSheet
      mode={filterMode}
      onApply={() => router.back()}
      onCancel={() => router.back()}
    />
  );
};

export default ShopFilterSheetRoute;
