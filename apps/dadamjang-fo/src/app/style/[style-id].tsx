import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useStylePost } from '@/features/style';

const StylePostScreen = () => {
  const { 'style-id': styleId } = useLocalSearchParams<{ 'style-id': string }>();
  useStylePost(styleId);

  return <View style={{ flex: 1 }} />;
};

export default StylePostScreen;
