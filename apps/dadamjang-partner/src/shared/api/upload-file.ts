export type UploadProgress = (percent: number) => void;

export const createUploadSlotRunner = (limit: number) => {
  let activeTasks = 0;
  const queuedTasks: Array<() => void> = [];

  return async <T>(task: () => Promise<T>) => {
    if (activeTasks >= limit)
      await new Promise<void>((resolve) => queuedTasks.push(resolve));
    else activeTasks += 1;

    try {
      return await task();
    } finally {
      const next = queuedTasks.shift();
      if (next) next();
      else activeTasks -= 1;
    }
  };
};

export const uploadFile = (
  url: string,
  file: File,
  onProgress: UploadProgress,
  signal?: AbortSignal,
) => {
  if (signal?.aborted)
    return Promise.reject(new Error("이미지 업로드가 취소되었습니다."));
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => signal?.removeEventListener("abort", abort);
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    request.open("PUT", url);
    request.timeout = 60_000;
    request.setRequestHeader("content-type", file.type);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (settled) return;
      if (request.status >= 200 && request.status < 300) {
        settled = true;
        cleanup();
        onProgress(100);
        resolve();
        return;
      }
      fail(new Error(`이미지 업로드에 실패했습니다. (${request.status})`));
    });
    request.addEventListener("error", () =>
      fail(new Error("이미지 업로드 중 네트워크 오류가 발생했습니다.")),
    );
    request.onabort = () => fail(new Error("이미지 업로드가 취소되었습니다."));
    request.ontimeout = () => {
      fail(new Error("이미지 업로드 시간이 초과되었습니다."));
      request.abort();
    };
    signal?.addEventListener("abort", abort, { once: true });
    request.send(file);
  });
};
