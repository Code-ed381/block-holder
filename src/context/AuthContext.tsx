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
  login: (identifier: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, phone_number: string, password: string) => Promise<void>;
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

  const login = async (identifier: string, password?: string) => {
    // Try phone match first, then email
    let { data: employee, error } = await supabase
      .from("employees")
      .select("*")
      .eq("phone_number", identifier)
      .maybeSingle();

    if (!employee) {
      const result = await supabase
        .from("employees")
        .select("*")
        .eq("email", identifier)
        .maybeSingle();
      employee = result.data;
      error = result.error;
    }

    if (error || !employee) {
      throw new Error("Account not found. Check your phone number or email.");
    }

    if (employee.status !== "active") {
      throw new Error("Employee account is inactive");
    }

    // Managers require password, supervisors/employees log in with phone only
    if (employee.role === "Manager") {
      if (!password) {
        throw new Error("Password is required for manager login");
      }
      if (employee.password !== password) {
        throw new Error("Invalid password");
      }
    }

    const newUser: User = {
      id: employee.id,
      email: employee.email,
      phone_number: employee.phone_number,
      name: employee.name,
      role: employee.role as UserRole,
    };

    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
  };
  
  const signup = async (name: string, email: string, phone_number: string, password: string) => {
    // Check if phone already taken
    const { data: existingPhone } = await supabase
      .from("employees")
      .select("id")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (existingPhone) {
      throw new Error("Phone number already registered");
    }

    // Check if email already taken
    const { data: existingEmail } = await supabase
      .from("employees")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingEmail) {
      throw new Error("Email already registered");
    }

    const { data: signupData, error: signupError } = await supabase
      .from("employees")
      .insert([{
        id: new Date().getTime().toString(),
        name: name,
        role: "Manager",
        rate: 10.0,
        status: "active",
        created_at: new Date().toISOString(),
        phone_number: phone_number,
        specialisation: "manager",
        email: email,
        password: password,
      }])
      .select();
             
    if (signupError) {
      throw new Error("Failed to create employee");
    }

    setLoading(false);

    const newUser: User = {
      id: signupData[0].id,
      email: signupData[0].email,
      phone_number: signupData[0].phone_number,
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
