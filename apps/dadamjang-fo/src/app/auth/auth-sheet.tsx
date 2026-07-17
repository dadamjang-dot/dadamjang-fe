import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const AuthSheet = () => (
  <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
    {/* X 버튼 (글래스) */}
    <View style={{ alignItems: 'flex-end' }}>
      <BlurView
        tint="systemUltraThinMaterial"
        intensity={100}
        style={{ borderRadius: 50, overflow: 'hidden' }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>X</Text>
        </Pressable>
      </BlurView>
    </View>

    {/* 본문 */}
    <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>DADAMJANG</Text>
      <Text style={{ fontSize: 15, color: '#666', lineHeight: 22 }}>
        로그인해서 주문과 위시템을 관리해요.
      </Text>

      <View style={{ gap: 10, marginTop: 20 }}>
        <Pressable
          onPress={() => router.replace('/auth/signin')}
          style={{
            backgroundColor: '#000',
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>로그인</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/auth/signup')}
          style={{
            backgroundColor: '#f0f0f0',
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text style={{ fontSize: 15, fontWeight: '800' }}>회원가입</Text>
        </Pressable>
      </View>
    </View>
  </View>
);

export default AuthSheet;
