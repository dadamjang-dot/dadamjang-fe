import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  Text as NativeText,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from "react-native";

interface ContainerProps {
  children?: ReactNode;
  modifiers?: ViewStyle[];
}

interface ButtonProps extends ContainerProps {
  onClick?: () => void;
  shape?: ViewStyle;
}

interface IconProps {
  contentDescription?: string;
  size?: number;
  source: ImageSourcePropType;
}

const Host = ({ children }: ContainerProps) => <View>{children}</View>;

const Row = ({ children, modifiers }: ContainerProps) => {
  const style = modifiers;
  return <View style={style}>{children}</View>;
};

const ComposeButton = ({
  children,
  modifiers,
  onClick,
  shape,
}: ButtonProps) => {
  const style = [shape, modifiers];
  return (
    <Pressable role="button" onPress={onClick} style={style}>
      {children}
    </Pressable>
  );
};

const FilledTonalButton = ComposeButton;
const FilledTonalIconButton = ComposeButton;
const IconButton = ComposeButton;

const Icon = ({ contentDescription, size, source }: IconProps) => {
  const style = { height: size, width: size };

  return (
    <Image
      accessible
      accessibilityLabel={contentDescription}
      role="img"
      source={source}
      style={style}
    />
  );
};

const Text = ({ children }: ContainerProps) => (
  <NativeText>{children}</NativeText>
);

const Shape = {
  Circle: () => ({ borderRadius: 20 }),
  Pill: () => ({ borderRadius: 999 }),
};

export {
  FilledTonalButton,
  FilledTonalIconButton,
  Host,
  Icon,
  IconButton,
  Row,
  Shape,
  Text,
};
