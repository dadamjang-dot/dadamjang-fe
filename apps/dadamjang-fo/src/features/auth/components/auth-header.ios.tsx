import { router } from 'expo-router';
import { View } from 'react-native';
import { Host, Button } from '@expo/ui/swift-ui';
import { labelStyle, buttonStyle, controlSize, tint } from '@expo/ui/swift-ui/modifiers';

import { suppressAuthOnce } from '@/shared/navigation/last-tab-store';

const AuthSheetHeader = () => (
  <View style={{ alignItems: 'flex-end' }}>
    <Host matchContents>
      <Button
        label="Close"
        systemImage="xmark"
        onPress={() => {
          suppressAuthOnce();
          router.back();
        }}
        modifiers={[labelStyle("iconOnly"), buttonStyle("glass"), controlSize("mini"), tint("#aaa")]}
      />
    </Host>
  </View>
);

export default AuthSheetHeader;
