import { fireEvent, screen } from "@testing-library/react-native";

export const layoutLegendList = (accessibilityLabel: string) => {
  fireEvent(screen.getByLabelText(accessibilityLabel), "layout", {
    nativeEvent: {
      layout: { height: 844, width: 390, x: 0, y: 0 },
    },
  });
};
