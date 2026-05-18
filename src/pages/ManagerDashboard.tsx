/**
 * Manager Dashboard
 * Placeholder for manager features (approvals, reports, exports)
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";

export const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Manager Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          Approve salary payments, view analytics, and export reports
        </p>

        {/* Placeholder Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group cursor-pointer"
            onClick={() => navigate("/manager/salary-approval")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors">
                <span className="text-2xl">✅</span>
              </div>
              <div className="bg-green-50 text-green-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                Finance
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Salary Approvals
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Review and approve pending salary disbursement requests.
            </p>
            <button className="text-green-600 hover:text-green-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View Approvals{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <div
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group cursor-pointer"
            onClick={() => navigate("/manager/reports")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                <span className="text-2xl">📈</span>
              </div>
              <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                Analytics
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Production Analytics
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              View production trends, employee performance, and material usage.
            </p>
            <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View Analytics{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <div
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group cursor-pointer"
            onClick={() => navigate("/manager/reports")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
                <span className="text-2xl">📊</span>
              </div>
              <div className="bg-purple-50 text-purple-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                Reports
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Export Reports
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Generate and export CSV reports for management review.
            </p>
            <button className="text-purple-600 hover:text-purple-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              Export Data{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <div
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group cursor-pointer"
            onClick={() => navigate("/manager/production-config")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-slate-200 transition-colors">
                <span className="text-2xl">⚙️</span>
              </div>
              <div className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                Config
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Production Config
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              View and manage production batch configurations.
            </p>
            <button className="text-slate-600 hover:text-slate-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View Config{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <div
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group cursor-pointer"
            onClick={() => navigate("/manager/inventory")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-amber-100 p-3 rounded-xl group-hover:bg-amber-200 transition-colors">
                <span className="text-2xl">📦</span>
              </div>
              <div className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                Stock
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Inventory Overview
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Monitor cement and quarry dust stock levels.
            </p>
            <button className="text-amber-600 hover:text-amber-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View Inventory{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <div
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group cursor-pointer"
            onClick={() => navigate("/manager/all-data")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-cyan-100 p-3 rounded-xl group-hover:bg-cyan-200 transition-colors">
                <span className="text-2xl">👥</span>
              </div>
              <div className="bg-cyan-50 text-cyan-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                Data
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              All Data View
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Access complete database of employees, logs, and records.
            </p>
            <button className="text-cyan-600 hover:text-cyan-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View All Data{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>
        </div>

        {/* Summary Stats Placeholder */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
            <p className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">
              Pending Approvals
            </p>
            <p className="text-3xl font-black text-blue-900">—</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
            <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">
              Total Employees
            </p>
            <p className="text-3xl font-black text-green-900">—</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200">
            <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
              This Month Revenue
            </p>
            <p className="text-3xl font-black text-amber-900">—</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
            <p className="text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
              Avg Block Cost
            </p>
            <p className="text-3xl font-black text-purple-900">—</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200">
            <p className="text-red-700 text-xs font-bold uppercase tracking-wider mb-1">
              Critical Issues
            </p>
            <p className="text-3xl font-black text-red-900">—</p>
          </div>
        </div>
      </div>
    </div>
  );
};
