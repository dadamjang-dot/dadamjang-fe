import { router } from 'expo-router';
import { View } from 'react-native';
import { Host, Row, FilledTonalIconButton, Icon, Shape } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';

import { suppressAuthOnce } from '@/shared/navigation/last-tab-store';

const closeIcon = require('@/assets/icons/close.xml');

const AuthSheetHeader = () => (
  <View style={{ alignItems: 'flex-end' }}>
    <Host matchContents>
      <Row
        horizontalArrangement="end"
        modifiers={[fillMaxWidth()]}
      >
        <FilledTonalIconButton
          shape={Shape.Circle({})}
          onClick={() => {
            suppressAuthOnce();
            router.back();
          }}
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
