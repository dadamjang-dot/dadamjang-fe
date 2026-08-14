import { NextResponse } from "next/server";
import { Kind, parse } from "graphql";

type GraphQlPayload = {
  query?: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  errors?: Array<{ extensions?: { code?: string } }>;
  data?: Record<string, unknown>;
};

const MAX_BODY_BYTES = 1024 * 1024;
const PUBLIC_FIELDS = new Set(["signin", "refresh"]);

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

const mergeCookies = (cookieHeader: string, cookies: string[]) => {
  const values = new Map<string, string>();
  cookieHeader
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => values.set(value.slice(0, value.indexOf("=")), value));
  cookies.forEach((value) => {
    const cookie = value.split(";", 1)[0];
    values.set(cookie.slice(0, cookie.indexOf("=")), cookie);
  });
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

const readPayload = (body: string): GraphQlPayload | null => {
  try {
    return JSON.parse(body) as GraphQlPayload;
  } catch {
    return null;
  }
};

const isUnauthenticated = (payload: GraphQlPayload | null) =>
  payload?.errors?.some(
    (error) => error.extensions?.code === "UNAUTHENTICATED",
  ) ?? false;

const isPublicOperation = (payload: GraphQlPayload) => {
  if (!payload.query) return false;
  try {
    const operations = parse(payload.query).definitions.filter(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION,
    );
    const operation = payload.operationName
      ? operations.find(
          (definition) => definition.name?.value === payload.operationName,
        )
      : operations.length === 1
        ? operations[0]
        : undefined;
    if (!operation || operation.operation !== "mutation") return false;
    const fields = operation.selectionSet.selections.filter(
      (selection) => selection.kind === Kind.FIELD,
    );
    return fields.length === 1 && PUBLIC_FIELDS.has(fields[0].name.value);
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
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
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
  if (!input?.query)
    return NextResponse.json(
      { error: "GraphQL query is required" },
      { status: 400 },
    );

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)partner_device_id=([^;]+)/);
  const createdDeviceId = cookieMatch ? undefined : crypto.randomUUID();
  const deviceId = decodeURIComponent(cookieMatch?.[1] ?? createdDeviceId!);
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
    !refreshPayload?.data?.refresh
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
