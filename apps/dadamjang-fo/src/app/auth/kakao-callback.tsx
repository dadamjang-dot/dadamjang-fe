import * as WebBrowser from "expo-web-browser";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

WebBrowser.maybeCompleteAuthSession();

const KakaoCallbackScreen = () => (
  <View style={s.screen}>
    <Text style={s.label}>카카오 로그인 결과를 확인하고 있어요.</Text>
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  label: { color: colors.ink, fontSize: 15 },
});

export default KakaoCallbackScreen;
