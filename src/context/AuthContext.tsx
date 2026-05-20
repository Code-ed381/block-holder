/**
 * Authentication Context
 * Manages user authentication state and role-based access using employees table
 */

import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, UserRole, AuthState } from "../types";
import { supabase } from "../lib/supabase";

const AUTH_STORAGE_KEY = "blockholder_auth_user";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize from localStorage on mount
    const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Query employee by email and password
    const { data: employee, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .single();

    if (error || !employee) {
      throw new Error("Invalid email or password");
    }

    if (employee.status !== "active") {
      throw new Error("Employee account is inactive");
    }

    const newUser: User = {
      id: employee.id,
      email: email,
      name: employee.name,
      role: employee.role as UserRole,
    };

    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
  };
  
  const signup = async (name: string, email: string, password: string) => {
    // Query employee by email and password
    const { data: employee, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", email)

    if (error || employee.length > 0) {
      throw new Error("Invalid email or password");
    }

    const { data: signupData, error: signupError } = await supabase
      .from("employees")
      .insert([{ id: new Date().getTime().toString(), name: name, role: "Manager", daily_rate_per_block: "10", status: "active", created_at: new Date().toISOString(), specialisation: "manager", email: email, password: password }])
      .select();
              
    if (signupError) {
      throw new Error("Failed to create employee");
    }

    setLoading(false);

    const newUser: User = {
      id: signupData[0].id,
      email: email,
      name: signupData[0].name,
      role: signupData[0].role as UserRole,
    };

    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
