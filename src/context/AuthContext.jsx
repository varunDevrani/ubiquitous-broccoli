import { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function saveTokens(access, refresh) {
    api.setAccessToken(access);
    localStorage.setItem("refresh_token", refresh);
  }

  function clearTokens() {
    api.setAccessToken(null);
    localStorage.removeItem("refresh_token");
    setUser(null);
  }

  useEffect(() => {
    // Register so that any auth: true request returning 401 auto-clears state.
    api.setOnAuthError(clearTokens);

    // Access token lives only in memory — on every page load we must re-hydrate
    // via the refresh token.
    const rt = localStorage.getItem("refresh_token");
    if (rt) {
      tryRefresh();
    } else {
      setLoading(false);
    }
  }, []);

  async function tryRefresh() {
    const rt = localStorage.getItem("refresh_token");
    if (!rt) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.refresh(rt);
      saveTokens(data.data.access_token, data.data.refresh_token);
      const payload = JSON.parse(atob(data.data.access_token.split(".")[1]));
      setUser({ uid: payload.sub, role: payload.role });
    } catch {
      clearTokens();
    }
    setLoading(false);
  }

  const handleLogin = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    saveTokens(data.data.access_token, data.data.refresh_token);
    const payload = JSON.parse(atob(data.data.access_token.split(".")[1]));
    setUser({ uid: payload.sub, role: payload.role });
    return data;
  }, []);

  const handleLogout = useCallback(async () => {
    const rt = localStorage.getItem("refresh_token");
    if (rt) {
      try {
        await api.logout(rt);
      } catch {
        // proceed with local logout
      }
    }
    clearTokens();
  }, []);

  const handleLogoutAll = useCallback(async () => {
    try {
      await api.revokeAllSessions();
    } catch {
      // proceed
    }
    clearTokens();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, handleLogin, handleLogout, handleLogoutAll, clearTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
