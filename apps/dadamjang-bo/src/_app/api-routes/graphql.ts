import { NextResponse } from "next/server";
import { isPublicOperation } from "./graphql-operation";

type GraphQlPayload = Record<string, unknown>;
type TransientRefreshResult = {
  kind: "transient";
  body: string;
  status: number;
  contentType: string | null;
};
type RefreshResult =
  | { kind: "success"; cookies: string[] }
  | { kind: "authoritative" }
  | TransientRefreshResult;
type RefreshGroup = {
  active: number;
  refresh?: Promise<RefreshResult>;
};
type UpstreamFailure = {
  kind: "failure";
  body: string;
  status: number;
  contentType: "application/json";
  reason: "malformed" | "network" | "oversized" | "timeout";
};
type UpstreamSuccess = {
  kind: "success";
  response: Response;
  body: string;
  payload: GraphQlPayload | null;
};
type UpstreamResult = UpstreamFailure | UpstreamSuccess;

const MAX_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;
// ponytail: Process-local singleflight cannot coordinate refreshes across app replicas.
const refreshGroups = new Map<string, RefreshGroup>();

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

const failure = (
  status: number,
  message: string,
  reason: UpstreamFailure["reason"],
): UpstreamFailure => ({
  kind: "failure",
  body: JSON.stringify({ error: message }),
  status,
  contentType: "application/json",
  reason,
});

const readResponseBody = async (response: Response) => {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(chunk.value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
};

const forward = async (
  body: string,
  cookie: string,
  deviceId: string,
  requestSignal: AbortSignal,
): Promise<UpstreamResult> => {
  const signal = AbortSignal.any([
    requestSignal,
    AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  ]);
  try {
    const response = await fetch(upstreamUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-device-id": deviceId,
      },
      body,
      cache: "no-store",
      signal,
    });
    const responseBody = await readResponseBody(response);
    if (responseBody === null)
      return failure(502, "Upstream response too large", "oversized");
    const payload = readPayload(responseBody);
    if (response.ok && !payload)
      return failure(502, "Upstream returned malformed JSON", "malformed");
    return { kind: "success", response, body: responseBody, payload };
  } catch {
    return signal.aborted
      ? failure(504, "Upstream request timed out", "timeout")
      : failure(502, "Upstream request failed", "network");
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

const acquireRefreshGroup = (cookieHeader: string, deviceId: string) => {
  const refreshToken =
    cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]*)/)?.[1] ?? "";
  const key = `${deviceId}\u0000${refreshToken}`;
  const group = refreshGroups.get(key) ?? { active: 0 };
  group.active += 1;
  refreshGroups.set(key, group);
  return { key, group };
};

const releaseRefreshGroup = (key: string, group: RefreshGroup) => {
  group.active -= 1;
  if (group.active === 0) refreshGroups.delete(key);
};

const transientRefresh = (): TransientRefreshResult => ({
  kind: "transient",
  body: JSON.stringify({
    errors: [
      {
        message: "Session refresh temporarily unavailable",
        extensions: { code: "SERVICE_UNAVAILABLE" },
      },
    ],
  }),
  status: 503,
  contentType: "application/json",
});

const performRefresh = async (
  cookieHeader: string,
  initialCookies: string[],
  deviceId: string,
  requestSignal: AbortSignal,
): Promise<RefreshResult> => {
  try {
    const refresh = await forward(
      JSON.stringify({ query: "mutation Refresh { refresh { role } }" }),
      mergeCookies(cookieHeader, initialCookies),
      deviceId,
      requestSignal,
    );
    if (
      refresh.kind === "failure" && refresh.reason === "network"
    )
      return transientRefresh();
    if (refresh.kind === "failure")
      return {
        kind: "transient",
        body: refresh.body,
        status: refresh.status,
        contentType: refresh.contentType,
      };
    const { body, payload, response } = refresh;
    if (
      response.status === 401 ||
      response.status === 403 ||
      isUnauthenticated(payload)
    )
      return { kind: "authoritative" };
    if (!response.ok || !hasRefreshData(payload))
      return {
        kind: "transient",
        body: response.ok ? transientRefresh().body : body,
        status: response.ok ? 502 : response.status,
        contentType: response.headers.get("content-type"),
      };
    return { kind: "success", cookies: setCookies(response.headers) };
  } catch {
    return transientRefresh();
  }
};

const refreshSession = (
  group: RefreshGroup,
  cookieHeader: string,
  initialCookies: string[],
  deviceId: string,
  requestSignal: AbortSignal,
) => {
  group.refresh ??= performRefresh(
    cookieHeader,
    initialCookies,
    deviceId,
    requestSignal,
  );
  return group.refresh;
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
    response.cookies.set("bo_device_id", deviceId, {
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
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)bo_device_id=([^;]+)/);
  const matchedDeviceId = decodeDeviceId(cookieMatch?.[1]);
  const deviceId = matchedDeviceId ?? crypto.randomUUID();
  const createdDeviceId = matchedDeviceId ? undefined : deviceId;
  const { key, group } = acquireRefreshGroup(cookieHeader, deviceId);
  try {
    const initial = await forward(
      body,
      cookieHeader,
      deviceId,
      request.signal,
    );
    if (initial.kind === "failure")
      return responseWithCookies(
        initial.body,
        initial.status,
        initial.contentType,
        [],
        createdDeviceId,
      );
    const initialBody = initial.body;
    const initialCookies = setCookies(initial.response.headers);
    if (
      !isUnauthenticated(initial.payload) ||
      isPublicOperation(input)
    )
      return responseWithCookies(
        initialBody,
        initial.response.status,
        initial.response.headers.get("content-type"),
        initialCookies,
        createdDeviceId,
      );

    const refresh = await refreshSession(
      group,
      cookieHeader,
      initialCookies,
      deviceId,
      request.signal,
    );
    if (refresh.kind === "transient")
      return responseWithCookies(
        refresh.body,
        refresh.status,
        refresh.contentType,
        [],
        createdDeviceId,
      );
    if (refresh.kind === "authoritative") {
      const response = responseWithCookies(
        initialBody,
        initial.response.status,
        initial.response.headers.get("content-type"),
        [],
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
      mergeCookies(cookieHeader, [...initialCookies, ...refresh.cookies]),
      deviceId,
      request.signal,
    );
    if (retried.kind === "failure")
      return responseWithCookies(
        retried.body,
        retried.status,
        retried.contentType,
        refresh.cookies,
        createdDeviceId,
      );
    return responseWithCookies(
      retried.body,
      retried.response.status,
      retried.response.headers.get("content-type"),
      [...refresh.cookies, ...setCookies(retried.response.headers)],
      createdDeviceId,
    );
  } finally {
    releaseRefreshGroup(key, group);
  }
};
