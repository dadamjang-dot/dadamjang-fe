import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';

import { suppressAuthOnce } from '@/shared/navigation/last-tab-store';

const AuthHeader = () => (
  <View style={styles.header}>
    <Pressable
      accessibilityLabel="닫기"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        suppressAuthOnce();
        router.back();
      }}
      style={styles.closeButton}
    >
      <View style={[styles.closeLine, styles.closeLineLeft]} />
      <View style={[styles.closeLine, styles.closeLineRight]} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-end',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e4e4e4',
    borderCurve: 'continuous',
    borderRadius: 25,
    borderWidth: 1,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.04)',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeLine: {
    backgroundColor: '#1d1d1f',
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    width: 28,
  },
  closeLineLeft: {
    transform: [{ rotate: '45deg' }],
  },
  closeLineRight: {
    transform: [{ rotate: '-45deg' }],
  },
});

export default AuthHeader;
