import { forwardRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors } from '@dadamjang/design-tokens';
import type { SearchInputProps } from './search-input.types';

const SearchInput = forwardRef<TextInput, SearchInputProps>(({ placeholder = '검색', onFocus, style }, ref) => (
  <View style={[styles.container, style]}>
    <TextInput
      ref={ref}
      placeholder={placeholder}
      placeholderTextColor="#8A8A8A"
      style={styles.input}
      onFocus={onFocus}
    />
  </View>
));

SearchInput.displayName = 'SearchInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors.primarySoft,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111111',
    paddingVertical: 0,
  },
});

export default SearchInput;
