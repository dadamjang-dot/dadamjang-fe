import { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import type { SearchInputProps } from './search-input.types';

const SearchInput = forwardRef<TextInput, SearchInputProps>(({ placeholder = '검색', onFocus }, ref) => (
  <BlurView intensity={20} tint="light" style={styles.container}>
    <TextInput
      ref={ref}
      placeholder={placeholder}
      placeholderTextColor="#8A8A8A"
      style={styles.input}
      onFocus={onFocus}
    />
  </BlurView>
));

SearchInput.displayName = 'SearchInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111111',
  },
});

export default SearchInput;
