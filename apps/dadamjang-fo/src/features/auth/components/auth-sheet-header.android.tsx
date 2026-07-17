import { Host, Row, FilledTonalIconButton, Icon, Shape } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';

const AuthSheetHeader = () => (
  <Host matchContents>
    <Row
      horizontalArrangement="End"
      modifiers={[fillMaxWidth()]}
    >
      <FilledTonalIconButton
        onClick={() => router.back()}
        shape={<Shape.Circle />}
      >
        <Icon
          source={require('@/assets/icons/close.xml')}
          size={20}
          contentDescription="Close"
        />
      </FilledTonalIconButton>
    </Row>
  </Host>
);

export default AuthSheetHeader;
