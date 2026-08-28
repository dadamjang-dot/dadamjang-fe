type RootSelection =
  | { kind: "field"; name: string }
  | { kind: "fragment"; name: string }
  | { kind: "inline"; selections: RootSelection[] };

type OperationDefinition = {
  operation: "query" | "mutation" | "subscription";
  name?: string;
  selections: RootSelection[];
};

type ParsedDocument = {
  operations: OperationDefinition[];
  fragments: Map<string, RootSelection[]>;
};

type ParsedSelectionSet = {
  selections: RootSelection[];
  next: number;
};

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
const NAME_PATTERN = /^[_A-Za-z][_0-9A-Za-z]*$/;
const PUNCTUATORS = new Set("!$&():=@[]{|}".split(""));
const GROUP_CLOSE = new Map([
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
]);
const VALUE_TOKEN = "\u0000value";

const tokenize = (source: string) => {
  const tokens: string[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (!character) break;
    if (/[,\s\uFEFF]/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === "#") {
      const newline = source.indexOf("\n", index + 1);
      index = newline < 0 ? source.length : newline + 1;
      continue;
    }
    if (source.startsWith('"""', index)) {
      index += 3;
      let closed = false;
      while (index < source.length) {
        if (source.startsWith('\\"""', index)) {
          index += 4;
          continue;
        }
        if (source.startsWith('"""', index)) {
          index += 3;
          closed = true;
          break;
        }
        index += 1;
      }
      if (!closed) return null;
      tokens.push(VALUE_TOKEN);
      continue;
    }
    if (character === '"') {
      index += 1;
      let closed = false;
      while (index < source.length) {
        const next = source[index];
        if (next === "\\") {
          index += 2;
          continue;
        }
        if (next === '"') {
          index += 1;
          closed = true;
          break;
        }
        if (next === "\n" || next === "\r") return null;
        index += 1;
      }
      if (!closed) return null;
      tokens.push(VALUE_TOKEN);
      continue;
    }
    if (source.startsWith("...", index)) {
      tokens.push("...");
      index += 3;
      continue;
    }
    if (/[_A-Za-z]/u.test(character)) {
      let end = index + 1;
      while (end < source.length && /[_0-9A-Za-z]/u.test(source[end] ?? ""))
        end += 1;
      tokens.push(source.slice(index, end));
      index = end;
      continue;
    }
    if (character === "-" || /[0-9]/u.test(character)) {
      let end = index + 1;
      while (end < source.length && /[0-9.eE+-]/u.test(source[end] ?? ""))
        end += 1;
      tokens.push(VALUE_TOKEN);
      index = end;
      continue;
    }
    if (PUNCTUATORS.has(character)) {
      tokens.push(character);
      index += 1;
      continue;
    }
    return null;
  }
  return tokens;
};

const isName = (token: string | undefined): token is string =>
  token !== undefined && NAME_PATTERN.test(token);

const skipGroup = (tokens: string[], start: number) => {
  const firstClose = GROUP_CLOSE.get(tokens[start] ?? "");
  if (!firstClose) return null;
  const closes = [firstClose];
  for (let index = start + 1; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    const nestedClose = GROUP_CLOSE.get(token);
    if (nestedClose) {
      closes.push(nestedClose);
      continue;
    }
    if (token !== closes.at(-1)) continue;
    closes.pop();
    if (closes.length === 0) return index + 1;
  }
  return null;
};

const skipDirectives = (tokens: string[], start: number) => {
  let index = start;
  while (tokens[index] === "@") {
    if (!isName(tokens[index + 1])) return null;
    index += 2;
    if (tokens[index] === "(") {
      const next = skipGroup(tokens, index);
      if (next === null) return null;
      index = next;
    }
  }
  return index;
};

const parseSelectionSet = (
  tokens: string[],
  start: number,
): ParsedSelectionSet | null => {
  if (tokens[start] !== "{") return null;
  const selections: RootSelection[] = [];
  let index = start + 1;
  while (index < tokens.length && tokens[index] !== "}") {
    if (tokens[index] === "...") {
      index += 1;
      if (tokens[index] === "on") {
        if (!isName(tokens[index + 1])) return null;
        index += 2;
        const afterDirectives = skipDirectives(tokens, index);
        if (afterDirectives === null) return null;
        const inline = parseSelectionSet(tokens, afterDirectives);
        if (!inline) return null;
        selections.push({ kind: "inline", selections: inline.selections });
        index = inline.next;
        continue;
      }
      const fragmentName = tokens[index];
      if (!isName(fragmentName)) return null;
      index += 1;
      const afterDirectives = skipDirectives(tokens, index);
      if (afterDirectives === null) return null;
      selections.push({ kind: "fragment", name: fragmentName });
      index = afterDirectives;
      continue;
    }

    const firstName = tokens[index];
    if (!isName(firstName)) return null;
    index += 1;
    let fieldName = firstName;
    if (tokens[index] === ":") {
      fieldName = tokens[index + 1] ?? "";
      if (!isName(fieldName)) return null;
      index += 2;
    }
    if (tokens[index] === "(") {
      const next = skipGroup(tokens, index);
      if (next === null) return null;
      index = next;
    }
    const afterDirectives = skipDirectives(tokens, index);
    if (afterDirectives === null) return null;
    index = afterDirectives;
    if (tokens[index] === "{") {
      const next = skipGroup(tokens, index);
      if (next === null) return null;
      index = next;
    }
    selections.push({ kind: "field", name: fieldName });
  }
  return tokens[index] === "}" ? { selections, next: index + 1 } : null;
};

const parseDocument = (source: string): ParsedDocument | null => {
  const tokens = tokenize(source);
  if (!tokens) return null;
  const operations: OperationDefinition[] = [];
  const fragments = new Map<string, RootSelection[]>();
  let index = 0;
  while (index < tokens.length) {
    if (tokens[index] === "fragment") {
      const name = tokens[index + 1];
      const typeName = tokens[index + 3];
      if (!isName(name) || tokens[index + 2] !== "on" || !isName(typeName))
        return null;
      index += 4;
      const afterDirectives = skipDirectives(tokens, index);
      if (afterDirectives === null) return null;
      const selectionSet = parseSelectionSet(tokens, afterDirectives);
      if (!selectionSet || fragments.has(name)) return null;
      fragments.set(name, selectionSet.selections);
      index = selectionSet.next;
      continue;
    }

    const operationToken = tokens[index];
    if (
      operationToken !== "query" &&
      operationToken !== "mutation" &&
      operationToken !== "subscription"
    )
      return null;
    index += 1;
    let name: string | undefined;
    if (isName(tokens[index])) {
      name = tokens[index];
      index += 1;
    }
    if (tokens[index] === "(") {
      const next = skipGroup(tokens, index);
      if (next === null) return null;
      index = next;
    }
    const afterDirectives = skipDirectives(tokens, index);
    if (afterDirectives === null) return null;
    const selectionSet = parseSelectionSet(tokens, afterDirectives);
    if (!selectionSet) return null;
    operations.push({
      operation: operationToken,
      ...(name ? { name } : {}),
      selections: selectionSet.selections,
    });
    index = selectionSet.next;
  }
  return { operations, fragments };
};

const rootFieldMask = (
  selections: RootSelection[],
  fragments: ReadonlyMap<string, RootSelection[]>,
  active: Set<string>,
  memo: Map<string, number>,
) => {
  let mask = 0;
  for (const selection of selections) {
    if (selection.kind === "field") {
      mask |= PUBLIC_FIELDS.has(selection.name)
        ? PUBLIC_ROOT_FIELD
        : PROTECTED_ROOT_FIELD;
    } else if (selection.kind === "inline") {
      mask |= rootFieldMask(selection.selections, fragments, active, memo);
    } else {
      const fragment = fragments.get(selection.name);
      if (
        !fragment ||
        active.has(selection.name) ||
        active.size >= MAX_FRAGMENT_DEPTH
      )
        return mask | PROTECTED_ROOT_FIELD;
      let nested = memo.get(selection.name);
      if (nested === undefined) {
        active.add(selection.name);
        nested = rootFieldMask(fragment, fragments, active, memo);
        active.delete(selection.name);
        memo.set(selection.name, nested);
      }
      mask |= nested;
    }
    if (mask & PROTECTED_ROOT_FIELD) return mask;
  }
  return mask;
};

export const isPublicOperation = (payload: Record<string, unknown>) => {
  if (typeof payload.query !== "string" || !payload.query) return false;
  const document = parseDocument(payload.query);
  if (!document) return false;
  const operationName =
    typeof payload.operationName === "string"
      ? payload.operationName
      : undefined;
  const candidates = operationName
    ? document.operations.filter(
        (operation) => operation.name === operationName,
      )
    : document.operations;
  if (candidates.length !== 1) return false;
  const operation = candidates[0];
  if (!operation || operation.operation !== "mutation") return false;
  return (
    rootFieldMask(
      operation.selections,
      document.fragments,
      new Set(),
      new Map(),
    ) === PUBLIC_ROOT_FIELD
  );
};
