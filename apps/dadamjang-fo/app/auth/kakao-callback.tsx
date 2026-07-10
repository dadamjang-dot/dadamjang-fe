import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { KakaoSignupForm } from '@/features/auth/kakao-signup-form';
import { useCompleteKakaoSignup } from '@/features/auth';
import { setAuthTokens } from '@/shared/api/graphql-client';
import { NativeMessage } from '@/shared/components';

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const KakaoCallbackScreen = () => {
  const params = useLocalSearchParams<{
    accessToken?: string;
    refreshToken?: string;
    kakaoSignupToken?: string;
  }>();
  const [userid, setUserid] = useState('');
  const completeSignup = useCompleteKakaoSignup();
  const accessToken = getParam(params.accessToken);
  const refreshToken = getParam(params.refreshToken);
  const kakaoSignupToken = getParam(params.kakaoSignupToken);

  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    void setAuthTokens({ accessToken, refreshToken }).then(() => router.replace('/'));
  }, [accessToken, refreshToken]);

  if (accessToken && refreshToken) return <NativeMessage title="카카오 로그인 처리 중" loading />;

  if (kakaoSignupToken) {
    return (
      <KakaoSignupForm
        onUseridChange={setUserid}
        onSubmit={() =>
          completeSignup.mutate(
            { userid, kakaoSignupToken },
            { onSuccess: () => router.replace('/') },
          )
        }
        pending={completeSignup.isPending}
        error={completeSignup.error?.message}
      />
    );
  }

  return <NativeMessage title="카카오 로그인 정보를 확인할 수 없어요" />;
};

export default KakaoCallbackScreen;
