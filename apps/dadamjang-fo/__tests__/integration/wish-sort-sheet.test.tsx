import { render, screen, userEvent } from "@testing-library/react-native";
import { View } from "react-native";

import WishSortSheet from "@/features/wish/components/wish-sort-sheet";

jest.mock("@/shared/components", () =>
  jest.requireActual("@/shared/components/button"),
);

describe("wish sort sheet accessibility", () => {
  it("exposes an accessible backdrop close action", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <WishSortSheet
        onClose={onClose}
        onSelect={jest.fn()}
        selectedSort="RECOMMENDED"
        visible
      />,
    );

    await user.press(screen.getByRole("button", { name: "정렬 닫기" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exposes checked radios inside an iOS and Android modal scope", () => {
    render(
      <WishSortSheet
        onClose={jest.fn()}
        onSelect={jest.fn()}
        selectedSort="RECOMMENDED"
        visible
      />,
    );

    expect(screen.getByRole("radio", { name: "추천순" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "최신순" })).not.toBeChecked();

    const modalScope = screen
      .UNSAFE_getAllByType(View)
      .find((view) => view.props.accessibilityViewIsModal === true);

    expect(modalScope?.props.importantForAccessibility).toBe("yes");
  });
});
