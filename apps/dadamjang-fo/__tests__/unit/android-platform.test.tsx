import { act, type ReactElement } from "react";
import { View } from "react-native";
import { create, type ReactTestRenderer } from "react-test-renderer";

import type { Action } from "../../../../packages/mobile/src/action-button/action-button.types";
import ActionButton from "../../../../packages/mobile/src/action-button/action-button.android";
import ActionButtonGroup from "../../../../packages/mobile/src/action-button-group/action-button-group.android";
import TabLayout from "../../src/app/(tabs)/_layout";
import ProductLayout from "../../src/shared/components/product-layout/product-layout.android";

jest.mock(
  "../../../../packages/mobile/node_modules/@expo/ui/src/jetpack-compose/index.ts",
  () => ({
    FilledTonalButton: "FilledTonalButton",
    FilledTonalIconButton: "FilledTonalIconButton",
    Host: "Host",
    Icon: "ComposeIcon",
    IconButton: "IconButton",
    Row: "Row",
    Shape: {
      Circle: jest.fn(() => "circle"),
      Pill: jest.fn(() => "pill"),
    },
    Text: "ComposeText",
  }),
);

jest.mock(
  "../../../../packages/mobile/node_modules/@expo/ui/src/jetpack-compose/modifiers/index.ts",
  () => ({
    height: (value: number) => ({ height: value }),
    paddingAll: (value: number) => ({ paddingAll: value }),
    size: (width: number, height: number) => ({ height, width }),
    width: (value: number) => ({ width: value }),
  }),
);

jest.mock("../../../../packages/mobile/node_modules/expo-symbols/build/index.js", () => ({
  unstable_getMaterialSymbolSourceAsync: jest.fn(),
}));

jest.mock("@/shared/components", () => ({
  ActionButton: "ActionButton",
  ProductHeader: "ProductHeader",
  SearchContent: "SearchContent",
}));

jest.mock("expo-router/unstable-native-tabs", () => {
  const React = jest.requireActual("react");
  const component = (name: string) => {
    const Component = ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
    }) => React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };
  const NativeTabs = component("NativeTabs") as ReturnType<typeof component> & {
    Trigger: ReturnType<typeof component> & {
      Icon: ReturnType<typeof component>;
      Label: ReturnType<typeof component>;
    };
  };
  NativeTabs.Trigger = Object.assign(component("NativeTabsTrigger"), {
    Icon: component("NativeTabsTriggerIcon"),
    Label: component("NativeTabsTriggerLabel"),
  });
  return { NativeTabs };
});

const materialSource = { uri: "file:///material-symbol.png" };
const getMaterialSymbolSourceAsync = jest.requireMock(
  "../../../../packages/mobile/node_modules/expo-symbols/build/index.js",
).unstable_getMaterialSymbolSourceAsync as jest.Mock;

const render = (component: ReactElement) => {
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(component);
  });
  return renderer!;
};

const renderAsync = async (component: ReactElement) => {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(component);
    await Promise.resolve();
  });
  return renderer!;
};

const cartAction: Action = {
  accessibilityLabel: "장바구니",
  icon: { md: "shopping_cart", sf: "cart" },
  onPress: jest.fn(),
};

describe("Android platform UI", () => {
  beforeEach(() => {
    getMaterialSymbolSourceAsync.mockResolvedValue(materialSource);
  });

  it("renders one header action control for the complete action group", () => {
    const actions: Action[] = [
      {
        accessibilityLabel: "알림",
        icon: { md: "notifications", sf: "bell" },
        onPress: jest.fn(),
      },
      cartAction,
    ];
    const renderer = render(
      <ProductLayout headerActions={actions} variant="capsule">
        <View />
      </ProductLayout>,
    );
    const actionButtons = renderer.root.findAll(
      (node) => (node.type as unknown) === "ActionButton",
    );

    expect(actionButtons).toHaveLength(1);
    expect(actionButtons[0].props.actions).toBe(actions);
  });

  it("renders an Android action icon from a Material source with an accessible name", async () => {
    const renderer = await renderAsync(
      <ActionButton actions={[cartAction]} iconOnly />,
    );
    const icon = renderer.root.find(
      (node) => (node.type as unknown) === "ComposeIcon",
    );

    expect(icon.props.source).toBe(materialSource);
    expect(icon.props.contentDescription).toBe("장바구니");
  });

  it("renders Android action group icons with accessible names", async () => {
    const renderer = await renderAsync(
      <ActionButtonGroup actions={[cartAction]} variant="circularPair" />,
    );
    const icon = renderer.root.find(
      (node) => (node.type as unknown) === "ComposeIcon",
    );

    expect(icon.props.source).toBe(materialSource);
    expect(icon.props.contentDescription).toBe("장바구니");
  });

  it("provides a Material icon for every native tab", () => {
    const renderer = render(<TabLayout />);
    const icons = renderer.root.findAll(
      (node) => (node.type as unknown) === "NativeTabsTriggerIcon",
    );

    expect(icons.map((icon) => icon.props.md)).toEqual([
      "home",
      "add_box",
      "search",
      "favorite",
      "person",
    ]);
  });
});
