import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { type FC, type PropsWithChildren, useEffect } from "react";
import { honoClient } from "../lib/api/client";
import { authCheckQuery } from "../lib/api/queries";
import { authAtom } from "../lib/auth/store/authAtom";

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const setAuthState = useSetAtom(authAtom);

  const { data: authState } = useSuspenseQuery({
    queryKey: authCheckQuery.queryKey,
    queryFn: authCheckQuery.queryFn,
  });

  useEffect(() => {
    setAuthState({
      authEnabled: authState.authEnabled,
      authenticated: authState.authenticated,
      checked: true,
    });
  }, [authState, setAuthState]);

  return <>{children}</>;
};

export const useAuth = () => {
  const authState = useAtomValue(authAtom);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      await honoClient.api.auth.login.$post({
        json: { password },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: authCheckQuery.queryKey,
      });

      navigate({ to: "/projects" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await honoClient.api.auth.logout.$post();

      await queryClient.invalidateQueries({
        queryKey: authCheckQuery.queryKey,
      });
    },
    onSuccess: () => {
      navigate({ to: "/login" });
    },
  });

  return {
    authEnabled: authState.authEnabled,
    isAuthenticated: authState.authenticated,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
};
