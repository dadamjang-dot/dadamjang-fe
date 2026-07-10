import { Link, router } from 'expo-router';

import { ProfileView, useSignOut, useViewer } from '@/features/auth';
import { NativeMessage, ScreenTitle } from '@/shared/components';

const MyScreen = () => {
  const viewer = useViewer();
  const signOut = useSignOut();

  if (viewer.isPending) return <NativeMessage title="내 정보를 불러오는 중" loading />;

  if (!viewer.data) {
    return (
      <Link href="/login">
        <ScreenTitle title="MY 다담장" subtitle="로그인해서 주문과 위시템을 관리해요." />
      </Link>
    );
  }

  return (
    <>
      <ScreenTitle title="MY 다담장" subtitle="계정과 주문 정보를 관리해요." />
      <ProfileView viewer={viewer.data} onOrders={() => router.push('/orders')} onLogout={() => void signOut()} />
    </>
  );
};

export default MyScreen;
