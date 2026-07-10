import { Button, Host, HStack, TextField } from '@expo/ui/swift-ui';
import { background, cornerRadius, padding } from '@expo/ui/swift-ui/modifiers';

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
        placeholder="위시템 검색"
        onValueChange={onChange}
        modifiers={[
          padding({ horizontal: 12, vertical: 10 }),
          background(colors.primarySoft),
          cornerRadius(14),
        ]}
      />
      <Button label="검색" onPress={onSubmit} />
    </HStack>
  </Host>
);
