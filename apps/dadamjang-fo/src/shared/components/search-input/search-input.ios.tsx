import { Host, TextField, useNativeState } from '@expo/ui/swift-ui'

import type { SearchInputProps } from './search-input.types'

const SearchInput = ({ value, placeholder, onValueChange }: SearchInputProps) => {
  const text = useNativeState(value ?? '')

  return (
    <Host matchContents>
      <TextField
        text={text}
        placeholder={placeholder}
        onTextChange={onValueChange}
      />
    </Host>
  )
}

export default SearchInput
