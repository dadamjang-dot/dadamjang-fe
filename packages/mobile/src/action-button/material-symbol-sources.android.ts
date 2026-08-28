import add from "@expo/material-symbols/add.xml";
import close from "@expo/material-symbols/close.xml";
import menu from "@expo/material-symbols/menu.xml";
import notifications from "@expo/material-symbols/notifications.xml";
import settings from "@expo/material-symbols/settings.xml";
import shoppingCart from "@expo/material-symbols/shopping_cart.xml";
import type { ImageSourcePropType } from "react-native";

import type { ActionMaterialSymbol } from "./action-button.types";

const materialSymbolSources: Record<
  ActionMaterialSymbol,
  ImageSourcePropType
> = {
  add,
  close,
  menu,
  notifications,
  settings,
  shopping_cart: shoppingCart,
};

export { materialSymbolSources };
