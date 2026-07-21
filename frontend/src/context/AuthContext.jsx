import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export const AuthContext = createContext(null);

const STORAGE_KEYS = {
  FULL_NAME: "full_name",
  ACCESS_TOKEN: "access_token",

  // Older/alternate token keys are still checked for backward compatibility.
  LEGACY_ACCESS: "access",
  LEGACY_ACCESS_TOKEN: "accessToken",
  LEGACY_TOKEN: "token",

  RESET_EMAIL: "reset_email",
  OTP_VERIFIED: "otp_verified",
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
    // The token is already a plain string, so no JSON parsing is needed.
  }

  // Store only the raw JWT token. Axios/interceptors can add "Bearer" later.
  return token.replace(/^Bearer\s+/i, "").trim();
};

const getStoredAccessToken = () => {
  return normalizeToken(
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.LEGACY_ACCESS) ||
      localStorage.getItem(STORAGE_KEYS.LEGACY_ACCESS_TOKEN) ||
      localStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN)
  );
};

const clearStoredTokens = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_ACCESS);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_TOKEN);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [resetEmail, setResetEmailState] = useState(
    () => sessionStorage.getItem(STORAGE_KEYS.RESET_EMAIL) || ""
  );

  const [otpVerified, setOtpVerifiedState] = useState(
    () => sessionStorage.getItem(STORAGE_KEYS.OTP_VERIFIED) === "true"
  );

  useEffect(() => {
    const storedFullName = localStorage.getItem(STORAGE_KEYS.FULL_NAME);
    const accessToken = getStoredAccessToken();

    if (!storedFullName || !accessToken) return;

    // Save the normalized token under one consistent key going forward.
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

    setUser({
      full_name: storedFullName,
      access_token: accessToken,
    });
  }, []);

  const login = useCallback((userData) => {
    const fullName =
      userData?.full_name ||
      userData?.name ||
      userData?.username ||
      "";

    const accessToken = normalizeToken(
      userData?.access_token ||
        userData?.access ||
        userData?.token ||
        userData?.tokens?.access
    );

    const normalizedUser = {
      full_name: fullName,
      access_token: accessToken,
    };

    setUser(normalizedUser);

    localStorage.setItem(STORAGE_KEYS.FULL_NAME, fullName);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);

    localStorage.removeItem(STORAGE_KEYS.FULL_NAME);
    clearStoredTokens();
  }, []);

  const setResetEmail = useCallback((email) => {
    const normalizedEmail = (email || "").trim().toLowerCase();

    setResetEmailState(normalizedEmail);

    if (normalizedEmail) {
      sessionStorage.setItem(STORAGE_KEYS.RESET_EMAIL, normalizedEmail);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.RESET_EMAIL);
    }
  }, []);

  const setOtpVerified = useCallback((value) => {
    const isVerified = Boolean(value);

    setOtpVerifiedState(isVerified);
    sessionStorage.setItem(
      STORAGE_KEYS.OTP_VERIFIED,
      isVerified ? "true" : "false"
    );
  }, []);

  const clearResetFlow = useCallback(() => {
    setResetEmailState("");
    setOtpVerifiedState(false);

    sessionStorage.removeItem(STORAGE_KEYS.RESET_EMAIL);
    sessionStorage.removeItem(STORAGE_KEYS.OTP_VERIFIED);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      login,
      logout,
      resetEmail,
      setResetEmail,
      otpVerified,
      setOtpVerified,
      clearResetFlow,
    }),
    [
      user,
      login,
      logout,
      resetEmail,
      setResetEmail,
      otpVerified,
      setOtpVerified,
      clearResetFlow,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};