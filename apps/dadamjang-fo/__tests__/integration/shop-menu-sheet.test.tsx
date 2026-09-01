import { fireEvent, render, screen } from "@testing-library/react-native";

import ShopMenuSheetRoute from "@/app/shop-menu-sheet";
import { useCategories, useShopFilters } from "@/features/catalog";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("@/features/catalog", () => ({
  useCategories: jest.fn(),
  useShopFilters: jest.fn(),
}));

const categories = [
  {
    categoryId: "tops",
    name: "상의",
    slug: "tops",
    parentId: null,
    sortOrder: 2,
  },
  {
    categoryId: "coats",
    name: "코트",
    slug: "coats",
    parentId: "outer",
    sortOrder: 2,
  },
  {
    categoryId: "outer",
    name: "아우터",
    slug: "outer",
    parentId: null,
    sortOrder: 1,
  },
  {
    categoryId: "jackets",
    name: "재킷",
    slug: "jackets",
    parentId: "outer",
    sortOrder: 1,
  },
] as const;

describe("shop menu sheet route", () => {
  const updateFilters = jest.fn();
  const refetch = jest.fn();

  beforeEach(() => {
    jest.mocked(useCategories).mockReturnValue({
      data: categories,
      isError: false,
      isLoading: false,
      refetch,
    } as never);
    jest.mocked(useShopFilters).mockReturnValue({
      filters: { categoryId: "jackets" },
      updateFilters,
    } as never);
  });

  it("shows a loading state while categories load", () => {
    jest.mocked(useCategories).mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
      refetch,
    } as never);

    render(<ShopMenuSheetRoute />);

    expect(screen.getByText("카테고리를 불러오는 중이에요.")).toBeVisible();
  });

  it("retries a category loading error", () => {
    jest.mocked(useCategories).mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch,
    } as never);

    render(<ShopMenuSheetRoute />);
    fireEvent.press(screen.getByRole("button", { name: "다시 시도" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("orders every category level and marks the current category", () => {
    render(<ShopMenuSheetRoute />);

    expect(
      screen
        .getAllByRole("button")
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(["전체", "아우터", "재킷", "코트", "상의"]);
    expect(screen.queryByText("비교함")).toBeNull();
    expect(
      screen.getByRole("button", { name: "재킷" }).props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
  });

  it("applies a category navigation filter and closes the sheet", () => {
    render(<ShopMenuSheetRoute />);
    fireEvent.press(screen.getByText("재킷"));

    expect(updateFilters).toHaveBeenCalledWith({
      categoryId: "jackets",
      categoryIds: [],
      categorySource: "navigation",
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it("clears the category filter and closes the sheet", () => {
    render(<ShopMenuSheetRoute />);
    fireEvent.press(screen.getByText("전체"));

    expect(updateFilters).toHaveBeenCalledWith({
      categoryId: undefined,
      categoryIds: [],
      categorySource: undefined,
    });
    expect(mockBack).toHaveBeenCalled();
  });
});
