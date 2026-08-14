import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { useSignupConsentDocuments } from "@/features/auth";
import { AuthScreen } from "@/features/auth/components";
import { Button } from "@/shared/components/button";

const ConsentDocumentScreen = () => {
  const { "document-id": documentId } = useLocalSearchParams<{ "document-id": string }>();
  const query = useSignupConsentDocuments();
  const document = query.data?.find((item) => item.documentId === documentId);

  return (
    <AuthScreen testID="e2e.auth.terms">
      <Stack.Screen options={{ title: document?.title ?? "약관 상세" }} />
      {query.isPending ? <Text style={s.status}>약관을 불러오고 있어요.</Text> : null}
      {query.isError ? (
        <View style={s.errorState}>
          <Text style={s.error}>약관을 불러오지 못했어요.</Text>
          <Button label="다시 시도" onPress={() => query.refetch()} variant="secondary" />
        </View>
      ) : null}
      {!query.isPending && !query.isError && !document ? (
        <Text style={s.error}>현재 적용 중인 약관을 찾지 못했습니다.</Text>
      ) : null}
      {document ? (
        <View style={s.document}>
          <Text style={s.title}>{document.title}</Text>
          <Text style={s.version}>버전 {document.version}</Text>
          <Text selectable style={s.body}>
            {document.body}
          </Text>
        </View>
      ) : null}
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  status: { color: colors.muted, fontSize: 14 },
  errorState: { gap: spacing.lg },
  error: { color: colors.danger, fontSize: 14 },
  document: { gap: spacing.md },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800", lineHeight: 30 },
  version: { color: colors.muted, fontSize: 12 },
  body: { marginTop: spacing.sm, color: colors.ink, fontSize: 14, lineHeight: 23 },
});

export default ConsentDocumentScreen;
