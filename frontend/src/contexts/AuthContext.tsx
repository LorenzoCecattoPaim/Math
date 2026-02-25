import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, profileApi, getAccessToken, setAccessToken } from "@/services/api";

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
  ) => Promise<{ data: PendingGoogleAuth | null; error: Error | null }>;
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

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);

          try {
            const profileData = await profileApi.getProfile();
            setProfile(profileData);
          } catch {
            setProfile(null);
          }
        } catch {
          setAccessToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const syncAuthenticatedUser = async () => {
    const userData = await authApi.getMe();
    setUser(userData);

    try {
      const profileData = await profileApi.getProfile();
      setProfile(profileData);
    } catch {
      setProfile(null);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    confirmPassword: string,
    fullName: string
  ) => {
    try {
      const response = await authApi.signup(email, password, confirmPassword, fullName);
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
  };

  const signIn = async (email: string, password: string) => {
    try {
      await authApi.login(email, password);
      await syncAuthenticatedUser();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const startGoogleAuth = async (googleAccessToken: string) => {
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
  };

  const verifyGoogleEmailCode = async (pendingToken: string, code: string) => {
    try {
      await authApi.verifyEmailCode(pendingToken, code);
      void syncAuthenticatedUser();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyGoogleMagicLink = async (magicToken: string) => {
    try {
      await authApi.verifyEmailMagicLink(magicToken);
      void syncAuthenticatedUser();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    authApi.logout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        startGoogleAuth,
        verifyGoogleEmailCode,
        verifyGoogleMagicLink,
        signOut,
      }}
    >
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
