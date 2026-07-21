import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ActionButtonGroupProps } from './action-button-group.types';

const iconMap: Record<string, string> = {
  bell: '\uD83D\uDD14',
  cart: '\uD83D\uDED2',
  'plus.square': '\u2795',
  'line.3.horizontal': '\u2630',
  gearshape: '\u2699',
};

const ActionButtonGroup = ({ actions }: ActionButtonGroupProps) => (
  <View style={styles.container}>
    {actions.map((item, index) => (
      <Pressable key={index} onPress={item.onPress} style={[styles.button, !item.iconOnly && styles.textButton]}>
        <Text style={[styles.label, !item.iconOnly && styles.textLabel]}>{item.iconOnly ? iconMap[item.icon ?? ''] ?? '?' : item.title}</Text>
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 20,
  },
  button: {
    minWidth: 40,
    height: 40,
    borderRadius: 8,
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

export default ActionButtonGroup;
