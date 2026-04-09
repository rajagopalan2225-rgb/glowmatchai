import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = async (token) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (err) {
      console.error("Failed to load user profile", err);
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const signup = async ({ email, password, fullName }) => {
    setError(null);
    try {
      await axios.post('/api/auth/register', {
        email,
        password,
        full_name: fullName
      });
      
      // Auto login after signup
      return await login({ email, password });
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message;
      setError(errMsg);
      return { data: null, error: errMsg };
    }
  };

  const login = async ({ email, password }) => {
    setError(null);
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      const token = response.data.access_token;
      localStorage.setItem('access_token', token);
      setUser(response.data.user);
      return { data: response.data, error: null };
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message;
      setError(errMsg);
      return { data: null, error: errMsg };
    }
  };

  const logout = async () => {
    setError(null);
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Ignore, remove locally
      }
    }
    
    localStorage.removeItem('access_token');
    setUser(null);
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return user.full_name || user.email?.split('@')[0] || 'Beauty';
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signup, login, logout, getUserDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
