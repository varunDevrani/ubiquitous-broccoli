const BASE = "/api/v1";

async function request(endpoint, options = {}) {
  const { body, method = body ? "POST" : "GET", headers = {}, auth } = options;

  const config = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };

  if (auth) {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${endpoint}`, config);

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || "Something went wrong.");
    err.status = res.status;
    err.errorCode = data.error_code;
    err.recoverable = data.recoverable;
    throw err;
  }

  return data;
}

// Auth
export const signup = (email, password, confirm_password) =>
  request("/auth/signup", { body: { email, password, confirm_password } });

export const login = (email, password) =>
  request("/auth/login", { body: { email, password } });

export const refresh = (refresh_token) =>
  request("/auth/refresh", { body: { refresh_token } });

export const logout = (refresh_token) =>
  request("/auth/logout", { body: { refresh_token } });

export const reactivate = (email, password) =>
  request("/auth/reactivate", { body: { email, password } });

export const deactivateAccount = (password) =>
  request("/auth/deactivate", { body: { password }, auth: true });

export const changePassword = (old_password, new_password, confirm_new_password) =>
  request("/auth/change-password", {
    body: { old_password, new_password, confirm_new_password },
    auth: true,
  });

export const verifyMail = (token) =>
  request("/auth/verify-mail", { body: { token } });

export const resendVerification = (email) =>
  request("/auth/resend-verification", { body: { email } });

export const forgotPassword = (email) =>
  request("/auth/forgot-password", { body: { email } });

export const resetPassword = (token, password, confirm_password) =>
  request("/auth/reset-password", { body: { token, password, confirm_password } });

// Sessions
export const getSessions = () => {
  const refresh_token = localStorage.getItem("refresh_token");
  return request("/sessions", { body: { refresh_token }, auth: true });
};

export const revokeSession = (familyId) =>
  request(`/sessions/${familyId}`, { method: "DELETE", auth: true });

export const revokeAllSessions = () =>
  request("/sessions", { method: "DELETE", auth: true });
