import { View } from 'react-native';
import { Host, Button } from '@expo/ui/swift-ui';
import { labelStyle, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { router } from 'expo-router';

const AuthSheetHeader = () => (
  <View style={{ alignItems: 'flex-end' }}>
    <Host matchContents>
      <Button
        systemImage="xmark"
        onPress={() => router.back()}
        modifiers={[labelStyle('iconOnly'), buttonStyle('glass')]}
      />
    </Host>
  </View>
);

export default AuthSheetHeader;
