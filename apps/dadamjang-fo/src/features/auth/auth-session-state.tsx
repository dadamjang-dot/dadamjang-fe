import { createContext, useContext, type ReactNode } from "react";

export type AuthSessionState = {
  error: unknown | null;
  hasSession: boolean;
  retry: () => Promise<void>;
};

const AuthSessionStateContext = createContext<AuthSessionState | undefined>(
  undefined,
);

type AuthSessionStateProviderProps = {
  children: ReactNode;
  value: AuthSessionState;
};

export const AuthSessionStateProvider = ({
  children,
  value,
}: AuthSessionStateProviderProps) => (
  <AuthSessionStateContext.Provider value={value}>
    {children}
  </AuthSessionStateContext.Provider>
);

export const useAuthSessionState = () => {
  const state = useContext(AuthSessionStateContext);
  if (!state) throw new Error("AuthSessionStateProvider is required");
  return state;
};
