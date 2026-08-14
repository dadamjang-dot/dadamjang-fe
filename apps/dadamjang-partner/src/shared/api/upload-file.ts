export type UploadProgress = (percent: number) => void;

export const uploadFile = (
  url: string,
  file: File,
  onProgress: UploadProgress,
) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", file.type);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(`이미지 업로드에 실패했습니다. (${request.status})`));
    });
    request.addEventListener("error", () =>
      reject(new Error("이미지 업로드 중 네트워크 오류가 발생했습니다.")),
    );
    request.addEventListener("abort", () =>
      reject(new Error("이미지 업로드가 취소되었습니다.")),
    );
    request.send(file);
  });
