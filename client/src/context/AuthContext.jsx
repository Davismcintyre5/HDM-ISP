import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest } from '../api/auth';
import { getProfile } from '../api/profile';
import { notifyTokenChange } from '../api/axios';
import { KEYS, storage } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [token, setToken] = useState(() => storage.get(KEYS.ACCESS));
  const [booting, setBooting] = useState(!!storage.get(KEYS.ACCESS));

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }
    getProfile()
      .then(({ data }) => {
        setUser(data.data.user);
        setProvider(data.data.provider);
      })
      .catch(() => {
        storage.clearProviderSession();
        setToken(null);
        setUser(null);
        setProvider(null);
        notifyTokenChange();
      })
      .finally(() => setBooting(false));
  }, []);

  async function login(email, password) {
    const { data } = await loginRequest(email, password);
    const payload = data.data;

    storage.set(KEYS.ACCESS, payload.accessToken);
    if (payload.refreshToken) storage.set(KEYS.REFRESH, payload.refreshToken);
    notifyTokenChange();
    setToken(payload.accessToken);

    if (payload.provider) setProvider(payload.provider);

    try {
      const profileRes = await getProfile();
      setUser(profileRes.data.data.user);
      setProvider(profileRes.data.data.provider);
    } catch {
      if (payload.provider) setUser(payload.provider);
    }

    return payload.provider || null;
  }

  function logout() {
    storage.clearProviderSession();
    notifyTokenChange();
    setToken(null);
    setUser(null);
    setProvider(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        provider,
        setUser,
        setProvider,
        token,
        isAuthenticated: !!token,
        booting,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}