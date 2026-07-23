import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useComparisonActions } from '@/features/comparison';
import { useComparisonPriceSummaries } from '@/features/price-evidence';

const CompareScreen = () => {
  useComparisonPriceSummaries();
  useComparisonActions();

  return <View style={s.container} />;
};

const s = StyleSheet.create({ container: { flex: 1 } });

export default CompareScreen;
