import { ComparisonView, useComparisonActions } from '@/features/comparison';
import { useComparisonPriceSummaries } from '@/features/price-evidence';
import { ScreenTitle } from '@/shared/components';

const CompareScreen = () => {
  const comparison = useComparisonPriceSummaries();
  const actions = useComparisonActions();

  return (
    <>
      <ScreenTitle title="비교함" subtitle="담아둔 위시템의 가격과 재고를 비교해요." />
      <ComparisonView
        items={comparison.data}
        loading={comparison.isPending}
        onRemove={(productId) => actions.remove.mutate(productId)}
      />
    </>
  );
};

export default CompareScreen;
