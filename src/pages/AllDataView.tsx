/**
 * All Data View
 * Manager-only page to view complete database of employees, logs, and records
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { formatDate, formatCurrency } from "../utils/config";
import {
  getEmployees,
  getProductionLogs,
  getInventoryLogs,
  getSalaryRecords,
} from "../utils/db";

export const AllDataView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "employees" | "production" | "inventory" | "salary"
  >("employees");

  const [employees, setEmployees] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empData, prodData, invData, salaryData] = await Promise.all([
        getEmployees(),
        getProductionLogs(),
        getInventoryLogs(),
        getSalaryRecords(),
      ]);
      setEmployees(empData);
      setProductionLogs(prodData);
      setInventoryLogs(invData);
      setSalaryRecords(salaryData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/manager")}
          className="text-cyan-600 hover:text-cyan-800 mb-4 inline-block text-sm font-semibold"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">All Data View</h1>
        <p className="text-gray-600 mb-8">
          Complete database of employees, logs, and records
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: "employees", label: "Employees", count: employees.length },
            {
              id: "production",
              label: "Production Logs",
              count: productionLogs.length,
            },
            {
              id: "inventory",
              label: "Inventory Logs",
              count: inventoryLogs.length,
            },
            {
              id: "salary",
              label: "Salary Records",
              count: salaryRecords.length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {activeTab === "employees" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {emp.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {emp.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {emp.role}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {emp.role === "Manager" || (emp.specialisation && ["mixer", "operator", "palletizer"].includes(emp.specialisation))
                          ? `${formatCurrency(emp.rate)}/day`
                          : `${formatCurrency(emp.rate)}/blk`}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded-full ${
                            emp.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "production" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Block Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Quantity Produced
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Operator
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(log.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.block_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.quantity_produced}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {employees.find((e) => e.id === log.employee_id)
                          ?.name || log.employee_id}
                      </td>
                    </tr>
                  ))}
                  {productionLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No production logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventoryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {log.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        +{log.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.note || "-"}
                      </td>
                    </tr>
                  ))}
                  {inventoryLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No inventory logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "salary" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Blocks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salaryRecords.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {req.employee_name ||
                          employees.find((e) => e.id === req.employee_id)
                            ?.name ||
                          req.employee_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.blocks_total} blocks
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₹{req.amount}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded-full ${
                            req.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : req.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {salaryRecords.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No salary records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
