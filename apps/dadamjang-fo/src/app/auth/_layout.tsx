import { Stack } from "expo-router";

import { useCurrentUser } from "@/features/auth";

const AuthLayout = () => {
  const { data: currentUser, isPending } = useCurrentUser();

  if (isPending) return null;
  if (currentUser) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  );
};

export default AuthLayout;
