/**
 * Login Page
 * Email/password login form using employees table
 */

import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      // Navigation will be handled by App.tsx based on user role
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
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
            <svg
              className="w-7 h-7 text-slate-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
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
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Email Input Block */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pl-12 pr-4 py-4 text-base text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                />
              </div>
            </div>

            {/* Password Input Block */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pl-12 pr-4 py-4 text-base text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-slate-950 font-bold py-4 px-4 rounded-xl transition-all duration-150 shadow-lg shadow-amber-500/5 hover:shadow-xl hover:shadow-amber-500/15 flex items-center justify-center gap-2 group text-base cursor-pointer"
            >
              <span>{loading ? "Signing in..." : "Access System Portal"}</span>
              {!loading && (
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              )}
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
