/* eslint-disable react-refresh/only-export-contexts */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return { ...response.data, token: newToken, user: userData };
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setNotificationsLoading(true);
      const res = await api.get('/audit/notifications');
      setNotifications(res.data.data || []);
      const unreadRes = await api.get('/audit/notifications/unread-count');
      setUnreadCount(unreadRes.data.count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  const markNotificationsRead = useCallback(async () => {
    try {
      await api.put('/audit/notifications/read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setToken(null);
        setUser(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:logout', handleStorageChange);

    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:logout', handleStorageChange);
    };
  }, [token, fetchCurrentUser]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        fetchCurrentUser,
        notifications,
        unreadCount,
        unreadNotifications,
        loadNotifications,
        markNotificationsRead,
        notificationsLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
