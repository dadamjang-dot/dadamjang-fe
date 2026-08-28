import type { ReactNode } from "react";
import { Image, Text, View } from "react-native";

interface ChildrenProps {
  children?: ReactNode;
}

interface TriggerProps extends ChildrenProps {
  name: string;
  testID?: string;
}

interface IconProps {
  md?: string;
}

const NativeTabsRoot = ({ children }: ChildrenProps) => <View>{children}</View>;

const Trigger = ({ children, name, testID }: TriggerProps) => (
  <View nativeID={name} testID={testID}>
    {children}
  </View>
);

const Icon = ({ md }: IconProps) => {
  if (!md) return null;
  const source = { uri: `material-tab://${md}` };
  return <Image accessible aria-label={md} role="img" source={source} />;
};

const Label = ({ children }: ChildrenProps) => <Text>{children}</Text>;

const NativeTabs = Object.assign(NativeTabsRoot, {
  Trigger: Object.assign(Trigger, { Icon, Label }),
});

export { NativeTabs };
