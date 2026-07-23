import { useEffect } from "react";
import { router } from 'expo-router';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

const AuthScreen = () => {
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  return (
    <View style={s.screen}>
      <View style={s.hero}>
        <Text style={s.brandName}>DADAMJANG</Text>
        <Text style={s.subtitle}>
          로그인해서 주문과 위시템을 관리해요.
        </Text>

        <View style={s.actions}>
          <Pressable
            onPress={() => router.push('/auth/signin')}
            style={s.primaryButton}>
            <Text style={s.primaryButtonText}>로그인</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/auth/signup')}
            style={s.secondaryButton}>
            <Text style={s.secondaryButtonText}>회원가입</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  actions: {
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});

export default AuthScreen;
