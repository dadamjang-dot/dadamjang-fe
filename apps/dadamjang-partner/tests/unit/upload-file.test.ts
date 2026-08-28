import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/shared/api";

class MockRequest {
  static instances: MockRequest[] = [];
  static status = 204;
  static event = "load";
  status = MockRequest.status;
  timeout = 0;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  upload = { addEventListener: vi.fn() };
  listeners: Record<string, () => void> = {};
  open = vi.fn();
  setRequestHeader = vi.fn();
  abort = vi.fn(() => {
    this.onabort?.();
    this.listeners.abort?.();
  });
  constructor() {
    MockRequest.instances.push(this);
  }
  addEventListener = (name: string, listener: () => void) => {
    this.listeners[name] = listener;
  };
  send = () => {
    if (MockRequest.event === "timeout")
      setTimeout(() => this.ontimeout?.(), this.timeout);
    else if (MockRequest.event === "abort") this.onabort?.();
    else this.listeners[MockRequest.event]?.();
  };
}

const { uploadFile } = api;

describe("uploadFile", () => {
  beforeEach(() => {
    MockRequest.status = 204;
    MockRequest.event = "load";
    MockRequest.instances = [];
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

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

  it("times out once and releases the next queued upload", async () => {
    const createUploadSlotRunner = (
      api as typeof api & {
        createUploadSlotRunner?: (
          limit: number,
        ) => <T>(task: () => Promise<T>) => Promise<T>;
      }
    ).createUploadSlotRunner;
    expect(createUploadSlotRunner).toBeTypeOf("function");
    if (!createUploadSlotRunner) throw new Error("Expected upload slot runner");
    vi.useFakeTimers();
    vi.stubGlobal("XMLHttpRequest", MockRequest);
    MockRequest.event = "timeout";
    const run = createUploadSlotRunner(1);
    const rejected = vi.fn();
    const next = vi.fn();
    const first = run(() =>
      uploadFile(
        "https://upload.test/first",
        new File(["x"], "first.png", { type: "image/png" }),
        vi.fn(),
      ),
    ).catch((error) => {
      rejected(error);
      throw error;
    });
    const assertion = expect(first).rejects.toThrow("시간");
    const second = run(async () => next());

    expect(MockRequest.instances[0]?.timeout).toBe(60_000);
    expect(next).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
    await second;

    expect(MockRequest.instances[0]?.abort).toHaveBeenCalledOnce();
    expect(rejected).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });
});
