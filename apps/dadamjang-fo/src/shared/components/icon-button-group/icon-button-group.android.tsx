import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@dadamjang/design-tokens';
import type { IconButtonGroupProps } from './icon-button-group.types';

const iconMap: Record<string, string> = {
  bell: '\uD83D\uDD14',
  cart: '\uD83D\uDED2',
  'plus.square': '\u2795',
  'line.3.horizontal': '\u2630',
  gearshape: '\u2699',
};

const IconButtonGroup = ({ icons }: IconButtonGroupProps) => (
  <View style={styles.container}>
    {icons.map((item, index) => (
      <Pressable key={index} onPress={item.onPress} style={styles.button}>
        <Text style={styles.icon}>{iconMap[item.icon] ?? '?'}</Text>
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
  },
  button: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
});

export default IconButtonGroup;
