import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '@dadamjang/design-tokens';
import { SearchInput } from '@/shared/components/search-input';

type ProductHeaderProps = {
  children?: ReactNode;
};

const ProductHeader = ({ children }: ProductHeaderProps) => {
  const inputRef = useRef<TextInput>(null);
  const expandProgress = useSharedValue(0);
  const isExpanded = useSharedValue(false);
  const [buttonsWidth, setButtonsWidth] = useState(0);

  const handleSearch = useCallback(() => {
    if (isExpanded.value) return;
    isExpanded.value = true;
    expandProgress.value = withTiming(1, { duration: 300 });
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [expandProgress, isExpanded]);

  const handleCancel = useCallback(() => {
    isExpanded.value = false;
    expandProgress.value = withTiming(0, { duration: 300 });
    inputRef.current?.blur();
  }, [expandProgress, isExpanded]);

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.3, 1], [1, 0, 0]),
    transform: [
      { translateX: interpolate(expandProgress.value, [0, 1], [0, 20]) },
    ],
    width: buttonsWidth > 0 ? interpolate(expandProgress.value, [0, 1], [buttonsWidth, 0]) : undefined,
    overflow: 'hidden',
  }));

  const cancelStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    width: interpolate(expandProgress.value, [0, 1], [0, 40]),
    overflow: 'hidden',
  }));

  return (
    <View style={s.container}>
      <SearchInput ref={inputRef} onFocus={handleSearch} style={s.searchInput} />
      {children && (
        <Animated.View style={[s.buttonsWrapper, buttonsStyle]}>
          <View
            onLayout={(e) => {
              if (buttonsWidth === 0) setButtonsWidth(e.nativeEvent.layout.width + 4);
            }}
          >
            {children}
          </View>
        </Animated.View>
      )}
      <Animated.View style={[s.cancelWrapper, cancelStyle]}>
        <Pressable onPress={handleCancel}>
          <Text style={s.cancelText}>취소</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
  },
  buttonsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  cancelWrapper: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: colors.ink,
  },
});

export default ProductHeader;
