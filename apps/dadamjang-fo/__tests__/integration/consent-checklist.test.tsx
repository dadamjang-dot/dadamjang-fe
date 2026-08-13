import { fireEvent, render, screen } from "@testing-library/react-native";

import { ConsentChecklist } from "@/features/auth/components/consent-checklist";
import type { SignupConsentDocument } from "@/features/auth/types";

const documents: SignupConsentDocument[] = [
  {
    documentId: "age",
    type: "AGE_OVER_14",
    title: "만 14세 이상",
    body: "본문",
    version: "1",
    required: true,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
  {
    documentId: "service",
    type: "SERVICE_TERMS",
    title: "서비스 이용약관",
    body: "본문",
    version: "1",
    required: true,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
  {
    documentId: "marketing",
    type: "MARKETING",
    title: "마케팅 정보 수신",
    body: "본문",
    version: "1",
    required: false,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
];

describe("ConsentChecklist", () => {
  it("exposes mixed state and selects every document from all-agree", async () => {
    const onToggle = jest.fn();
    const onToggleAll = jest.fn();
    await render(
      <ConsentChecklist
        documents={documents}
        onOpenDocument={jest.fn()}
        onToggle={onToggle}
        onToggleAll={onToggleAll}
        selectedDocumentIds={new Set(["age"])}
      />,
    );

    expect(screen.getByTestId("e2e.auth.consent.all").props.accessibilityState).toMatchObject({
      checked: "mixed",
    });
    await fireEvent.press(screen.getByTestId("e2e.auth.consent.all"));
    expect(onToggleAll).toHaveBeenCalledWith(true);
    await fireEvent.press(screen.getByTestId("e2e.auth.consent.marketing"));
    expect(onToggle).toHaveBeenCalledWith("marketing");
  });

  it("keeps document details as an independent action", async () => {
    const onOpenDocument = jest.fn();
    await render(
      <ConsentChecklist
        documents={documents}
        onOpenDocument={onOpenDocument}
        onToggle={jest.fn()}
        onToggleAll={jest.fn()}
        selectedDocumentIds={new Set()}
      />,
    );

    await fireEvent.press(screen.getByTestId("e2e.auth.consent.details.service"));
    expect(onOpenDocument).toHaveBeenCalledWith("service");
  });
});
