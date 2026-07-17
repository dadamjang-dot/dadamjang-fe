import { View } from 'react-native';

import { useComparisonActions } from '@/features/comparison';
import { useComparisonPriceSummaries } from '@/features/price-evidence';

const CompareScreen = () => {
  useComparisonPriceSummaries();
  useComparisonActions();

  return <View style={{ flex: 1 }} />;
};

export default CompareScreen;
