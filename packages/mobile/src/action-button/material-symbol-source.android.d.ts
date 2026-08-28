import type { AndroidSymbol } from "expo-symbols";
import type { ImageSourcePropType } from "react-native";

declare const getMaterialSymbolSourceAsync: (
  symbol: AndroidSymbol,
  size: number,
  color: string,
) => Promise<ImageSourcePropType | null>;

export { getMaterialSymbolSourceAsync };
