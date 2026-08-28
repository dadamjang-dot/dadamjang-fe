"use client";

const GlobalError = ({ retry }: { retry: () => void }) => (
  <html lang="ko">
    <body>
      <main>
        <h1>관리자 화면을 불러오지 못했습니다</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button type="button" onClick={retry}>
          다시 시도
        </button>
      </main>
    </body>
  </html>
);

export default GlobalError;
