import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@dadamjang/design-tokens';
import type { IconButtonProps } from './icon-button.types';

const iconMap: Record<string, string> = {
  bell: '\uD83D\uDD14',
  cart: '\uD83D\uDED2',
  'plus.square': '\u2795',
  'line.3.horizontal': '\u2630',
  gearshape: '\u2699',
};

const IconButton = ({ icon, onPress }: IconButtonProps) => (
  <Pressable onPress={onPress} style={styles.button}>
    <Text style={styles.icon}>{iconMap[icon] ?? '?'}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
});

export default IconButton;
