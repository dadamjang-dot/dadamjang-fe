import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@dadamjang/design-tokens';
import type { ActionButtonProps } from './action-button.types';

const iconMap: Record<string, string> = {
  bell: '\uD83D\uDD14',
  cart: '\uD83D\uDED2',
  'plus.square': '\u2795',
  'line.3.horizontal': '\u2630',
  gearshape: '\u2699',
};

const ActionButton = ({ icon, title, iconOnly, onPress }: ActionButtonProps) => (
  <Pressable onPress={onPress} style={[styles.button, !iconOnly && styles.textButton]}>
    <Text style={styles.label}>{iconOnly ? iconMap[icon ?? ''] ?? '?' : title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  textButton: {
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
  },
});

export default ActionButton;
