import { colors, spacing } from '@dadamjang/design-tokens'

declare module 'react-native-unistyles' {
  interface UnistylesThemes {
    light: typeof lightTheme
  }
}

const lightTheme = {
  colors,
  spacing,
}

type AppTheme = typeof lightTheme

export { lightTheme }
export type { AppTheme }
