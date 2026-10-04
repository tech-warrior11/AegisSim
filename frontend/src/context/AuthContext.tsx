import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { ApiService } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("aegissim_token"));
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("aegissim_user");
    return cached ? JSON.parse(cached) : null;
  });

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("aegissim_token", newToken);
    localStorage.setItem("aegissim_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("aegissim_token");
    localStorage.removeItem("aegissim_user");
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

