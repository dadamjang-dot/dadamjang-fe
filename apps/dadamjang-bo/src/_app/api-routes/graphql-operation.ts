import {
  Kind,
  OperationTypeNode,
  parse,
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from "graphql";

const PUBLIC_FIELDS = new Set([
  "signin",
  "refresh",
  "acceptAdminInvite",
  "requestPasswordReset",
  "resetPassword",
]);
const PUBLIC_ROOT_FIELD = 1;
const PROTECTED_ROOT_FIELD = 2;
const MAX_FRAGMENT_DEPTH = 64;

const rootFieldMask = (
  selectionSet: SelectionSetNode,
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
  active: Set<string>,
  memo: Map<string, number>,
): number => {
  let mask = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      mask |= PUBLIC_FIELDS.has(selection.name.value)
        ? PUBLIC_ROOT_FIELD
        : PROTECTED_ROOT_FIELD;
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      mask |= rootFieldMask(selection.selectionSet, fragments, active, memo);
    } else {
      const name = selection.name.value;
      const fragment = fragments.get(name);
      if (!fragment || active.has(name) || active.size >= MAX_FRAGMENT_DEPTH)
        return mask | PROTECTED_ROOT_FIELD;
      let nested = memo.get(name);
      if (nested === undefined) {
        active.add(name);
        nested = rootFieldMask(fragment.selectionSet, fragments, active, memo);
        active.delete(name);
        memo.set(name, nested);
      }
      mask |= nested;
    }
    if (mask & PROTECTED_ROOT_FIELD) return mask;
  }
  return mask;
};

export const isPublicOperation = (payload: Record<string, unknown>) => {
  if (typeof payload.query !== "string" || !payload.query) return false;
  try {
    const document = parse(payload.query);
    const operationName =
      typeof payload.operationName === "string"
        ? payload.operationName
        : undefined;
    const operations = document.definitions.filter(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === Kind.OPERATION_DEFINITION &&
        (!operationName || definition.name?.value === operationName),
    );
    if (operations.length !== 1) return false;
    const operation = operations[0];
    if (!operation || operation.operation !== OperationTypeNode.MUTATION)
      return false;

    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of document.definitions) {
      if (definition.kind !== Kind.FRAGMENT_DEFINITION) continue;
      if (fragments.has(definition.name.value)) return false;
      fragments.set(definition.name.value, definition);
    }
    return (
      rootFieldMask(operation.selectionSet, fragments, new Set(), new Map()) ===
      PUBLIC_ROOT_FIELD
    );
  } catch {
    return false;
  }
};
