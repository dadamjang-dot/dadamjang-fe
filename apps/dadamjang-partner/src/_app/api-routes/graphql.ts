import { NextResponse } from "next/server";
import {
  Kind,
  parse,
  type FragmentDefinitionNode,
  type SelectionNode,
} from "graphql";

type GraphQlPayload = Record<string, unknown>;

const MAX_BODY_BYTES = 1024 * 1024;
const PUBLIC_FIELDS = new Set(["signin", "refresh"]);
const PUBLIC_ROOT_FIELD = 1;
const PROTECTED_ROOT_FIELD = 2;
const MAX_FRAGMENT_DEPTH = 64;

const upstreamUrl = () => {
  const value = process.env.DADAMJANG_API_URL;
  if (!value) throw new Error("DADAMJANG_API_URL is required");
  return value;
};

const setCookies = (headers: Headers) => {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
};

const COOKIE_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseCookiePair = (value: string): [string, string] | null => {
  const cookie = value.split(";", 1).at(0)?.trim();
  if (!cookie) return null;
  const separator = cookie.indexOf("=");
  const name = cookie.slice(0, separator);
  if (separator <= 0 || !COOKIE_NAME_PATTERN.test(name)) return null;
  return [name, cookie];
};

const mergeCookies = (cookieHeader: string, cookies: string[]) => {
  const values = new Map<string, string>();
  const addCookie = (value: string) => {
    const pair = parseCookiePair(value);
    if (pair) values.set(pair[0], pair[1]);
  };
  cookieHeader
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach(addCookie);
  cookies.forEach(addCookie);
  return [...values.values()].join("; ");
};

const forward = (body: string, cookie: string, deviceId: string) =>
  fetch(upstreamUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-device-id": deviceId,
    },
    body,
    cache: "no-store",
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const decodeDeviceId = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    const decoded = decodeURIComponent(value);
    return UUID_PATTERN.test(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
};

const readPayload = (body: string): GraphQlPayload | null => {
  try {
    const payload: unknown = JSON.parse(body);
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
};

const isUnauthenticated = (payload: GraphQlPayload | null) => {
  const errors = payload?.errors;
  return (
    Array.isArray(errors) &&
    errors.some(
      (error) =>
        isRecord(error) &&
        isRecord(error.extensions) &&
        error.extensions.code === "UNAUTHENTICATED",
    )
  );
};

const hasRefreshData = (payload: GraphQlPayload | null) => {
  const data = payload?.data;
  if (!isRecord(data) || !isRecord(data.refresh)) return false;
  return typeof data.refresh.role === "string";
};

const rootFieldMask = (
  selections: readonly SelectionNode[],
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
  active: Set<string>,
  memo: Map<string, number>,
) => {
  let mask = 0;
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      mask |= PUBLIC_FIELDS.has(selection.name.value)
        ? PUBLIC_ROOT_FIELD
        : PROTECTED_ROOT_FIELD;
      if (mask & PROTECTED_ROOT_FIELD) return mask;
      continue;
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      mask |= rootFieldMask(
        selection.selectionSet.selections,
        fragments,
        active,
        memo,
      );
      if (mask & PROTECTED_ROOT_FIELD) return mask;
      continue;
    }
    const name = selection.name.value;
    const fragment = fragments.get(name);
    if (!fragment || active.has(name) || active.size >= MAX_FRAGMENT_DEPTH)
      return mask | PROTECTED_ROOT_FIELD;
    let nested = memo.get(name);
    if (nested === undefined) {
      active.add(name);
      nested = rootFieldMask(
        fragment.selectionSet.selections,
        fragments,
        active,
        memo,
      );
      active.delete(name);
      memo.set(name, nested);
    }
    mask |= nested;
    if (mask & PROTECTED_ROOT_FIELD) return mask;
  }
  return mask;
};

const isPublicOperation = (payload: GraphQlPayload) => {
  if (typeof payload.query !== "string" || !payload.query) return false;
  try {
    const definitions = parse(payload.query).definitions;
    const operations = definitions.filter(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION,
    );
    const operationName =
      typeof payload.operationName === "string"
        ? payload.operationName
        : undefined;
    const operation = operationName
      ? operations.find(
          (definition) => definition.name?.value === operationName,
        )
      : operations.length === 1
        ? operations[0]
        : undefined;
    if (!operation || operation.operation !== "mutation") return false;
    const fragments = new Map(
      definitions
        .filter((definition) => definition.kind === Kind.FRAGMENT_DEFINITION)
        .map((definition) => [definition.name.value, definition]),
    );
    return (
      rootFieldMask(
        operation.selectionSet.selections,
        fragments,
        new Set(),
        new Map(),
      ) === PUBLIC_ROOT_FIELD
    );
  } catch {
    return false;
  }
};

const readBody = async (request: Request) => {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) return body + decoder.decode();
    bytes += chunk.value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(chunk.value, { stream: true });
  }
};

const responseWithCookies = (
  body: string,
  status: number,
  contentType: string | null,
  cookies: string[],
  deviceId?: string,
) => {
  const response = new NextResponse(body, {
    status,
    headers: { "content-type": contentType ?? "application/json" },
  });
  cookies.forEach((cookie) => response.headers.append("set-cookie", cookie));
  if (deviceId)
    response.cookies.set("partner_device_id", deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  return response;
};

export const handleGraphQlPost = async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)
    .at(0)
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json")
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 },
    );
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES)
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  const body = await readBody(request);
  if (body === null)
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  const input = readPayload(body);
  if (!input || typeof input.query !== "string" || !input.query)
    return NextResponse.json(
      { error: "GraphQL query is required" },
      { status: 400 },
    );

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)partner_device_id=([^;]+)/);
  const matchedDeviceId = decodeDeviceId(cookieMatch?.[1]);
  const deviceId = matchedDeviceId ?? crypto.randomUUID();
  const createdDeviceId = matchedDeviceId ? undefined : deviceId;
  const initial = await forward(body, cookieHeader, deviceId);
  const initialBody = await initial.text();
  const initialCookies = setCookies(initial.headers);
  if (!isUnauthenticated(readPayload(initialBody)) || isPublicOperation(input))
    return responseWithCookies(
      initialBody,
      initial.status,
      initial.headers.get("content-type"),
      initialCookies,
      createdDeviceId,
    );

  const refreshBody = JSON.stringify({
    query: "mutation Refresh { refresh { role } }",
  });
  const refresh = await forward(
    refreshBody,
    mergeCookies(cookieHeader, initialCookies),
    deviceId,
  );
  const refreshText = await refresh.text();
  const refreshCookies = setCookies(refresh.headers);
  const refreshPayload = readPayload(refreshText);
  if (
    !refresh.ok ||
    isUnauthenticated(refreshPayload) ||
    !hasRefreshData(refreshPayload)
  ) {
    const response = responseWithCookies(
      initialBody,
      initial.status,
      initial.headers.get("content-type"),
      initialCookies,
      createdDeviceId,
    );
    response.cookies.set("access_token", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const retried = await forward(
    body,
    mergeCookies(cookieHeader, [...initialCookies, ...refreshCookies]),
    deviceId,
  );
  const retriedBody = await retried.text();
  return responseWithCookies(
    retriedBody,
    retried.status,
    retried.headers.get("content-type"),
    [...refreshCookies, ...setCookies(retried.headers)],
    createdDeviceId,
  );
};
