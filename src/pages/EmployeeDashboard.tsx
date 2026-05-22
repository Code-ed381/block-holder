/**
 * Employee Dashboard
 * Dedicated portal for regular factory workers to enter and view daily production
 */

import React, { useState, useEffect, useMemo } from "react";
import { Navigation } from "../components/Navigation";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import {
  getProductionConfigs,
  getInventory,
  createProductionLog,
  deleteProductionLog,
  getEmployee,
  getSpecializationConfigs,
} from "../utils/db";
import { formatDate, formatCurrency } from "../utils/config";
import type { Employee, BlockType, ProductionConfig, Inventory, SpecializationConfig } from "../types";

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [configs, setConfigs] = useState<ProductionConfig[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [specConfigs, setSpecConfigs] = useState<SpecializationConfig[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    block_type: "solid-5inch" as BlockType,
    quantity_produced: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [empData, configData, invData, specData] = await Promise.all([
        getEmployee(user.id),
        getProductionConfigs(),
        getInventory(),
        getSpecializationConfigs(),
      ]);

      // Fetch only the logs belonging to the active logged-in employee
      const { data: logsData, error: logsError } = await supabase
        .from("production_logs")
        .select("*")
        .eq("employee_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;

      setEmployee(empData);
      setConfigs(configData as unknown as ProductionConfig[]);
      setInventory(invData);
      setLogs(logsData || []);
      setSpecConfigs(specData as SpecializationConfig[]);

      // If the employee has a specialisation, pre-select it in the form
      // if (empData?.specialisation) {
      //   setFormData((prev) => ({
      //     ...prev,
      //     block_type: empData.specialisation as BlockType,
      //   }));
      // }
    } catch (error) {
      console.error("Failed to load employee dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setInitialLoad(false);
    }
  };

  // Calculations
  const selectedConfig = useMemo(
    () => configs.find((c) => c.block_type === formData.block_type),
    [configs, formData.block_type]
  );

  const materialsNeeded = useMemo(() => {
    if (!selectedConfig || formData.quantity_produced <= 0) {
      return { cement: 0, dust: 0 };
    }
    const batches = formData.quantity_produced / selectedConfig.blocks_per_batch;
    return {
      cement: Math.ceil(batches * selectedConfig.bags_per_batch * 100) / 100,
      dust: Math.ceil(batches * selectedConfig.quarry_dust_m3_per_batch * 100) / 100,
    };
  }, [selectedConfig, formData.quantity_produced]);

  const stockWarning = useMemo(() => {
    if (!inventory) return false;
    return (
      materialsNeeded.cement > inventory.cement_bags_current ||
      materialsNeeded.dust > inventory.quarry_dust_m3_current
    );
  }, [inventory, materialsNeeded]);

  const today = new Date().toISOString().split("T")[0];

  // Self-Service Statistics
  const todayLogs = useMemo(() => logs.filter((log) => log.date === today), [logs, today]);
  const todayBlocks = useMemo(
    () => todayLogs.reduce((sum, log) => sum + (log.quantity_produced || 0), 0),
    [todayLogs]
  );

  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const monthlyLogs = useMemo(
    () => logs.filter((log) => log.date?.startsWith(currentMonth)),
    [logs, currentMonth]
  );
  const monthlyBlocks = useMemo(
    () => monthlyLogs.reduce((sum, log) => sum + (log.quantity_produced || 0), 0),
    [monthlyLogs]
  );

  const builderSpecs = new Set(["mixer", "operator", "palletizer"]);
  const empSpec = employee?.specialisation
    ? specConfigs.find((s) => s.specialization === employee.specialisation)
    : null;
  const isBuilder = employee?.specialisation
    ? builderSpecs.has(employee.specialisation)
    : false;
  const displayRate = empSpec
    ? isBuilder
      ? empSpec.daily_rate
      : empSpec.per_block_rate
    : employee?.rate || 0.5;

  // Count unique days the employee logged this month
  const monthlyDays = useMemo(
    () => new Set(monthlyLogs.map((l) => l.date)).size,
    [monthlyLogs],
  );

  const projectedEarnings = isBuilder
    ? monthlyDays * displayRate
    : monthlyBlocks * displayRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (formData.quantity_produced <= 0) {
      return toast.error("Please enter a valid quantity produced");
    }

    // Duplicate check
    const isDuplicate = logs.some(
      (log) =>
        log.date === formData.date &&
        log.block_type === formData.block_type
    );

    if (isDuplicate) {
      const confirm = window.confirm(
        "A log entry already exists for you on this date and block type. Do you want to add another one?"
      );
      if (!confirm) return;
    }

    if (stockWarning) {
      const confirm = window.confirm(
        "Raw materials in factory stock are low. Do you still want to proceed?"
      );
      if (!confirm) return;
    }

    setLoading(true);

    console.log("Submitting production log:", formData);
    console.log("Materials needed:", materialsNeeded);
    try {
      await createProductionLog({
        date: formData.date,
        employee_id: user.id,
        block_type: formData.block_type,
        quantity_produced: formData.quantity_produced,
        cement_bags_used: materialsNeeded.cement,
        quarry_dust_m3_used: materialsNeeded.dust,
      });

      // Reset form quantity
      setFormData((prev) => ({
        ...prev,
        quantity_produced: 0,
      }));

      await fetchData(); // Refresh statistics and recent logs
      toast.success("Production logged successfully!");
    } catch (error) {
      console.error("Failed to create employee log:", error);
      toast.error("Error saving log");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this log? Materials will be restored to inventory."
      )
    )
      return;
    setLoading(true);
    try {
      await deleteProductionLog(id);
      await fetchData();
      toast.success("Log deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete log");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="mb-8 bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                Factory Worker Portal
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Welcome back, <span className="text-amber-500">{employee?.name || user?.name}</span>!
              </h1>
              <p className="text-slate-300 mt-1.5 text-sm">
                Record your daily production here. Track your monthly output and projected earnings.
              </p>
            </div>
            {employee?.specialisation && (
              <div className="bg-slate-800/70 border border-slate-700 px-4 py-2 rounded-2xl flex items-center gap-2 self-start md:self-auto">
                <span className="text-amber-500 font-bold text-xs uppercase tracking-wider">
                  Specialisation:
                </span>
                <span className="text-white text-xs font-bold font-mono">
                  {employee.specialisation}
                </span>
              </div>
            )}
          </div>
        </div>

        {initialLoad ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 h-96 bg-gray-200 rounded-2xl"></div>
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                  {isBuilder ? "My Daily Rate" : "My Rate / Block"}
                </p>
                <p className="text-2xl font-black text-slate-800 font-mono mt-2">
                  {formatCurrency(displayRate)}
                </p>
                <span className="text-[10px] text-slate-400 mt-2">
                  {isBuilder
                    ? "Paid daily rate + shared bonus"
                    : employee?.role === "Manager"
                      ? "Paid per day"
                      : "Paid per block produced"}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                  Today's Production
                </p>
                <p className="text-2xl font-black text-blue-600 font-mono mt-2">
                  {todayBlocks.toLocaleString()} <span className="text-xs font-normal text-gray-500">blocks</span>
                </p>
                  <span className="text-[10px] text-blue-500 font-bold mt-2">
                    Estimated earnings: {formatCurrency(todayBlocks * (empSpec?.per_block_rate || employee?.rate || 0.5))}
                  </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                  Monthly Total
                </p>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-2">
                  {monthlyBlocks.toLocaleString()} <span className="text-xs font-normal text-gray-500">blocks</span>
                </p>
                <span className="text-[10px] text-emerald-500 font-bold mt-2">Logged in {currentMonth}</span>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 p-5 rounded-2xl shadow-sm border border-amber-500/20 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
                  MTD Projected Earnings
                </p>
                <p className="text-2xl font-black text-amber-950 font-mono mt-2">
                  {formatCurrency(projectedEarnings)}
                </p>
                <span className="text-[10px] text-amber-700 font-bold mt-2">Pending supervisor payroll run</span>
              </div>
            </div>

            {/* Main Section Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Logging Form (Left) */}
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                  <h2 className="text-xl font-bold mb-6 flex items-center text-gray-800">
                    <span className="mr-2 text-xl">🔨</span> Log Today's Work
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        Production Date
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        Block Type
                      </label>
                      <select
                        value={formData.block_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            block_type: e.target.value as BlockType,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all text-slate-800 cursor-pointer"
                      >
                        <option value="solid-5inch">Solid 5"</option>
                        <option value="solid-6inch">Solid 6"</option>
                        <option value="hollow-5inch">Hollow 5"</option>
                        <option value="hollow-6inch">Hollow 6"</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        Blocks Produced
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.quantity_produced || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity_produced: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all text-slate-800"
                        placeholder="e.g. 150"
                      />
                    </div>

                    {/* Live Preview Section */}
                    {formData.quantity_produced > 0 && selectedConfig && (
                      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/50 space-y-2">
                        <h3 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                          Estimated Raw Materials Deducted
                        </h3>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">Cement Bags:</span>
                          <span
                            className={`font-bold ${
                              inventory && materialsNeeded.cement > inventory.cement_bags_current
                                ? "text-red-600"
                                : "text-slate-800"
                            }`}
                          >
                            {materialsNeeded.cement} bags
                            {inventory && materialsNeeded.cement > inventory.cement_bags_current && (
                              <span className="block text-[8px] text-red-500 font-bold uppercase mt-0.5 text-right">
                                Insufficient stock
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">Quarry Dust:</span>
                          <span
                            className={`font-bold ${
                              inventory && materialsNeeded.dust > inventory.quarry_dust_m3_current
                                ? "text-red-600"
                                : "text-slate-800"
                            }`}
                          >
                            {materialsNeeded.dust} m³
                            {inventory && materialsNeeded.dust > inventory.quarry_dust_m3_current && (
                              <span className="block text-[8px] text-red-500 font-bold uppercase mt-0.5 text-right">
                                Insufficient stock
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {stockWarning && (
                      <div className="bg-red-50 p-3 rounded-xl border border-red-200 flex items-start gap-2 animate-pulse">
                        <span className="text-red-500 text-sm">⚠️</span>
                        <p className="text-[11px] text-red-800 font-medium">
                          Factory materials inventory shows insufficient stock. Please request restock from your supervisor!
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || formData.quantity_produced <= 0}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 transition-all duration-200 ${
                        loading || formData.quantity_produced <= 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                          : "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 cursor-pointer shadow-md shadow-amber-500/5"
                      }`}
                    >
                      {loading ? "Recording..." : "Log Production"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Recent Logs (Right) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                      <span className="mr-2">📋</span> My Production History
                    </h2>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                      {logs.length} entries
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-150">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Date
                          </th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Block Size
                          </th>
                          <th className="px-6 py-3.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Blocks Produced
                          </th>
                          <th className="px-6 py-3.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Est. Payout
                          </th>
                          <th className="px-6 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 bg-white">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-4 text-sm text-slate-800 whitespace-nowrap">
                              {formatDate(log.date)}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                              {log.block_type === "solid-5inch" && "Solid 5\""}
                              {log.block_type === "solid-6inch" && "Solid 6\""}
                              {log.block_type === "hollow-5inch" && "Hollow 5\""}
                              {log.block_type === "hollow-6inch" && "Hollow 6\""}
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-bold text-slate-900 font-mono">
                              {log.quantity_produced.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600 font-mono">
                              {formatCurrency(log.quantity_produced * (empSpec?.per_block_rate || employee?.rate || 0.5))}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {log.date === today ? (
                                <button
                                  onClick={() => handleDelete(log.id)}
                                  className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/70 p-1.5 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title="Delete today's log"
                                  disabled={loading}
                                >
                                  🗑️
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                  Approved
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {logs.length === 0 && (
                      <div className="py-24 text-center">
                        <div className="text-4xl mb-4">⛏️</div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">
                          No production logs logged yet
                        </h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          Enter the quantity of blocks you made today in the entry form to see your history populate here!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
