import { fireEvent } from "@testing-library/react-native";
import { Slot } from "expo-router";
import { renderRouter, screen, waitFor } from "expo-router/testing-library";
import { Text } from "react-native";

import { ErrorBoundary } from "@/app/_layout";
import { Sentry } from "@/shared/observability/sentry";

const RootRoute = () => <Slot />;

describe("root error boundary", () => {
  it("captures a thrown route and retries its render", async () => {
    const error = new Error("route render failed");
    let shouldThrow = true;
    const FailingRoute = () => {
      if (shouldThrow) throw error;
      return <Text>복구된 화면</Text>;
    };
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    renderRouter({
      _layout: { default: RootRoute, ErrorBoundary },
      index: FailingRoute,
    });

    expect(await screen.findByText("화면을 불러오지 못했어요.")).toBeVisible();
    await waitFor(() =>
      expect(Sentry.captureException).toHaveBeenCalledWith(error),
    );

    shouldThrow = false;
    fireEvent.press(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("복구된 화면")).toBeVisible();
  });
});
