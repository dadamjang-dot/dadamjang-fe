import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    <Text style={[styles.label, !iconOnly && styles.textLabel]}>{iconOnly ? iconMap[icon ?? ''] ?? '?' : title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  textButton: {
  },
  textLabel: {
    color: '#111111',
  },
  label: {
    fontSize: 16,
  },
});

export default ActionButton;
