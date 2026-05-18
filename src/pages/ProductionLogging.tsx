/**
 * Daily Production Logging Page
 * Allows supervisors to record daily production and materials usage
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import {
  getEmployees,
  getProductionConfigs,
  getProductionLogs,
  createProductionLog,
  deleteProductionLog,
  getInventory,
} from "../utils/db";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/config";
import type {
  Employee,
  BlockType,
  ProductionConfig,
  Inventory,
} from "../types";

export const ProductionLogging: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [configs, setConfigs] = useState<ProductionConfig[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const toast = useToast();

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    employee_id: "",
    block_type: "solid-5inch" as BlockType,
    quantity_produced: 0,
  });

  // Filter State
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    employeeId: "all",
    blockType: "all",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empData, configData, logData, invData] = await Promise.all([
        getEmployees(),
        getProductionConfigs(),
        getProductionLogs(),
        getInventory(),
      ]);
      setEmployees(
        empData.filter((e) => e.status === "active") as unknown as Employee[],
      );
      setConfigs(configData as unknown as ProductionConfig[]);
      setLogs(logData);
      setInventory(invData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setInitialLoad(false);
    }
  };

  // Calculations
  const selectedConfig = useMemo(
    () => configs.find((c) => c.block_type === formData.block_type),
    [configs, formData.block_type],
  );

  const materialsNeeded = useMemo(() => {
    if (!selectedConfig || formData.quantity_produced <= 0) {
      return { cement: 0, dust: 0 };
    }
    const batches =
      formData.quantity_produced / selectedConfig.blocks_per_batch;
    return {
      cement: Math.ceil(batches * selectedConfig.bags_per_batch * 100) / 100,
      dust:
        Math.ceil(batches * selectedConfig.quarry_dust_m3_per_batch * 100) /
        100,
    };
  }, [selectedConfig, formData.quantity_produced]);

  const stockWarning = useMemo(() => {
    if (!inventory) return false;
    return (
      materialsNeeded.cement > inventory.cement_bags_current ||
      materialsNeeded.dust > inventory.quarry_dust_m3_current
    );
  }, [inventory, materialsNeeded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) return toast.error("Please select an employee");

    // Duplicate check
    const isDuplicate = logs.some(
      (log) =>
        log.date === formData.date &&
        log.employee_id === formData.employee_id &&
        log.block_type === formData.block_type,
    );

    if (isDuplicate) {
      const confirm = window.confirm(
        "A log entry already exists for this employee, date, and block type. Do you want to add another one?",
      );
      if (!confirm) return;
    }

    if (stockWarning) {
      const confirm = window.confirm(
        "Inventory is insufficient. Do you still want to proceed?",
      );
      if (!confirm) return;
    }

    setLoading(true);
    try {
      await createProductionLog({
        ...formData,
        cement_bags_used: materialsNeeded.cement,
        quarry_dust_m3_used: materialsNeeded.dust,
      });

      // Reset form (except date)
      setFormData({
        ...formData,
        employee_id: "",
        quantity_produced: 0,
      });

      await fetchData(); // Refresh data and inventory
      toast.success("Production log recorded successfully!");
    } catch (error) {
      console.error("Failed to create log:", error);
      toast.error("Error saving log");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this log? Materials will be restored to inventory.",
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

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesDate =
        (!filters.startDate || log.date >= filters.startDate) &&
        (!filters.endDate || log.date <= filters.endDate);
      const matchesEmployee =
        filters.employeeId === "all" || log.employee_id === filters.employeeId;
      const matchesBlock =
        filters.blockType === "all" || log.block_type === filters.blockType;
      return matchesDate && matchesEmployee && matchesBlock;
    });
  }, [logs, filters]);

  // Totals
  const totals = useMemo(() => {
    return filteredLogs.reduce(
      (acc, log) => ({
        qty: acc.qty + log.quantity_produced,
        cement: acc.cement + log.cement_bags_used,
        dust: acc.dust + log.quarry_dust_m3_used,
      }),
      { qty: 0, cement: 0, dust: 0 },
    );
  }, [filteredLogs]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate("/supervisor")}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block text-sm"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            Daily Production Logging
          </h1>
          <p className="text-gray-600">Record production and material usage</p>
        </div>

        {initialLoad ? (
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 h-96 bg-gray-200 rounded-xl"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Logging Form */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-600 sticky top-8">
                <h2 className="text-xl font-bold mb-6 flex items-center">
                  <span className="mr-2">📝</span> New Entry
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Employee
                    </label>
                    <select
                      required
                      value={formData.employee_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employee_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="solid-5inch">Solid 5"</option>
                      <option value="solid-6inch">Solid 6"</option>
                      <option value="hollow-5inch">Hollow 5"</option>
                      <option value="hollow-6inch">Hollow 6"</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Quantity Produced
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
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  {/* Preview Section */}
                  {formData.quantity_produced > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="text-xs font-bold text-blue-800 uppercase mb-2">
                        Estimated Material Usage
                      </h3>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">
                          Cement Bags:
                        </span>
                        <span
                          className={`text-sm font-bold ${inventory && materialsNeeded.cement > inventory.cement_bags_current ? "text-red-600" : "text-gray-900"}`}
                        >
                          {materialsNeeded.cement} bags
                          {inventory &&
                            materialsNeeded.cement >
                              inventory.cement_bags_current && (
                              <span className="block text-[10px] text-red-500 font-bold uppercase mt-0.5">
                                CRITICAL: Insufficient
                              </span>
                            )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Quarry Dust:
                        </span>
                        <span
                          className={`text-sm font-bold ${inventory && materialsNeeded.dust > inventory.quarry_dust_m3_current ? "text-red-600" : "text-gray-900"}`}
                        >
                          {materialsNeeded.dust} m³
                          {inventory &&
                            materialsNeeded.dust >
                              inventory.quarry_dust_m3_current && (
                              <span className="block text-[10px] text-red-500 font-bold uppercase mt-0.5">
                                CRITICAL: Insufficient
                              </span>
                            )}
                        </span>
                      </div>
                    </div>
                  )}

                  {stockWarning && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                      <span className="text-red-500">⚠️</span>
                      <p className="text-xs text-red-800 font-medium">
                        Insufficient inventory! Please verify stock before
                        submitting.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !formData.employee_id ||
                      formData.quantity_produced <= 0
                    }
                    className={`w-full py-3 rounded-lg font-bold text-white transition-all duration-200 ${loading || !formData.employee_id || formData.quantity_produced <= 0 ? "bg-gray-300 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5"}`}
                  >
                    {loading ? "Saving..." : "Submit Log"}
                  </button>
                </form>
              </div>
            </div>

            {/* Log Table & Filters */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-full">
                {/* Table Filters */}
                <div className="p-4 bg-gray-50 border-b grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        setFilters({ ...filters, startDate: e.target.value })
                      }
                      className="w-full text-sm px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        setFilters({ ...filters, endDate: e.target.value })
                      }
                      className="w-full text-sm px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Employee
                    </label>
                    <select
                      value={filters.employeeId}
                      onChange={(e) =>
                        setFilters({ ...filters, employeeId: e.target.value })
                      }
                      className="w-full text-sm px-2 py-1 border rounded"
                    >
                      <option value="all">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Type
                    </label>
                    <select
                      value={filters.blockType}
                      onChange={(e) =>
                        setFilters({ ...filters, blockType: e.target.value })
                      }
                      className="w-full text-sm px-2 py-1 border rounded"
                    >
                      <option value="all">All Types</option>
                      <option value="solid-5inch">Solid 5"</option>
                      <option value="solid-6inch">Solid 6"</option>
                      <option value="hollow-5inch">Hollow 5"</option>
                      <option value="hollow-6inch">Hollow 6"</option>
                    </select>
                  </div>
                </div>

                {/* Table Body */}
                <div className="overflow-x-auto flex-1">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">
                          Cement
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">
                          Dust
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-blue-50/30 transition"
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {formatDate(log.date)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {log.employee_name}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {log.block_type}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold">
                            {log.quantity_produced.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {log.cement_bags_used}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {log.quarry_dust_m3_used}m³
                          </td>
                          <td className="px-4 py-3 text-right">
                            {log.date === today && (
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="text-red-400 hover:text-red-600 transition"
                                title="Delete log"
                              >
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {filteredLogs.length > 0 && (
                      <tfoot className="bg-gray-800 text-white font-bold">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-right text-[10px] uppercase tracking-wider"
                          >
                            Filtered Totals:
                          </td>
                          <td className="px-4 py-3 text-right">
                            {totals.qty.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {totals.cement.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {totals.dust.toLocaleString()}m³
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {filteredLogs.length === 0 && (
                    <div className="py-20 text-center">
                      <div className="text-4xl mb-4">📝</div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        No logs found
                      </h3>
                      <p className="text-gray-500">
                        {logs.length === 0
                          ? "No production logs have been recorded yet."
                          : "No logs match the current filters."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
