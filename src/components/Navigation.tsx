/**
 * Navigation Component
 * Top navigation bar with role-based links and logout
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/70 shadow-[0_22px_48px_rgba(15,23,42,0.16)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between h-auto lg:h-20 py-4 lg:py-0">
          <Link
            to={user?.role === "Supervisor" ? "/supervisor" : "/manager"}
            className="inline-flex items-center gap-3 font-semibold text-lg tracking-tight transition-all duration-300 hover:scale-105"
          >
            <span className="text-2xl">📦</span>
            <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              Block Holder
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 lg:gap-4 justify-between w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              {user?.role === "Supervisor" && (
                <Link
                  to="/supervisor"
                  className="text-slate-200 hover:text-white hover:bg-slate-800/60 px-3 py-2 rounded-2xl transition-all duration-200 font-medium"
                >
                  Supervisor Dashboard
                </Link>
              )}
              {user?.role === "Manager" && (
                <>
                  <Link
                    to="/manager"
                    className="text-slate-200 hover:text-white hover:bg-slate-800/60 px-3 py-2 rounded-2xl transition-all duration-200 font-medium"
                  >
                    Manager Dashboard
                  </Link>
                  <Link
                    to="/manager/employees"
                    className="text-slate-200 hover:text-white hover:bg-slate-800/60 px-3 py-2 rounded-2xl transition-all duration-200 font-medium"
                  >
                    Employees
                  </Link>
                  <Link
                    to="/manager/reports"
                    className="text-slate-200 hover:text-white hover:bg-slate-800/60 px-3 py-2 rounded-2xl transition-all duration-200 font-medium"
                  >
                    Reports
                  </Link>
                </>
              )}
            </div>

            {/* Desktop: Show username and logout inline */}
            <div className="hidden lg:flex items-center gap-3 rounded-3xl border border-slate-800/70 bg-slate-900/60 px-3 py-2">
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  {user?.role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-danger px-4 py-2 text-sm"
              >
                Logout
              </button>
            </div>

            {/* Mobile: Dropdown toggle */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-3xl border border-slate-800/70 bg-slate-900/60 px-3 py-2"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">
                    {user?.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {user?.role}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-full bg-slate-900 border border-slate-800/70 rounded-2xl shadow-xl overflow-hidden z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-slate-800/60 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
