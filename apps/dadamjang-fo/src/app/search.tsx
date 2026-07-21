import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@dadamjang/design-tokens';
import { SearchInput } from '@/shared/components/search-input';

export const screenOptions = { animation: 'none' };

const SearchScreen = () => {
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <SearchInput />
        <Pressable onPress={() => router.back()} style={s.cancelButton}>
          <Text style={s.cancelText}>취소</Text>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButton: {
    marginLeft: 8,
  },
  cancelText: {
    fontSize: 16,
    color: colors.ink,
  },
});

export default SearchScreen;
