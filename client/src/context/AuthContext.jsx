import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getStoredToken, setStoredToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setStoredToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(identifier, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register({ username, email, password, avatar }) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, avatar }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function loginWithGoogle(credential) {
    const data = await apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setStoredToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
