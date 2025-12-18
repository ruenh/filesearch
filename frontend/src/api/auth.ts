/**
 * Authentication API functions
 */

const API_URL = "http://localhost:5000/api";

interface LoginData {
  email: string;
  password: string;
  totp_code?: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: "admin" | "editor" | "viewer";
    two_factor_enabled: boolean;
  };
  access_token: string;
  refresh_token: string;
}

interface RefreshResponse {
  access_token: string;
}

// Store tokens in localStorage
export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// API functions
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw { ...result, status: response.status };
  }

  setTokens(result.access_token, result.refresh_token);
  return result;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw { ...result, status: response.status };
  }

  setTokens(result.access_token, result.refresh_token);
  return result;
}

export async function logout(): Promise<void> {
  const token = getAccessToken();
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore errors on logout
    }
  }
  clearTokens();
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const result: RefreshResponse = await response.json();
    localStorage.setItem("access_token", result.access_token);
    return result.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

export async function getCurrentUser() {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryResponse = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        if (retryResponse.ok) {
          return (await retryResponse.json()).user;
        }
      }
    }
    return null;
  }

  return (await response.json()).user;
}
