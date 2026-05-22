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
  getSpecializationConfigs,
  getProductionSettings,
} from "../utils/db";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../utils/config";
import type { SpecializationConfig, ProductionSettings } from "../types";

type PeriodType = "week" | "month";

const toISODate = (date: Date): string => date.toISOString().split("T")[0];

const getCurrentWeekValue = (): string => {
  const today = new Date();
  const utcDate = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

const getPeriodDateRange = (
  period: string,
  periodType: PeriodType,
): { startDate: string; endDate: string } | null => {
  if (periodType === "week") {
    const [yearStr, weekStr] = period.split("-W");
    const year = Number(yearStr);
    const week = Number(weekStr);
    if (!year || !week) return null;

    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const weekOneMonday = new Date(jan4);
    weekOneMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

    const weekStart = new Date(weekOneMonday);
    weekStart.setUTCDate(weekOneMonday.getUTCDate() + (week - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    return {
      startDate: toISODate(weekStart),
      endDate: toISODate(weekEnd),
    };
  }

  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return null;

  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    startDate: `${yearStr}-${monthStr}-01`,
    endDate: `${yearStr}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`,
  };
};

const getDaysInPeriod = (period: string, periodType: PeriodType): number => {
  if (periodType === "week") return 7;
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 0;
  return new Date(year, month, 0).getDate();
};

export const SalaryBatchSubmission: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return now.toISOString().substring(0, 7);
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [specConfigs, setSpecConfigs] = useState<SpecializationConfig[]>([]);
  const [prodSettings, setProdSettings] = useState<ProductionSettings | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPeriod(
      periodType === "month"
        ? new Date().toISOString().substring(0, 7)
        : getCurrentWeekValue(),
    );
  }, [periodType]);

  const loadData = async () => {
    try {
      const [empData, logData, specData, settingsData] = await Promise.all([
        getEmployees(),
        getProductionLogs(),
        getSpecializationConfigs(),
        getProductionSettings(),
      ]);
      setEmployees(empData);
      setProductionLogs(logData);
      setSpecConfigs(specData as SpecializationConfig[]);
      setProdSettings(settingsData as ProductionSettings);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeProduction = (employeeId: string): number => {
    const range = getPeriodDateRange(period, periodType);
    if (!range) return 0;
    return productionLogs
      .filter(
        (log) =>
          log.employee_id === employeeId &&
          log.date >= range.startDate &&
          log.date <= range.endDate,
      )
      .reduce((sum, log) => sum + log.quantity_produced, 0);
  };

  const daysInPeriod = getDaysInPeriod(period, periodType);

  const range = getPeriodDateRange(period, periodType);

  const specMap = new Map(specConfigs.map((s) => [s.specialization, s]));
  const builderSpecs = new Set(["mixer", "operator", "palletizer"]);

  // Get logs for the period
  const periodLogs = range
    ? productionLogs.filter(
        (log) => log.date >= range.startDate && log.date <= range.endDate,
      )
    : [];

  // Group builder logs by date for bonus calculation
  const builderLogsByDate: Record<string, { totalBlocks: number; builderIds: Set<string> }> = {};
  // Track which days each builder worked
  const builderDaysByEmployee: Record<string, Set<string>> = {};

  // First, identify all employees with builder specializations
  const builderEmployeeIds = new Set(
    employees
      .filter(
        (emp) =>
          emp.specialisation && builderSpecs.has(emp.specialisation),
      )
      .map((emp) => emp.id),
  );

  periodLogs.forEach((log) => {
    if (!builderEmployeeIds.has(log.employee_id)) return;

    if (!builderLogsByDate[log.date]) {
      builderLogsByDate[log.date] = { totalBlocks: 0, builderIds: new Set() };
    }
    builderLogsByDate[log.date].totalBlocks += log.quantity_produced || 0;
    builderLogsByDate[log.date].builderIds.add(log.employee_id);

    if (!builderDaysByEmployee[log.employee_id]) {
      builderDaysByEmployee[log.employee_id] = new Set();
    }
    builderDaysByEmployee[log.employee_id].add(log.date);
  });

  // Calculate bonus per builder per day
  const builderBonusByEmployee: Record<string, number> = {};
  const blocksPerBonus = prodSettings?.blocks_per_bonus || 40;
  const bonusAmount = prodSettings?.bonus_amount || 30;

  Object.entries(builderLogsByDate).forEach(([, data]) => {
    const batches = Math.floor(data.totalBlocks / blocksPerBonus);
    const dailyBonus = batches * bonusAmount;
    const builderCount = data.builderIds.size;
    if (builderCount > 0 && dailyBonus > 0) {
      const share = dailyBonus / builderCount;
      data.builderIds.forEach((bId) => {
        builderBonusByEmployee[bId] = (builderBonusByEmployee[bId] || 0) + share;
      });
    }
  });

  const salaryBreakdown = employees
    .filter((emp) => emp.status === "active")
    .map((emp) => {
      const isManager = emp.role === "Manager";
      const blocks = getEmployeeProduction(emp.id);
      const spec = emp.specialisation ? specMap.get(emp.specialisation) : null;

      let amount = 0;
      let activityQuantity = 0;
      let breakdownLabel = "";

      if (isManager) {
        amount = emp.rate * daysInPeriod;
        activityQuantity = daysInPeriod;
        breakdownLabel = `${formatCurrency(emp.rate)}/day × ${daysInPeriod} days`;
      } else if (spec && builderSpecs.has(emp.specialisation)) {
        const empDays = builderDaysByEmployee[emp.id]?.size || 0;
        const dailyPay = empDays * spec.daily_rate;
        const bonusShare = builderBonusByEmployee[emp.id] || 0;
        amount = dailyPay + bonusShare;
        activityQuantity = empDays;
        breakdownLabel = `${formatCurrency(spec.daily_rate)}/day × ${empDays} days + bonus ${formatCurrency(bonusShare)}`;
      } else if (spec && spec.per_block_rate > 0) {
        amount = blocks * spec.per_block_rate;
        activityQuantity = blocks;
        breakdownLabel = `${formatCurrency(spec.per_block_rate)}/block × ${blocks} blocks`;
      } else {
        amount = blocks * emp.rate;
        activityQuantity = blocks;
        breakdownLabel = `${formatCurrency(emp.rate)}/block × ${blocks} blocks`;
      }

      return {
        ...emp,
        spec,
        isManager,
        blocks,
        amount,
        activityQuantity,
        breakdownLabel,
        isBuilder: spec ? builderSpecs.has(emp.specialisation) : false,
      };
    })
    .filter((emp) => emp.isManager || emp.amount > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const employeeRecords = salaryBreakdown.map((emp) => ({
        employee_id: emp.id,
        blocks_total: emp.isManager || emp.isBuilder ? 0 : emp.blocks,
        days_billed: emp.isManager || emp.isBuilder ? emp.activityQuantity : 0,
        amount: emp.amount,
      }));

      if (employeeRecords.length === 0) {
        toast.error("No payable records found for the selected period");
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

  const totalAmount = salaryBreakdown.reduce((sum, emp) => sum + emp.amount, 0);
  const totalBlocks = salaryBreakdown.reduce((sum, emp) => sum + emp.blocks, 0);

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
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
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
                {salaryBreakdown.length}
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
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {periodType === "week" ? "Days/Blocks" : "Days/Blocks"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Calculated Salary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {salaryBreakdown.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {emp.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {emp.isManager
                        ? `${formatCurrency(emp.rate)}/day`
                        : emp.isBuilder
                          ? `${formatCurrency(emp.spec?.daily_rate || 0)}/day`
                          : `${formatCurrency(emp.spec?.per_block_rate || emp.rate)}/block`}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {emp.isManager || emp.isBuilder
                        ? `${emp.activityQuantity} days`
                        : `${emp.activityQuantity} blocks`}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      <div>{formatCurrency(emp.amount)}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{emp.breakdownLabel}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {salaryBreakdown.length === 0 && (
            <div className="py-16 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                No Payable Records
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                There are no active managers or production logs for the selected
                period. Update records before creating a salary batch.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || salaryBreakdown.length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
};