import { type ReactNode } from 'react';

export type IconButtonProps = {
  icon: string;
  onPress: () => void;
  size?: number;
  children?: ReactNode;
};
