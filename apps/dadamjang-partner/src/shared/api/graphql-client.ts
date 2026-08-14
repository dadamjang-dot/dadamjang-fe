import { ClientError, GraphQLClient, Variables } from "graphql-request";

let browserClient: GraphQLClient | undefined;

const client = () => {
  if (typeof window === "undefined")
    throw new PartnerApiError(
      "GraphQL client is only available in the browser",
    );
  browserClient ??= new GraphQLClient(
    new URL("/api/graphql", window.location.origin).toString(),
    {
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
    },
  );
  return browserClient;
};

export class PartnerApiError extends Error {
  code: string;
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    code = "UNKNOWN",
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "PartnerApiError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const toPartnerApiError = (error: unknown) => {
  if (!(error instanceof ClientError))
    return new PartnerApiError(
      error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
    );
  const graphQlError = error.response.errors?.[0];
  const extensions = graphQlError?.extensions as
    { code?: string; fieldErrors?: Record<string, string> } | undefined;
  return new PartnerApiError(
    graphQlError?.message ?? "요청을 처리하지 못했습니다.",
    extensions?.code,
    extensions?.fieldErrors,
  );
};

export const requestGraphQl = async <
  TData,
  TVariables extends Variables = Variables,
>(
  document: string,
  variables?: TVariables,
) => {
  try {
    return await client().request<TData, Variables>(
      document,
      (variables ?? {}) as Variables,
    );
  } catch (error) {
    const apiError = toPartnerApiError(error);
    if (apiError.code === "UNAUTHENTICATED" && typeof window !== "undefined")
      window.dispatchEvent(new Event("dadamjang:session-expired"));
    throw apiError;
  }
};
