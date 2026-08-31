import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";
import { resetAuthSession } from "@dadamjang/graphql-client";

import {
  authErrorMessage,
  useAuthActionGate,
  useDeactivateFoAccount,
  useSignOut,
} from "@/features/auth";
import {
  useFoNotificationPreferences,
  useUpdateFoNotificationPreferences,
} from "@/features/notification";
import type { UpdateFoNotificationPreferencesInput } from "@/features/notification";
import { Button } from "@/shared/components/button";
import { TitleHeader } from "@/shared/components/title-header";

type PermissionState = Awaited<
  ReturnType<typeof Notifications.getPermissionsAsync>
>;

type PreferenceToggleProps = {
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

const PreferenceToggle = ({
  disabled,
  label,
  onValueChange,
  value,
}: PreferenceToggleProps) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Switch
      accessibilityLabel={label}
      disabled={disabled}
      onValueChange={onValueChange}
      value={value}
    />
  </View>
);

const hasNotificationPermission = (permission: PermissionState | undefined) =>
  permission?.granted === true ||
  permission?.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
  permission?.ios?.status ===
    Notifications.IosAuthorizationStatus.PROVISIONAL ||
  permission?.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;

const formatScheduledDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));

const SettingsScreen = () => {
  const router = useRouter();
  const auth = useAuthActionGate("/settings");
  const signOut = useSignOut();
  const preferences = useFoNotificationPreferences(auth.isAuthenticated);
  const updatePreferences = useUpdateFoNotificationPreferences();
  const deactivate = useDeactivateFoAccount();
  const [permission, setPermission] = useState<PermissionState>();
  const [permissionError, setPermissionError] = useState<string>();
  const [accountError, setAccountError] = useState<string>();

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    let active = true;
    Notifications.getPermissionsAsync()
      .then((result) => {
        if (active) setPermission(result);
      })
      .catch(() => {
        if (active) setPermissionError("알림 권한을 확인하지 못했어요.");
      });
    return () => {
      active = false;
    };
  }, [auth.isAuthenticated]);

  const requestPermission = async () => {
    setPermissionError(undefined);
    try {
      setPermission(await Notifications.requestPermissionsAsync());
    } catch {
      setPermissionError("알림 권한을 요청하지 못했어요.");
    }
  };

  const updatePreference = (input: UpdateFoNotificationPreferencesInput) => {
    updatePreferences.mutate(input);
  };

  const logout = async () => {
    setAccountError(undefined);
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      setAccountError(authErrorMessage(error, "로그아웃하지 못했어요."));
    }
  };

  const completeDeactivation = async () => {
    setAccountError(undefined);
    try {
      const result = await deactivate.mutateAsync();
      await resetAuthSession();
      router.replace("/");
      Alert.alert(
        "탈퇴가 예약되었어요.",
        `${formatScheduledDate(result.scheduledAnonymizationAt)}에 계정 정보가 익명화돼요. 그전까지 다시 로그인해 복구할 수 있어요.`,
      );
    } catch (error) {
      setAccountError(authErrorMessage(error, "계정을 탈퇴하지 못했어요."));
    }
  };

  const confirmDeactivation = () =>
    Alert.alert(
      "계정을 탈퇴할까요?",
      "30일 안에는 다시 로그인해 계정을 복구할 수 있어요. 이후에는 계정 정보가 익명화되어 복구할 수 없어요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: () => void completeDeactivation(),
        },
      ],
    );

  const openProtected = () => auth.runProtectedAction(() => undefined);
  const preferenceError = updatePreferences.error
    ? authErrorMessage(
        updatePreferences.error,
        "알림 설정을 저장하지 못했어요.",
      )
    : preferences.error
      ? "알림 설정을 불러오지 못했어요."
      : undefined;

  return (
    <ScrollView
      contentContainerStyle={s.content}
      contentInsetAdjustmentBehavior="automatic"
      style={s.container}
    >
      <TitleHeader title="설정" />
      {!auth.isAuthenticated ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>로그인 후 이용할 수 있어요</Text>
          <Button
            label="푸시 알림 설정"
            onPress={openProtected}
            variant="secondary"
          />
          <Button
            label="계정 설정"
            onPress={openProtected}
            variant="secondary"
          />
        </View>
      ) : null}

      {auth.isAuthenticated && auth.data ? (
        <>
          <View style={s.section}>
            <Text style={s.sectionTitle}>알림</Text>
            <View style={s.row}>
              <Text style={s.rowLabel}>알림 권한</Text>
              {permission === undefined && !permissionError ? (
                <ActivityIndicator color={colors.primary} />
              ) : hasNotificationPermission(permission) ? (
                <Text style={s.rowValue}>알림 허용됨</Text>
              ) : permission?.canAskAgain === false ? (
                <Button
                  label="시스템 설정 열기"
                  onPress={() => void Linking.openSettings()}
                  variant="bare"
                />
              ) : (
                <Button
                  label="알림 허용"
                  onPress={() => void requestPermission()}
                  variant="bare"
                />
              )}
            </View>
            {permissionError ? (
              <Text accessibilityRole="alert" selectable style={s.error}>
                {permissionError}
              </Text>
            ) : null}
            {preferences.data ? (
              <>
                <PreferenceToggle
                  disabled={updatePreferences.isPending}
                  label="전체 Push"
                  onValueChange={(pushEnabled) =>
                    updatePreference({ pushEnabled })
                  }
                  value={preferences.data.pushEnabled}
                />
                <PreferenceToggle
                  disabled={updatePreferences.isPending}
                  label="주문 알림"
                  onValueChange={(orderPushEnabled) =>
                    updatePreference({ orderPushEnabled })
                  }
                  value={preferences.data.orderPushEnabled}
                />
                <PreferenceToggle
                  disabled={updatePreferences.isPending}
                  label="위시 알림"
                  onValueChange={(wishPushEnabled) =>
                    updatePreference({ wishPushEnabled })
                  }
                  value={preferences.data.wishPushEnabled}
                />
                <PreferenceToggle
                  disabled={updatePreferences.isPending}
                  label="스타일 알림"
                  onValueChange={(stylePushEnabled) =>
                    updatePreference({ stylePushEnabled })
                  }
                  value={preferences.data.stylePushEnabled}
                />
              </>
            ) : preferences.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
            {preferenceError ? (
              <Text accessibilityRole="alert" selectable style={s.error}>
                {preferenceError}
              </Text>
            ) : null}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>계정</Text>
            <View style={s.row}>
              <Text style={s.rowLabel}>이메일</Text>
              <Text selectable style={s.rowValue}>
                {auth.data.email}
              </Text>
            </View>
            {auth.data.hasPassword ? (
              <Button
                label="비밀번호 변경"
                onPress={() => router.push("/settings/password")}
                variant="secondary"
              />
            ) : null}
            <Button label="로그아웃" onPress={() => void logout()} />
            {auth.data.role === "USER" ? (
              <Button
                disabled={deactivate.isPending}
                label="회원 탈퇴"
                onPress={confirmDeactivation}
                style={s.deactivation}
                variant="bare"
              />
            ) : null}
            {accountError ? (
              <Text accessibilityRole="alert" selectable style={s.error}>
                {accountError}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={s.versionSection}>
        <Text selectable style={s.rowValue}>
          앱 버전 {Constants.expoConfig?.version ?? "알 수 없음"}
        </Text>
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  section: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowLabel: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  rowValue: { flexShrink: 1, color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  deactivation: { alignSelf: "center" },
  versionSection: { alignItems: "center", padding: spacing.xl },
});

export default SettingsScreen;
