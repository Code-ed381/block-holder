/**
 * Employee Management Page
 * Allows supervisors to manage employees, rates, and view projected stats
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import { getEmployees, createEmployee, updateEmployee } from "../utils/db";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate } from "../utils/config";
import type { EmployeeStatus, UserRole, BlockType } from "../types";

export const EmployeeManagement: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "all">(
    "all",
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const toast = useToast();
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    role: "Supervisor" as UserRole,
    daily_rate_per_block: 0.5,
    specialisation: "" as BlockType | "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployee({
        ...newEmployee,
        status: "active",
        specialisation: newEmployee.specialisation || undefined,
      });
      setShowAddForm(false);
      setNewEmployee({
        name: "",
        role: "Supervisor",
        daily_rate_per_block: 0.5,
        specialisation: "",
      });
      fetchEmployees();
      toast.success("Employee added successfully!");
    } catch (error) {
      console.error("Failed to create employee:", error);
      toast.error("Error adding employee");
    }
  };

  const handleUpdateStatus = async (
    id: string,
    currentStatus: EmployeeStatus,
  ) => {
    const employee = employees.find((e) => e.id === id);
    if (!employee) return;

    try {
      await updateEmployee(id, {
        name: employee.name,
        role: employee.role,
        daily_rate_per_block: employee.daily_rate_per_block,
        status: currentStatus === "active" ? "inactive" : "active",
        specialisation: employee.specialisation,
      });
      fetchEmployees();
      toast.success(
        `Employee status updated to ${employee.status === "active" ? "inactive" : "active"}`,
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleUpdateRate = async (id: string, newRate: number) => {
    const employee = employees.find((e) => e.id === id);
    if (!employee) return;

    try {
      await updateEmployee(id, {
        name: employee.name,
        role: employee.role,
        daily_rate_per_block: newRate,
        status: employee.status,
        specialisation: employee.specialisation,
      });
      fetchEmployees();
    } catch (error) {
      console.error("Failed to update rate:", error);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    return role === "Manager"
      ? "bg-purple-100 text-purple-800"
      : "bg-blue-100 text-blue-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button
              onClick={() => navigate("/supervisor")}
              className="text-blue-600 hover:text-blue-800 mb-2 inline-block text-sm"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              Employee Management
            </h1>
            <p className="text-gray-600">
              Add and manage factory workers and rates
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5"
          >
            {showAddForm ? "Cancel" : "+ Add Employee"}
          </button>
        </div>

        {/* Add Employee Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-8 border-l-4 border-blue-500 animate-in slide-in-from-top duration-300">
            <h2 className="text-xl font-bold mb-4">New Employee Details</h2>
            <form
              onSubmit={handleAddEmployee}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newEmployee.name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newEmployee.role}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Supervisor">Supervisor</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Rate per Block
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newEmployee.daily_rate_per_block}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      daily_rate_per_block: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Specialisation (Optional)
                </label>
                <select
                  value={newEmployee.specialisation}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      specialisation: e.target.value as BlockType,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  <option value="solid-5inch">Solid 5"</option>
                  <option value="solid-6inch">Solid 6"</option>
                  <option value="hollow-5inch">Hollow 5"</option>
                  <option value="hollow-6inch">Hollow 6"</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2 px-8 rounded-lg transition-all duration-200 shadow-lg shadow-green-900/20 hover:shadow-green-900/40 hover:-translate-y-0.5"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === "active" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === "inactive" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Inactive
            </button>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-16 bg-gray-200 rounded-xl mb-4"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Role & Spec
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Monthly Production
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Est. Salary
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className={emp.status === "inactive" ? "bg-gray-50" : ""}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {emp.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Added {formatDate(emp.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(emp.role)}`}
                        >
                          {emp.role}
                        </span>
                        {emp.specialisation && (
                          <div className="text-xs mt-1 text-gray-600 font-medium">
                            ✨ {emp.specialisation}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold">
                            {formatCurrency(emp.daily_rate_per_block)}
                          </span>
                          <button
                            onClick={() => {
                              const newRate = prompt(
                                "Enter new rate per block:",
                                emp.daily_rate_per_block,
                              );
                              if (newRate !== null)
                                handleUpdateRate(emp.id, parseFloat(newRate));
                            }}
                            className="text-gray-400 hover:text-blue-600 text-xs"
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-800">
                          {emp.total_blocks_month.toLocaleString()} blocks
                        </div>
                      </td>
                      <td className="px-6 py-4 text-green-700 font-bold">
                        {formatCurrency(emp.projected_salary_month)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleUpdateStatus(emp.id, emp.status)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition ${emp.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-red-100 text-red-800 hover:bg-red-200"}`}
                        >
                          {emp.status.toUpperCase()}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-gray-600 text-sm">
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className={`bg-white p-5 rounded-xl shadow-sm border ${emp.status === "inactive" ? "opacity-75 grayscale" : "border-blue-50"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{emp.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRoleBadgeColor(emp.role)}`}
                        >
                          {emp.role}
                        </span>
                        {emp.status === "inactive" && (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Rate / Block</div>
                      <div className="font-bold text-blue-600">
                        {formatCurrency(emp.daily_rate_per_block)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 my-4">
                    <div>
                      <div className="text-[10px] uppercase text-gray-500 font-bold">
                        Total Blocks
                      </div>
                      <div className="font-bold">
                        {emp.total_blocks_month.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500 font-bold">
                        Projected Salary
                      </div>
                      <div className="font-bold text-green-600">
                        {formatCurrency(emp.projected_salary_month)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(emp.id, emp.status)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold ${emp.status === "active" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}
                    >
                      {emp.status === "active" ? "Deactivate" : "Reactivate"}
                    </button>
                    <button
                      onClick={() => {
                        const newRate = prompt(
                          "Enter new rate:",
                          emp.daily_rate_per_block,
                        );
                        if (newRate !== null)
                          handleUpdateRate(emp.id, parseFloat(newRate));
                      }}
                      className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg text-xs font-bold"
                    >
                      Edit Rate
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-bold text-gray-800">
                  No employees found
                </h3>
                <p className="text-gray-500 mb-6">
                  Start by adding your factory workers
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5"
                >
                  + Add Your First Employee
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
