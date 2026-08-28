import { fireEvent, screen } from "@testing-library/react-native";

export const layoutLegendList = (accessibilityLabel: string) => {
  const list = screen.getByLabelText(accessibilityLabel);
  fireEvent(list, "layout", {
    nativeEvent: {
      layout: { height: 844, width: 390, x: 0, y: 0 },
    },
  });
  list
    .findAll(
      (node) =>
        node !== list &&
        typeof node.type === "string" &&
        typeof node.props.onLayout === "function",
    )
    .forEach((node, index) => {
      fireEvent(node, "layout", {
        nativeEvent: {
          layout: { height: 120, width: 390, x: 0, y: index * 120 },
        },
      });
    });
};

export const scrollLegendListToEnd = (accessibilityLabel: string) => {
  fireEvent.scroll(screen.getByLabelText(accessibilityLabel), {
    nativeEvent: {
      contentOffset: { x: 0, y: 10_000 },
      contentSize: { height: 10_844, width: 390 },
      layoutMeasurement: { height: 844, width: 390 },
    },
  });
};
