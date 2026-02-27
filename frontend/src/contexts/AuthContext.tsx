import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  authApi,
  profileApi,
  getAccessToken,
  setAccessToken,
  type AuthSession,
} from "@/services/api";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  google_id: string | null;
  email_verified: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface PendingGoogleAuth {
  pendingToken: string;
  email: string;
  expiresInSeconds: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    confirmPassword: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  startGoogleAuth: (googleAccessToken: string) => Promise<{
    data: PendingGoogleAuth | null;
    error: Error | null;
  }>;
  verifyGoogleEmailCode: (
    pendingToken: string,
    code: string
  ) => Promise<{ error: Error | null }>;
  verifyGoogleMagicLink: (magicToken: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuthSession = useCallback((session: AuthSession) => {
    setUser(session.user);
    setProfile(session.profile);
  }, []);

  const syncAuthenticatedUser = useCallback(async () => {
    const me = await authApi.getMe();
    setUser(me);

    void profileApi
      .getProfile()
      .then((profileData) => {
        setProfile(profileData);
      })
      .catch(() => {
        setProfile(null);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        await syncAuthenticatedUser();
      } catch {
        setAccessToken(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void checkAuth();
    return () => {
      isMounted = false;
    };
  }, [syncAuthenticatedUser]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    confirmPassword: string,
    fullName: string
  ) => {
    try {
      const session = await authApi.signup(email, password, confirmPassword, fullName);
      applyAuthSession(session);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [applyAuthSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const session = await authApi.login(email, password);
      applyAuthSession(session);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [applyAuthSession]);

  const startGoogleAuth = useCallback(async (googleAccessToken: string) => {
    try {
      const response = await authApi.googleAuth(googleAccessToken);
      return {
        data: {
          pendingToken: response.pending_token,
          email: response.email,
          expiresInSeconds: response.code_expires_in_seconds,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }, []);

  const verifyGoogleEmailCode = useCallback(async (pendingToken: string, code: string) => {
    try {
      await authApi.verifyEmailCode(pendingToken, code);
      await syncAuthenticatedUser();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [syncAuthenticatedUser]);

  const verifyGoogleMagicLink = useCallback(async (magicToken: string) => {
    try {
      await authApi.verifyEmailMagicLink(magicToken);
      await syncAuthenticatedUser();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [syncAuthenticatedUser]);

  const signOut = useCallback(async () => {
    authApi.logout();
    setUser(null);
    setProfile(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      loading,
      signUp,
      signIn,
      startGoogleAuth,
      verifyGoogleEmailCode,
      verifyGoogleMagicLink,
      signOut,
    }),
    [
      user,
      profile,
      loading,
      signUp,
      signIn,
      startGoogleAuth,
      verifyGoogleEmailCode,
      verifyGoogleMagicLink,
      signOut,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
