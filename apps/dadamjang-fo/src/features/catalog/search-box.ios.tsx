import { Button, Host, HStack, TextField } from '@expo/ui/swift-ui';
import {
  autocorrectionDisabled,
  background,
  border,
  cornerRadius,
  font,
  padding,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { colors } from '@dadamjang/design-tokens';

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const SearchBox = ({ value, onChange, onSubmit }: SearchBoxProps) => (
  <Host matchContents>
    <HStack spacing={8} modifiers={[padding({ horizontal: 16, vertical: 8 })]}>
      <TextField
        defaultValue={value}
        placeholder="브랜드, 상품명 검색"
        onValueChange={onChange}
        modifiers={[
          textInputAutocapitalization('never'),
          autocorrectionDisabled(),
          font({ size: 15, weight: 'medium' }),
          padding({ horizontal: 14, vertical: 12 }),
          background(colors.surface),
          border({ color: colors.line, width: 1 }),
          cornerRadius(999),
          tint(colors.ink),
        ]}
      />
      <Button label="검색" onPress={onSubmit} modifiers={[tint(colors.ink)]} />
    </HStack>
  </Host>
);
