const API_BASE_URL = import.meta.env.VITE_API_URL;

let accessToken: string | null = localStorage.getItem("access_token");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem("access_token", token);
  } else {
    localStorage.removeItem("access_token");
  }
}

export function getAccessToken() {
  return accessToken;
}

async function parseError(response: Response, fallbackMessage: string): Promise<never> {
  const error = await response.json().catch(() => null);
  throw new Error(error?.detail || fallbackMessage);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 20000
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Tempo esgotado na comunicacao com o servidor.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setAccessToken(null);
    throw new Error("UNAUTHORIZED");
  }

  return response;
}

export const authApi = {
  async signup(email: string, password: string, fullName: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (!response.ok) {
      return parseError(response, "Erro ao criar conta");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!response.ok) {
      return parseError(response, "Email ou senha incorretos");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async googleAuth(googleAccessToken: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: googleAccessToken }),
    }, 180000);

    if (!response.ok) {
      return parseError(response, "Nao foi possivel autenticar com Google");
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_token: pendingToken, code }),
    });

    if (!response.ok) {
      return parseError(response, "Codigo invalido ou expirado");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async verifyEmailMagicLink(magicToken: string) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/verify-email-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magic_token: magicToken }),
    }, 60000);

    if (!response.ok) {
      return parseError(response, "Link de verificacao invalido ou expirado");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async getMe() {
    const response = await fetchWithAuth("/auth/me");

    if (!response.ok) {
      return parseError(response, "Nao autenticado");
    }

    return response.json();
  },

  logout() {
    setAccessToken(null);
  },
};

export const profileApi = {
  async getProfile() {
    const response = await fetchWithAuth("/profiles/me");
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
};

export const exercisesApi = {
  async getRandomExercise(subject: string, difficulty: string) {
    const response = await fetchWithAuth(
      `/exercises/random?subject=${subject}&difficulty=${difficulty}`
    );
    if (!response.ok) {
      return parseError(response, "Erro ao carregar exercicio");
    }
    return response.json();
  },

  async listExercises(subject?: string, difficulty?: string, limit = 50) {
    const params = new URLSearchParams();
    if (subject) params.append("subject", subject);
    if (difficulty) params.append("difficulty", difficulty);
    params.append("limit", limit.toString());

    const response = await fetchWithAuth(`/exercises?${params}`);
    if (!response.ok) {
      return parseError(response, "Erro ao listar exercicios");
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
      return parseError(response, "Erro ao carregar historico");
    }
    return response.json();
  },

  async getStats() {
    const response = await fetchWithAuth("/attempts/stats");
    if (!response.ok) {
      return parseError(response, "Erro ao carregar estatisticas");
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
