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

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setAccessToken(null);
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }

  return response;
}

// Auth API
export const authApi = {
  async signup(email: string, password: string, fullName: string) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao criar conta");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Email ou senha incorretos");
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    return data;
  },

  async getMe() {
    const response = await fetchWithAuth("/auth/me");

    if (!response.ok) {
      throw new Error("Não autenticado");
    }

    return response.json();
  },

  logout() {
    setAccessToken(null);
  },
};

// Profile API
export const profileApi = {
  async getProfile() {
    const response = await fetchWithAuth("/profiles/me");
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao carregar perfil");
    }
    return response.json();
  },

  async updateProfile(data: { full_name?: string; avatar_url?: string }) {
    const response = await fetchWithAuth("/profiles/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao atualizar perfil");
    }
    return response.json();
  },
};

// Exercises API
export const exercisesApi = {
  async getRandomExercise(subject: string, difficulty: string) {
    const response = await fetchWithAuth(
      `/exercises/random?subject=${subject}&difficulty=${difficulty}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao carregar exercício");
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
      const error = await response.json();
      throw new Error(error.detail || "Erro ao listar exercícios");
    }
    return response.json();
  },
};

// Attempts API
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
      const error = await response.json();
      throw new Error(error.detail || "Erro ao salvar tentativa");
    }
    return response.json();
  },

  async getHistory(limit = 50) {
    const response = await fetchWithAuth(`/attempts?limit=${limit}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao carregar histórico");
    }
    return response.json();
  },

  async getStats() {
    const response = await fetchWithAuth("/attempts/stats");
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao carregar estatísticas");
    }
    return response.json();
  },

  async getProgressData() {
    const response = await fetchWithAuth("/attempts/progress");
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao carregar progresso");
    }
    return response.json();
  },
};
