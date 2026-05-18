/**
 * Inventory Management Page
 * Accessible by Supervisor (view) and Manager (full access)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/config";
import {
  getInventory,
  updateInventoryThresholds,
  restockInventory,
  getInventoryLogs,
  getInventoryConsumption,
  getProductionBreakdown,
} from "../utils/db";
import type {
  Inventory as InventoryType,
  InventoryLog,
  MaterialUsage,
  ProductionBreakdown,
} from "../types";

export const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === "Manager";

  const [inventory, setInventory] = useState<InventoryType | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [consumption, setConsumption] = useState<MaterialUsage[]>([]);
  const [breakdown, setBreakdown] = useState<ProductionBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [restockData, setRestockData] = useState({
    type: "cement" as "cement" | "dust",
    quantity: 0,
    note: "",
  });
  const [thresholdData, setThresholdData] = useState({ cement: 0, dust: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inv, logData, consData, breakData] = await Promise.all([
        getInventory(),
        getInventoryLogs(),
        getInventoryConsumption(),
        getProductionBreakdown(),
      ]);
      setInventory(inv);
      setLogs(logData as unknown as InventoryLog[]);
      setConsumption(consData);
      setBreakdown(breakData as unknown as ProductionBreakdown[]);
      setThresholdData({
        cement: inv.cement_bags_threshold,
        dust: inv.quarry_dust_m3_threshold,
      });
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restockData.quantity <= 0) return toast.error("Enter a valid quantity");
    try {
      await restockInventory(restockData);
      setRestockData({ type: "cement", quantity: 0, note: "" });
      fetchData();
      toast.success("Restock recorded successfully!");
    } catch (error) {
      toast.error("Failed to restock");
    }
  };

  const handleUpdateThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateInventoryThresholds({
        cement_bags_threshold: thresholdData.cement,
        quarry_dust_m3_threshold: thresholdData.dust,
      });
      fetchData();
      toast.success("Thresholds updated!");
    } catch (error) {
      toast.error("Failed to update thresholds");
    }
  };

  const getStatusColor = (current: number, threshold: number) => {
    if (current <= threshold * 0.5) return "bg-red-500";
    if (current <= threshold) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStatusLabel = (current: number, threshold: number) => {
    if (current <= threshold * 0.5) return "Critical Stock";
    if (current <= threshold) return "Low Stock";
    return "Healthy";
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-gray-200 rounded-2xl"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block text-sm"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            Inventory Management
          </h1>
          <p className="text-gray-600">
            Monitor and manage material stock levels
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Cement Card */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-gray-400">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  Cement Bags
                </h2>
                <div className="text-4xl font-black text-gray-900">
                  {inventory?.cement_bags_current}{" "}
                  <span className="text-lg font-normal text-gray-500">
                    bags
                  </span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold text-white ${inventory ? getStatusColor(inventory.cement_bags_current, inventory.cement_bags_threshold) : ""}`}
              >
                {inventory
                  ? getStatusLabel(
                      inventory.cement_bags_current,
                      inventory.cement_bags_threshold,
                    )
                  : ""}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>0</span>
                <span>Threshold: {inventory?.cement_bags_threshold}</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${inventory ? getStatusColor(inventory.cement_bags_current, inventory.cement_bags_threshold) : ""}`}
                  style={{
                    width: `${Math.min(((inventory?.cement_bags_current || 0) / (inventory?.cement_bags_threshold || 1)) * 50, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quarry Dust Card */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-amber-400">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  Quarry Dust
                </h2>
                <div className="text-4xl font-black text-gray-900">
                  {inventory?.quarry_dust_m3_current}{" "}
                  <span className="text-lg font-normal text-gray-500">m³</span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold text-white ${inventory ? getStatusColor(inventory.quarry_dust_m3_current, inventory.quarry_dust_m3_threshold) : ""}`}
              >
                {inventory
                  ? getStatusLabel(
                      inventory.quarry_dust_m3_current,
                      inventory.quarry_dust_m3_threshold,
                    )
                  : ""}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>0</span>
                <span>Threshold: {inventory?.quarry_dust_m3_threshold}m³</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${inventory ? getStatusColor(inventory.quarry_dust_m3_current, inventory.quarry_dust_m3_threshold) : ""}`}
                  style={{
                    width: `${Math.min(((inventory?.quarry_dust_m3_current || 0) / (inventory?.quarry_dust_m3_threshold || 1)) * 50, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Display: Trends & Breakdown */}
          <div className="lg:col-span-2 space-y-8">
            {/* Consumption Trend (Last 7 Days) */}
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">📉</span> Consumption Trend (Last 7 Days)
              </h3>
              <div className="h-64 flex items-end justify-between gap-2 border-b border-gray-200 pb-2">
                {consumption.map((day, idx) => (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                  >
                    <div className="w-full flex gap-1 items-end justify-center h-full">
                      {/* Cement Bar */}
                      <div
                        className="w-1/3 bg-gray-400 rounded-t transition-all hover:brightness-90 cursor-help"
                        style={{ height: `${Math.min(day.cement * 2, 100)}%` }}
                        title={`${day.cement} bags`}
                      />
                      {/* Dust Bar */}
                      <div
                        className="w-1/3 bg-amber-400 rounded-t transition-all hover:brightness-90 cursor-help"
                        style={{ height: `${Math.min(day.dust * 10, 100)}%` }}
                        title={`${day.dust} m³`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold rotate-45 mt-2 whitespace-nowrap">
                      {day.date.split("-").slice(1).join("/")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-center gap-8 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded" />
                  <span className="text-gray-600">Cement Bags</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-400 rounded" />
                  <span className="text-gray-600">Quarry Dust (m³)</span>
                </div>
              </div>
            </div>

            {/* Production Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">🏗️</span> Monthly Production by Type
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  "solid-5inch",
                  "solid-6inch",
                  "hollow-5inch",
                  "hollow-6inch",
                ].map((type) => {
                  const data = breakdown.find((b) => b.block_type === type);
                  return (
                    <div
                      key={type}
                      className="bg-gray-50 p-4 rounded-xl border border-gray-100"
                    >
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                        {type.replace("-", " ")}
                      </div>
                      <div className="text-2xl font-black text-gray-800">
                        {data?.total || 0}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        blocks this month
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Actions (Manager Only) */}
          <div className="lg:col-span-1 space-y-8">
            {isManager ? (
              <>
                {/* Restock Form */}
                <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-600">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">
                    📦 Restock Materials
                  </h3>
                  <form onSubmit={handleRestock} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Material Type
                      </label>
                      <select
                        value={restockData.type}
                        onChange={(e) =>
                          setRestockData({
                            ...restockData,
                            type: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cement">Cement (Bags)</option>
                        <option value="dust">Quarry Dust (m³)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Quantity to Add
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={restockData.quantity || ""}
                        onChange={(e) =>
                          setRestockData({
                            ...restockData,
                            quantity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={restockData.note}
                        onChange={(e) =>
                          setRestockData({
                            ...restockData,
                            note: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Supplier name, etc."
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      Record Restock
                    </button>
                  </form>
                </div>

                {/* Threshold Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-emerald-600">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">
                    ⚙️ Alert Thresholds
                  </h3>
                  <form onSubmit={handleUpdateThresholds} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Cement Low-Stock (bags)
                      </label>
                      <input
                        type="number"
                        value={thresholdData.cement}
                        onChange={(e) =>
                          setThresholdData({
                            ...thresholdData,
                            cement: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Dust Low-Stock (m³)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={thresholdData.dust}
                        onChange={(e) =>
                          setThresholdData({
                            ...thresholdData,
                            dust: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      Update Thresholds
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div className="text-blue-500 text-2xl mb-2">ℹ️</div>
                <h4 className="font-bold text-blue-900 mb-2">
                  Supervisor View
                </h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  You can monitor stock levels and trends. For restocking or
                  changing thresholds, please contact the Manager.
                </p>
              </div>
            )}

            {/* Recent Top-ups */}
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                📜 Recent Restocks
              </h3>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="text-sm border-b border-gray-50 pb-2"
                  >
                    <div className="flex justify-between font-bold">
                      <span
                        className={
                          log.type === "cement"
                            ? "text-gray-600"
                            : "text-amber-600"
                        }
                      >
                        +{log.quantity} {log.type === "cement" ? "bags" : "m³"}
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    {log.note && (
                      <div className="text-gray-500 text-xs italic">
                        {log.note}
                      </div>
                    )}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-gray-400 text-sm italic">
                    No restocks recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
