import { Host, HStack, Button } from '@expo/ui/swift-ui';
import { labelStyle, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { router } from 'expo-router';

const AuthSheetHeader = () => (
  <Host matchContents>
    <HStack style={{ justifyContent: 'flex-end' }}>
      <Button
        systemImage="xmark"
        onPress={() => router.back()}
        modifiers={[labelStyle('iconOnly'), buttonStyle('glass')]}
      />
    </HStack>
  </Host>
);

export default AuthSheetHeader;
