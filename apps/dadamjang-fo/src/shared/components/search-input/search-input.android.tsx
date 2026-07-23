import { Host, TextField, useNativeState } from '@expo/ui/jetpack-compose'
import { View } from 'react-native'

import type { SearchInputProps } from './search-input.types'

const SearchInput = ({ value, placeholder, onValueChange }: SearchInputProps) => {
  const text = useNativeState(value ?? '')

  return (
    <Host matchContents>
      <TextField value={text} onValueChange={onValueChange}>
        <TextField.Placeholder>
          <View />
        </TextField.Placeholder>
      </TextField>
    </Host>
  )
}

export default SearchInput
