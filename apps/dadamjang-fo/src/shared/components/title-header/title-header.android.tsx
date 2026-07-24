import { type ReactNode } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

interface TitleHeaderProps {
  title: string;
  children?: ReactNode;
}

const TitleHeader = ({ title, children }: TitleHeaderProps) => (
  <View style={s.container}>
    <Text style={s.title}>{title}</Text>
    <View style={s.btnWrapper}>{children}</View>
  </View>
);

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
  },
  btnWrapper: {
    flexDirection: "row",
    height: 40,
    alignItems: "center",
    gap: 6,
  },
});

export default TitleHeader;
