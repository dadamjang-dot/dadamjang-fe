import { render, screen, userEvent } from "@testing-library/react-native";

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

  it("exposes checked radios while the modal is visible", () => {
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
  });
});
