import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadFile } from "@/shared/api";

class MockRequest {
  static status = 204;
  static event = "load";
  status = MockRequest.status;
  upload = { addEventListener: vi.fn() };
  listeners: Record<string, () => void> = {};
  open = vi.fn();
  setRequestHeader = vi.fn();
  abort = () => this.listeners.abort?.();
  addEventListener = (name: string, listener: () => void) => {
    this.listeners[name] = listener;
  };
  send = () => this.listeners[MockRequest.event]?.();
}

describe("uploadFile", () => {
  beforeEach(() => {
    MockRequest.status = 204;
    MockRequest.event = "load";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("accepts only a 2xx response", async () => {
    const progress = vi.fn();
    vi.stubGlobal("XMLHttpRequest", MockRequest);
    await expect(
      uploadFile(
        "https://upload.test",
        new File(["x"], "x.png", { type: "image/png" }),
        progress,
      ),
    ).resolves.toBeUndefined();
    expect(progress).toHaveBeenLastCalledWith(100);
    MockRequest.status = 403;
    await expect(
      uploadFile(
        "https://upload.test",
        new File(["x"], "x.png", { type: "image/png" }),
        vi.fn(),
      ),
    ).rejects.toThrow("403");
  });

  it.each(["error", "abort"])("rejects the %s event", async (event) => {
    MockRequest.event = event;
    vi.stubGlobal("XMLHttpRequest", MockRequest);
    await expect(
      uploadFile(
        "https://upload.test",
        new File(["x"], "x.png", { type: "image/png" }),
        vi.fn(),
      ),
    ).rejects.toThrow();
  });

  it("aborts the request when its signal is cancelled", async () => {
    const controller = new AbortController();
    vi.stubGlobal("XMLHttpRequest", MockRequest);
    MockRequest.event = "pending";
    const upload = uploadFile(
      "https://upload.test",
      new File(["x"], "x.png", { type: "image/png" }),
      vi.fn(),
      controller.signal,
    );

    controller.abort();

    await expect(upload).rejects.toThrow("취소");
  });
});
