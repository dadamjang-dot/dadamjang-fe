import { useEffect } from "react";
import { router } from 'expo-router';
import { BackHandler, Pressable, Text, View } from 'react-native';

import AuthHeader from '@/features/auth/components/auth-header';

const AuthScreen = () => {
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);
  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
      <AuthHeader />

      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>DADAMJANG</Text>
        <Text style={{ fontSize: 15, color: '#666', lineHeight: 22 }}>
          로그인해서 주문과 위시템을 관리해요.
        </Text>

        <View style={{ gap: 10, marginTop: 20 }}>
          <Pressable
            onPress={() => router.push('/auth/signin')}
            style={{ backgroundColor: '#000', borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>로그인</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/auth/signup')}
            style={{ backgroundColor: '#f0f0f0', borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '800' }}>회원가입</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default AuthScreen;
