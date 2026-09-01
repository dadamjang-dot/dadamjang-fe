import { useLocalSearchParams, useRouter } from "expo-router";

import { AuthScreen, PasswordResetForm } from "@/features/auth/components";

const FindPasswordScreen = () => {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  return (
    <AuthScreen testID="e2e.auth.find-password">
      <PasswordResetForm
        onComplete={() =>
          router.replace({
            pathname: "/auth/signin",
            params: returnTo ? { returnTo } : undefined,
          })
        }
      />
    </AuthScreen>
  );
};

export default FindPasswordScreen;
