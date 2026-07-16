import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { colors } from '@dadamjang/design-tokens';

export const PartnerBadge = () => (
  <View style={styles.badge}>
    <Text style={styles.text}>파트너</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.partner,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
  },
});
