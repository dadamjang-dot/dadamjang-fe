import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components/button";
import { getConsentSelectionState } from "../rules";
import type { SignupConsentDocument, SignupConsentType } from "../types";

type ConsentChecklistProps = {
  documents: readonly SignupConsentDocument[];
  selectedDocumentIds: ReadonlySet<string>;
  onToggle: (documentId: string) => void;
  onToggleAll: (selected: boolean) => void;
  onOpenDocument: (documentId: string) => void;
};

const typeOrder: Record<SignupConsentType, number> = {
  AGE_OVER_14: 0,
  SERVICE_TERMS: 1,
  PRIVACY_COLLECTION: 2,
  MARKETING: 3,
};

const Check = ({ state }: { state: "checked" | "mixed" | "unchecked" }) => (
  <View style={[s.check, state !== "unchecked" && s.checked]}>
    {state !== "unchecked" ? (
      <Text style={s.checkLabel}>{state === "mixed" ? "−" : "✓"}</Text>
    ) : null}
  </View>
);

export const ConsentChecklist = ({
  documents,
  selectedDocumentIds,
  onToggle,
  onToggleAll,
  onOpenDocument,
}: ConsentChecklistProps) => {
  const allState = getConsentSelectionState(documents, selectedDocumentIds);
  const orderedDocuments = [...documents].sort(
    (left, right) => typeOrder[left.type] - typeOrder[right.type],
  );

  return (
    <View style={s.checklist}>
      <Button
        accessibilityLabel="모두 동의하기"
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: allState === "mixed" ? "mixed" : allState === "checked",
        }}
        onPress={() => onToggleAll(allState !== "checked")}
        style={s.allRow}
        testID="e2e.auth.consent.all"
        variant="bare"
      >
        <Check state={allState} />
        <Text style={s.allLabel}>모두 동의하기</Text>
      </Button>
      <View style={s.documents}>
        {orderedDocuments.map((document) => {
          const selected = selectedDocumentIds.has(document.documentId);
          return (
            <View key={document.documentId} style={s.documentRow}>
              <Button
                accessibilityLabel={`${document.required ? "필수" : "선택"} ${document.title}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => onToggle(document.documentId)}
                style={s.documentToggle}
                testID={`e2e.auth.consent.${document.type.toLowerCase().replaceAll("_", "-")}`}
                variant="bare"
              >
                <Check state={selected ? "checked" : "unchecked"} />
                <Text style={s.documentLabel}>
                  <Text style={s.requirement}>
                    {document.required ? "[필수]" : "[선택]"}
                  </Text>{" "}
                  {document.title}
                </Text>
              </Button>
              <Button
                accessibilityLabel={`${document.title} 상세 보기`}
                onPress={() => onOpenDocument(document.documentId)}
                style={s.details}
                testID={`e2e.auth.consent.details.${document.documentId}`}
                variant="bare"
              >
                <Text style={s.detailsLabel}>보기</Text>
              </Button>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  checklist: { borderTopWidth: 1, borderTopColor: colors.ink },
  allRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  allLabel: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  documents: { paddingVertical: spacing.sm },
  documentRow: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  documentToggle: {
    minWidth: 0,
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  documentLabel: {
    minWidth: 0,
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
  },
  requirement: { color: colors.muted, fontSize: 12 },
  details: { minHeight: 44, justifyContent: "center", paddingLeft: spacing.md },
  detailsLabel: {
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  check: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  checked: { borderColor: colors.ink, backgroundColor: colors.ink },
  checkLabel: { color: colors.surface, fontSize: 14, fontWeight: "800" },
});
