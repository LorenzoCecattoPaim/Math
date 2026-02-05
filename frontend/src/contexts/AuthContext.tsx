import React, { createContext, useContext, useEffect, useState } from "react";
import {
  authApi,
  profileApi,
  getAccessToken,
  setAccessToken,
} from "@/services/api";

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
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
            // Profile may not exist yet
          }
        } catch {
          setAccessToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await authApi.signup(email, password, fullName);
      const userData = await authApi.getMe();
      setUser(userData);

      try {
        const profileData = await profileApi.getProfile();
        setProfile(profileData);
      } catch {
        // Profile may not exist yet
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await authApi.login(email, password);
      const userData = await authApi.getMe();
      setUser(userData);

      try {
        const profileData = await profileApi.getProfile();
        setProfile(profileData);
      } catch {
        // Profile may not exist yet
      }

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
      value={{ user, profile, loading, signUp, signIn, signOut }}
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
