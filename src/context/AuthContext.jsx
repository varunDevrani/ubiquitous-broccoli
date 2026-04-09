import { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ uid: payload.sub, role: payload.role });
        } else {
          tryRefresh();
          return;
        }
      } catch {
        localStorage.removeItem("access_token");
      }
    }
    setLoading(false);
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

  function saveTokens(access, refresh) {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  }

  function clearTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
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
