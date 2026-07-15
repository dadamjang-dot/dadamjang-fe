import { Button, Host, OutlinedTextField, Row, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';

import { colors } from '@dadamjang/design-tokens';

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const SearchBox = ({ value, onChange, onSubmit }: SearchBoxProps) => (
  <Host matchContents>
    <Row
      horizontalArrangement={{ spacedBy: 8 }}
      verticalAlignment="center"
      modifiers={[paddingAll(16), fillMaxWidth()]}>
      <OutlinedTextField
        defaultValue={value}
        onValueChange={onChange}
        singleLine
        keyboardOptions={{ imeAction: 'search' }}
        keyboardActions={{ onSearch: onSubmit }}
        colors={{ focusedIndicatorColor: colors.ink }}>
        <OutlinedTextField.Placeholder>
          <Text>브랜드, 상품명 검색</Text>
        </OutlinedTextField.Placeholder>
      </OutlinedTextField>
      <Button onClick={onSubmit} colors={{ containerColor: colors.ink }}>
        <Text>검색</Text>
      </Button>
    </Row>
  </Host>
);
