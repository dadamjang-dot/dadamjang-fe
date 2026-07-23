import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useStylePost } from '@/features/style';

const StylePostScreen = () => {
  const { 'style-id': styleId } = useLocalSearchParams<{ 'style-id': string }>();
  useStylePost(styleId);

  return <View style={s.container} />;
};

const s = StyleSheet.create({ container: { flex: 1 } });

export default StylePostScreen;
