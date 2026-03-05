const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "") || "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 90000);
const HOTMART_CHECKOUT_URL =
  import.meta.env.VITE_HOTMART_CHECKOUT_URL || "https://provalab-launchpad.vercel.app";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  google_id: string | null;
  email_verified: boolean;
  created_at: string;
}

export interface AuthProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface UserPlanProfile {
  id: string;
  email: string;
  plan: string;
  is_premium: boolean;
  subscription_status: string;
  payment_status: string;
  free_uses: number;
  uses_count: number;
  hotmart_purchase_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  user: AuthUser;
  profile: AuthProfile | null;
}

export interface EmailVerificationChallenge {
  pending_token: string;
  pending_token_type: string;
  verification_required: boolean;
  email: string;
  code_expires_in_seconds: number;
  message: string;
}

export function isEmailVerificationChallenge(
  response: AuthSession | EmailVerificationChallenge
): response is EmailVerificationChallenge {
  return "verification_required" in response && response.verification_required === true;
}

async function parseError(response: Response, fallbackMessage: string): Promise<never> {
  const error = await response.json().catch(() => null);
  const detail = error?.detail ?? error?.message ?? error;

  if (response.status === 403 && typeof error?.detail === "string" && error.detail.includes("premium")) {
    const checkoutUrl = error?.checkout_url || HOTMART_CHECKOUT_URL;
    window.location.href = checkoutUrl;
    throw new Error(error.detail);
  }

  if (typeof detail === "string") {
    throw new Error(detail);
  }

  throw new Error(fallbackMessage);
}

function buildEndpoint(path: string, params?: Record<string, string | number | undefined>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
  }
  const queryString = query.toString();
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Tempo esgotado na comunicação com o servidor.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const requestOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  let response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, requestOptions, timeoutMs);

  if (response.status === 401) {
    const refreshed = await authApi.refreshSession();
    if (!refreshed) {
      setAccessToken(null);
      throw new Error("UNAUTHORIZED");
    }

    const retryHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (accessToken) {
      retryHeaders.Authorization = `Bearer ${accessToken}`;
    }
    if (options.body && !retryHeaders["Content-Type"]) {
      retryHeaders["Content-Type"] = "application/json";
    }

    response = await fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        credentials: "include",
        headers: retryHeaders,
      },
      timeoutMs
    );

    if (response.status === 401) {
      setAccessToken(null);
      throw new Error("UNAUTHORIZED");
    }
  }

  return response;
}

let refreshInFlight: Promise<boolean> | null = null;

export const authApi = {
  async refreshSession() {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/refresh`,
        {
          method: "POST",
          credentials: "include",
        },
        Math.max(DEFAULT_TIMEOUT_MS, 180000)
      );

      if (!response.ok) {
        setAccessToken(null);
        return false;
      }

      const data = (await response.json()) as { access_token: string };
      if (!data.access_token) {
        setAccessToken(null);
        return false;
      }

      setAccessToken(data.access_token);
      return true;
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  },

  async bootstrapSession() {
    if (accessToken) {
      return true;
    }
    return authApi.refreshSession();
  },

  async signup(email: string, password: string, confirmPassword: string, fullName: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        confirm_password: confirmPassword,
        full_name: fullName,
      }),
    });

    if (!response.ok) {
      return parseError(response, "Erro ao criar conta");
    }

    const data = (await response.json()) as AuthSession | EmailVerificationChallenge;
    if (!isEmailVerificationChallenge(data)) {
      setAccessToken(data.access_token);
    }
    return data;
  },

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!response.ok) {
      return parseError(response, "E-mail ou senha incorretos");
    }

    const data = (await response.json()) as AuthSession | EmailVerificationChallenge;
    if (!isEmailVerificationChallenge(data)) {
      setAccessToken(data.access_token);
    }
    return data;
  },

  async googleAuth(googleAccessToken: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: googleAccessToken }),
    }, Math.max(DEFAULT_TIMEOUT_MS, 180000));

    if (!response.ok) {
      return parseError(response, "Não foi possível autenticar com o Google");
    }

    return response.json() as Promise<{
      pending_token: string;
      pending_token_type: string;
      verification_required: boolean;
      email: string;
      code_expires_in_seconds: number;
    }>;
  },

  async verifyEmailCode(pendingToken: string, code: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/verify-email-code`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_token: pendingToken, code }),
    }, Math.max(DEFAULT_TIMEOUT_MS, 180000));

    if (!response.ok) {
      return parseError(response, "Código inválido ou expirado");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async verifyEmailMagicLink(magicToken: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/verify-email-link`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magic_token: magicToken }),
    }, Math.max(DEFAULT_TIMEOUT_MS, 180000));

    if (!response.ok) {
      return parseError(response, "Link de verificação inválido ou expirado");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async resendVerificationCode(pendingToken: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/resend-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_token: pendingToken }),
    });

    if (!response.ok) {
      return parseError(response, "Não foi possível reenviar o código");
    }

    return response.json() as Promise<{
      message: string;
      pending_token?: string;
      email?: string;
      code_expires_in_seconds?: number;
    }>;
  },

  async forgotPassword(email: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return parseError(response, "Não foi possível processar a solicitação");
    }

    return response.json() as Promise<{ message: string }>;
  },

  async resetPassword(token: string, newPassword: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    if (!response.ok) {
      return parseError(response, "Não foi possível redefinir sua senha");
    }

    return response.json() as Promise<{ message: string }>;
  },

  async getMe() {
    const response = await fetchWithAuth("/auth/me", {}, Math.max(DEFAULT_TIMEOUT_MS, 180000));

    if (!response.ok) {
      return parseError(response, "Não autenticado");
    }

    return response.json();
  },

  logout() {
    void fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setAccessToken(null);
  },
};

export const profileApi = {
  async getProfile() {
    const response = await fetchWithAuth("/profiles/me", {}, Math.max(DEFAULT_TIMEOUT_MS, 180000));
    if (!response.ok) {
      return parseError(response, "Erro ao carregar perfil");
    }
    return response.json();
  },

  async updateProfile(data: { full_name?: string; avatar_url?: string }) {
    const response = await fetchWithAuth("/profiles/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      return parseError(response, "Erro ao atualizar perfil");
    }
    return response.json();
  },

  async getPlan() {
    const response = await fetchWithAuth("/profiles/plan");
    if (!response.ok) {
      return parseError(response, "Erro ao carregar plano");
    }
    return response.json() as Promise<UserPlanProfile>;
  },
};

export const exercisesApi = {
  async getRandomExercise(subject: string, difficulty: string) {
    const response = await fetchWithAuth(
      buildEndpoint("/exercises/random", { subject, difficulty })
    );
    if (!response.ok) {
      return parseError(response, "Erro ao carregar exercício");
    }
    return response.json();
  },

  async listExercises(subject?: string, difficulty?: string, limit = 50) {
    const response = await fetchWithAuth(
      buildEndpoint("/exercises", { subject, difficulty, limit })
    );
    if (!response.ok) {
      return parseError(response, "Erro ao listar exercícios");
    }
    return response.json();
  },
};

export const attemptsApi = {
  async submitAttempt(data: {
    exercise_id: string;
    user_answer: string;
    is_correct: boolean;
    time_spent_seconds?: number;
  }) {
    const response = await fetchWithAuth("/attempts", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      return parseError(response, "Erro ao salvar tentativa");
    }
    return response.json();
  },

  async getHistory(limit = 50) {
    const response = await fetchWithAuth(`/attempts?limit=${limit}`);
    if (!response.ok) {
      return parseError(response, "Erro ao carregar histórico");
    }
    return response.json();
  },

  async getStats() {
    const response = await fetchWithAuth("/attempts/stats");
    if (!response.ok) {
      return parseError(response, "Erro ao carregar estatísticas");
    }
    return response.json();
  },

  async getProgressData() {
    const response = await fetchWithAuth("/attempts/progress");
    if (!response.ok) {
      return parseError(response, "Erro ao carregar progresso");
    }
    return response.json();
  },
};

export const vestibularApi = {
  async getVestibularExercises(limit = 10, offset = 0, difficulty = "medium") {
    const response = await fetchWithAuth(
      buildEndpoint("/vestibular/exercises", { limit, offset, difficulty })
    );
    if (!response.ok) {
      return parseError(response, "Erro ao carregar exercícios vestibulares");
    }
    const payload = (await response.json()) as {
      success: boolean;
      message: string;
      data: {
        items: Array<{
          id: string;
          question: string;
          options: string[];
          difficulty: string;
          created_at: string;
        }>;
        limit: number;
        offset: number;
        has_more: boolean;
      };
    };
    if (!payload.success) {
      throw new Error(payload.message || "Erro ao carregar exercicios vestibulares");
    }
    return payload.data as {
      items: Array<{
        id: string;
        question: string;
        options: string[];
        difficulty: string;
        created_at: string;
      }>;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  },

  async submitVestibularAnswer(exercise_id: string, answer: string) {
    const response = await fetchWithAuth("/vestibular/answer", {
      method: "POST",
      body: JSON.stringify({ exercise_id, answer }),
    });
    if (!response.ok) {
      return parseError(response, "Erro ao enviar resposta vestibular");
    }
    const payload = (await response.json()) as {
      success: boolean;
      message: string;
      data: {
        correct: boolean;
        correct_answer: string | null;
        explanation: string;
        accuracy: number;
      };
    };
    if (!payload.success) {
      throw new Error(payload.message || "Erro ao enviar resposta vestibular");
    }
    return payload.data as {
      correct: boolean;
      correct_answer: string | null;
      explanation: string;
      accuracy: number;
    };
  },

  async getVestibularStats() {
    const response = await fetchWithAuth("/vestibular/stats");
    if (!response.ok) {
      return parseError(response, "Erro ao carregar estatísticas vestibulares");
    }
    const payload = (await response.json()) as {
      success: boolean;
      message: string;
      data: {
        exercicios_feitos: number;
        respostas_corretas: number;
        taxa_acerto: number;
      };
    };
    if (!payload.success) {
      throw new Error(payload.message || "Erro ao carregar estatisticas vestibulares");
    }
    return payload.data as {
      exercicios_feitos: number;
      respostas_corretas: number;
      taxa_acerto: number;
    };
  },
};
