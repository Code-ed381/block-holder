/**
 * Salary Batch Submission Page
 * Supervisor can create and submit salary batches for manager approval
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import {
  getEmployees,
  getProductionLogs,
  createSalaryBatch,
} from "../utils/db";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../utils/config";

export const SalaryBatchSubmission: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [periodType, setPeriodType] = useState<"week" | "month">("month");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return now.toISOString().substring(0, 7); // YYYY-MM
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [empData, logData] = await Promise.all([
        getEmployees(),
        getProductionLogs(),
      ]);
      setEmployees(empData);
      setProductionLogs(logData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeProduction = (employeeId: string): number => {
    return productionLogs
      .filter(
        (log) => log.employee_id === employeeId && log.date.startsWith(period),
      )
      .reduce((sum, log) => sum + log.quantity_produced, 0);
  };

  const calculateSalary = (blocks: number, rate: number): number => {
    return blocks * rate;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const employeeRecords = employees
        .filter((emp) => getEmployeeProduction(emp.id) > 0)
        .map((emp) => ({
          employee_id: emp.id,
          blocks_total: getEmployeeProduction(emp.id),
          amount: calculateSalary(
            getEmployeeProduction(emp.id),
            emp.daily_rate_per_block,
          ),
        }));

      if (employeeRecords.length === 0) {
        toast.error("No production data found for the selected period");
        return;
      }

      await createSalaryBatch({
        period,
        period_type: periodType,
        submitted_by: "Supervisor",
        employee_records: employeeRecords,
      });

      toast.success("Salary batch submitted successfully!");
      navigate("/supervisor");
    } catch (error) {
      console.error("Failed to submit batch:", error);
      toast.error("Failed to submit batch. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = employees.reduce((sum, emp) => {
    return (
      sum +
      calculateSalary(getEmployeeProduction(emp.id), emp.daily_rate_per_block)
    );
  }, 0);

  const totalBlocks = employees.reduce((sum, emp) => {
    return sum + getEmployeeProduction(emp.id);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
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
        <div className="mb-6">
          <button
            onClick={() => navigate("/supervisor")}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Submit Salary Batch
          </h1>
          <p className="text-gray-600">
            Create and submit salary batch for manager approval
          </p>
        </div>

        {/* Period Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Type
              </label>
              <select
                value={periodType}
                onChange={(e) =>
                  setPeriodType(e.target.value as "week" | "month")
                }
                className="w-full border rounded-lg px-4 py-2"
              >
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <input
                type={periodType === "month" ? "month" : "week"}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Payout</p>
              <p className="text-2xl font-bold text-blue-800">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Blocks</p>
              <p className="text-2xl font-bold text-green-800">{totalBlocks}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Employees</p>
              <p className="text-2xl font-bold text-purple-800">
                {
                  employees.filter((emp) => getEmployeeProduction(emp.id) > 0)
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        {/* Employee Breakdown Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              Employee Salary Breakdown
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rate/Block
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Blocks Produced
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Calculated Salary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees
                  .filter((emp) => getEmployeeProduction(emp.id) > 0)
                  .map((emp) => {
                    const blocks = getEmployeeProduction(emp.id);
                    const salary = calculateSalary(
                      blocks,
                      emp.daily_rate_per_block,
                    );
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {emp.name}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatCurrency(emp.daily_rate_per_block)}
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          {blocks}
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          {formatCurrency(salary)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {employees.filter((emp) => getEmployeeProduction(emp.id) > 0)
            .length === 0 && (
            <div className="py-16 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No Production Data</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                There are no production logs recorded for the selected period. 
                Ask supervisors to log their production before creating a salary batch.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || totalBlocks === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
};
