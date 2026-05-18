/**
 * Login Page
 * Role-based login form with spacious, comfortable layout padding
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

export const Login: React.FC = () => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("Supervisor");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name to proceed");
      return;
    }

    login(name, role);

    if (role === "Supervisor") {
      navigate("/supervisor");
    } else if (role === "Manager") {
      navigate("/manager");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Industrial background glow */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-xl z-10">
        {/* Header - Increased margin bottom */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="h-14 w-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4 border border-amber-400/20">
            <svg className="w-7 h-7 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Block <span className="text-amber-500">Holder</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-2.5 uppercase tracking-widest">
            Factory Management Platform
          </p>
        </div>

        {/* Main Card - Expanded from max-w-md to max-w-xl, padding boosted to p-10 */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-10 sm:p-12 transition-all duration-300">
          
          {/* Form items spaced further apart (space-y-7) */}
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-xl text-sm flex items-center gap-3 animate-shake">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Operator Input Block */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                Operator Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pl-12 pr-4 py-4 text-base text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                />
              </div>
            </div>

            {/* Assigned Role Block */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Assigned Role
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pl-12 pr-10 py-4 text-base text-white appearance-none focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer"
                >
                  <option value="Supervisor" className="bg-slate-800">Supervisor</option>
                  <option value="Manager" className="bg-slate-800">Manager</option>
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              className="w-full mt-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-4 px-4 rounded-xl transition-all duration-150 shadow-lg shadow-amber-500/5 hover:shadow-xl hover:shadow-amber-500/15 flex items-center justify-center gap-2 group text-base cursor-pointer"
            >
              <span>Access System Portal</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 mt-8 text-slate-500 text-xs tracking-widest uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Demo Environment • Open Sandbox</span>
        </div>
      </div>
    </div>
  );
};