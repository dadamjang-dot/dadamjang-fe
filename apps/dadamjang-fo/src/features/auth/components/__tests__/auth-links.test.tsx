import { render, screen } from "@testing-library/react-native";

import { colors } from "@dadamjang/design-tokens";

import { AuthLinks } from "../auth-links";

describe("AuthLinks", () => {
  it("renders recovery links with subdued regular labels", () => {
    render(<AuthLinks onFindEmail={jest.fn()} onFindPassword={jest.fn()} />);

    expect(screen.getByText("이메일 찾기")).toHaveStyle({
      color: colors.muted,
      fontWeight: "400",
    });
    expect(screen.getByText("비밀번호 찾기")).toHaveStyle({
      color: colors.muted,
      fontWeight: "400",
    });
  });
});
