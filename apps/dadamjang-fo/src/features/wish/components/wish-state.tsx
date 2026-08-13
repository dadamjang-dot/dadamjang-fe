import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";

type WishStateProps = {
  title: string;
  description?: string;
  isLoading?: boolean;
  onRetry?: () => void;
  action?: {
    label: string;
    onPress: () => void;
    testID?: string;
  };
  alignment?: "center" | "top";
};

const WishState = ({
  title,
  description,
  isLoading,
  onRetry,
  action,
  alignment = "center",
}: WishStateProps) => (
  <View style={[s.container, alignment === "top" && s.topContainer]}>
    {isLoading ? <ActivityIndicator color={colors.ink} /> : null}
    <Text style={s.title}>{title}</Text>
    {description ? <Text style={s.description}>{description}</Text> : null}
    {onRetry ? <Button label="다시 시도" onPress={onRetry} style={s.retry} /> : null}
    {action ? (
      <Button
        label={action.label}
        onPress={action.onPress}
        style={s.action}
        testID={action.testID}
      />
    ) : null}
  </View>
);

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  topContainer: { justifyContent: "flex-start", paddingTop: spacing.xxl * 4 },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700", textAlign: "center" },
  description: { color: colors.muted, fontSize: 14, textAlign: "center" },
  retry: { minHeight: 40, marginTop: 4, paddingHorizontal: 18, borderRadius: 20 },
  action: { alignSelf: "center", width: 144, marginTop: spacing.md },
});

export default WishState;
