import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';

import { setLastNonMyTab } from '@/shared/navigation/last-tab-store';

const StyleScreen = () => {
  useFocusEffect(
    useCallback(() => {
      setLastNonMyTab('style');
    }, []),
  );

  return <View style={{ flex: 1 }} />;
};

export default StyleScreen;
