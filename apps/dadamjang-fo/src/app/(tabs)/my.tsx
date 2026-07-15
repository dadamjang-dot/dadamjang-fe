import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProfileView, useSignOut, useViewer } from '@/features/auth';
import { NativeMessage, ScreenTitle } from '@/shared/components';
import { colors } from '@dadamjang/design-tokens';

const MyScreen = () => {
  const viewer = useViewer();
  const signOut = useSignOut();

  if (viewer.isPending) return <NativeMessage title="내 정보를 불러오는 중" loading />;

  if (!viewer.data) {
    return (
      <>
        <ScreenTitle title="MY 다담장" subtitle="로그인해서 주문과 위시템을 관리해요." />
        <View style={styles.loginCard}>
          <Text style={styles.loginKicker}>MEMBER ONLY</Text>
          <Text style={styles.loginTitle}>로그인이 필요해요</Text>
          <Text style={styles.loginCopy}>주문 내역, 비교함, 위시템을 한 곳에서 관리할 수 있어요.</Text>
          <Pressable
            accessibilityLabel="로그인하기"
            accessibilityRole="button"
            style={styles.loginButton}
            onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <ScreenTitle title="MY 다담장" subtitle="계정과 주문 정보를 관리해요." />
      <ProfileView
        viewer={viewer.data}
        onOrders={() => router.push('/orders')}
        onCompare={() => router.push('/compare')}
        onLogout={() => void signOut()}
      />
    </>
  );
};

export default MyScreen;

const styles = StyleSheet.create({
  loginCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
  },
  loginKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loginTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  loginCopy: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  loginButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loginButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
});
