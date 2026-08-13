import * as WebBrowser from "expo-web-browser";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

WebBrowser.maybeCompleteAuthSession();

const IdentityCallbackScreen = () => (
  <View style={s.screen}>
    <Text style={s.label}>본인인증 결과를 확인 중입니다.</Text>
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  label: { color: colors.ink, fontSize: 15 },
});

export default IdentityCallbackScreen;
