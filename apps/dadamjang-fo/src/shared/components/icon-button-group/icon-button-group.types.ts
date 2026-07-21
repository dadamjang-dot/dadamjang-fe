export type IconGroupItem = {
  icon: string;
  onPress: () => void;
};

export type IconButtonGroupProps = {
  icons: [IconGroupItem, IconGroupItem];
};
