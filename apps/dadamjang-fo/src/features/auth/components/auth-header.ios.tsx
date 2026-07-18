import { router } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Host } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  glassEffect,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';

import { suppressAuthOnce } from '@/shared/navigation/last-tab-store';

const AuthHeader = () => (
  <View style={styles.header}>
    <Host matchContents>
      <Button
        label="닫기"
        systemImage="xmark"
        onPress={() => {
          suppressAuthOnce();
          router.back();
        }}
        modifiers={[
          labelStyle('iconOnly'),
          buttonStyle('plain'),
          font({ size: 20, weight: 'regular' }),
          foregroundStyle('#1d1d1f'),
          frame({ width: 40, height: 40 }),
          glassEffect({
            glass: { variant: 'regular', interactive: true },
            shape: 'circle',
          }),
        ]}
      />
    </Host>
  </View>
);

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-end',
  },
});

export default AuthHeader;
