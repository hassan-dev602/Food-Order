import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AdminAuthContext = createContext(null);

const API_BASE_URL = "http://127.0.0.1:8000";

const STORAGE_KEYS = {
  ADMIN_USER: "admin_user",
  ADMIN_ACCESS_TOKEN: "admin_access_token",
  ADMIN_REFRESH_TOKEN: "admin_refresh_token",
};

const API_ENDPOINTS = {
  ADMIN_LOGIN: `${API_BASE_URL}/api/v1/admin/login/`,
  ADMIN_LOGOUT: `${API_BASE_URL}/api/v1/admin/logout/`,
  ADMIN_ME: `${API_BASE_URL}/api/v1/admin/me/`,
};

const normalizeToken = (rawToken) => {
  if (!rawToken) return "";

  let token = String(rawToken).trim();

  try {
    const parsedToken = JSON.parse(token);

    if (typeof parsedToken === "string") {
      token = parsedToken.trim();
    }
  } catch (error) {
    // The token is already a plain string, so JSON parsing is not needed.
  }

  // Store only the raw JWT. Add "Bearer" only when sending API requests.
  return token.replace(/^Bearer\s+/i, "").trim();
};

const getStoredAdminUser = () => {
  try {
    const storedUser = localStorage.getItem(STORAGE_KEYS.ADMIN_USER);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    return null;
  }
};

const getStoredAdminAccessToken = () => {
  return normalizeToken(localStorage.getItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN));
};

const getStoredAdminRefreshToken = () => {
  return normalizeToken(localStorage.getItem(STORAGE_KEYS.ADMIN_REFRESH_TOKEN));
};

const parseApiResponse = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const fetchAdminMe = async (token) => {
  const response = await fetch(API_ENDPOINTS.ADMIN_ME, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(data?.detail || "Failed to fetch admin profile");
  }

  return data;
};

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(getStoredAdminUser);
  const [adminAccessToken, setAdminAccessToken] = useState(
    getStoredAdminAccessToken
  );
  const [adminRefreshToken, setAdminRefreshToken] = useState(
    getStoredAdminRefreshToken
  );
  const [loading, setLoading] = useState(true);

  const clearAdminAuth = useCallback(() => {
    setAdminUser(null);
    setAdminAccessToken("");
    setAdminRefreshToken("");

    localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  }, []);

  const saveAdminAuth = useCallback(({ user, accessToken, refreshToken }) => {
    const normalizedAccessToken = normalizeToken(accessToken);
    const normalizedRefreshToken = normalizeToken(refreshToken);

    setAdminUser(user);
    setAdminAccessToken(normalizedAccessToken);
    setAdminRefreshToken(normalizedRefreshToken);

    localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(user));
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_ACCESS_TOKEN,
      normalizedAccessToken
    );
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_REFRESH_TOKEN,
      normalizedRefreshToken
    );
  }, []);

  const adminLogin = useCallback(
    async ({ username, password }) => {
      const response = await fetch(API_ENDPOINTS.ADMIN_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
        }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || "Admin login failed"
        );
      }

      const accessToken = normalizeToken(data?.access_token);
      const refreshToken = normalizeToken(data?.refresh_token);

      let adminProfile;

      try {
        // Prefer the backend profile endpoint because it confirms the token
        // is valid and returns the latest admin permission data.
        adminProfile = await fetchAdminMe(accessToken);
      } catch (error) {
        adminProfile = {
          username: data?.username,
          full_name: data?.full_name,
          is_staff: true,
          is_superuser: false,
        };
      }

      saveAdminAuth({
        user: adminProfile,
        accessToken,
        refreshToken,
      });

      return adminProfile;
    },
    [saveAdminAuth]
  );

  const adminLogout = useCallback(async () => {
    const token = getStoredAdminAccessToken();
    const refreshToken = getStoredAdminRefreshToken();

    try {
      if (token && refreshToken) {
        await fetch(API_ENDPOINTS.ADMIN_LOGOUT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });
      }
    } finally {
      // Always clear local auth state, even if the backend logout request fails.
      clearAdminAuth();
    }
  }, [clearAdminAuth]);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const token = getStoredAdminAccessToken();
      const refreshToken = getStoredAdminRefreshToken();

      if (!token) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const adminProfile = await fetchAdminMe(token);

        if (!isMounted) return;

        saveAdminAuth({
          user: adminProfile,
          accessToken: token,
          refreshToken,
        });
      } catch (error) {
        if (isMounted) {
          clearAdminAuth();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [clearAdminAuth, saveAdminAuth]);

  const contextValue = useMemo(
    () => ({
      adminUser,
      adminAccessToken,
      adminRefreshToken,
      adminLogin,
      adminLogout,
      loading,
      isAdminAuthenticated: Boolean(adminUser && adminAccessToken),
    }),
    [
      adminUser,
      adminAccessToken,
      adminRefreshToken,
      adminLogin,
      adminLogout,
      loading,
    ]
  );

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }

  return context;
};