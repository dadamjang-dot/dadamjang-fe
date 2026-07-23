import { type ReactNode } from "react";
import { Text, View } from "react-native";

interface TitleHeaderProps {
  title: string;
  children?: ReactNode;
}

const TitleHeader = ({ title, children }: TitleHeaderProps) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    }}
  >
    <Text style={{ fontSize: 24, fontWeight: "700" }}>{title}</Text>
    <View style={{ flexDirection: "row" }}>{children}</View>
  </View>
);

export default TitleHeader;
