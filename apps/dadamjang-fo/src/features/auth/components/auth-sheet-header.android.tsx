import { View } from 'react-native';
import { Host, Row, FilledTonalIconButton, Icon, Shape } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';

const closeIcon = require('@/assets/icons/close.xml');

const AuthSheetHeader = () => (
  <View style={{ alignItems: 'flex-end' }}>
    <Host matchContents>
      <Row
        horizontalArrangement="end"
        modifiers={[fillMaxWidth()]}
      >
        <FilledTonalIconButton
          onClick={() => router.back()}
          shape={Shape.Circle({})}
        >
          <Icon
            source={closeIcon}
            size={20}
            contentDescription="Close"
          />
        </FilledTonalIconButton>
      </Row>
    </Host>
  </View>
);

export default AuthSheetHeader;
