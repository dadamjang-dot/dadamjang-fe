import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { useViewer } from '@/features/auth';

const MyScreen = () => {
  const viewer = useViewer();
  const hasPushed = useRef(false);

  useEffect(() => {
    if (!viewer.isPending && !viewer.data && !hasPushed.current) {
      hasPushed.current = true;
      router.push('/auth/auth-sheet');
    }
  }, [viewer.isPending, viewer.data]);

  return <View style={{ flex: 1 }} />;
};

export default MyScreen;
