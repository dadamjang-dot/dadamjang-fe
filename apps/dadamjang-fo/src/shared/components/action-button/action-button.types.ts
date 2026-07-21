import { type ReactNode } from 'react';

export type ActionButtonProps = {
  icon?: string;
  title?: string;
  iconOnly?: boolean;
  onPress: () => void;
  children?: ReactNode;
};
