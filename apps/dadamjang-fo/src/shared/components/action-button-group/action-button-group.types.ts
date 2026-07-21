export type ActionGroupItem = {
  icon?: string;
  title?: string;
  iconOnly?: boolean;
  onPress: () => void;
};

export type ActionButtonGroupProps = {
  actions: [ActionGroupItem, ActionGroupItem];
};
