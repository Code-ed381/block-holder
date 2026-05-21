/**
 * Salary Approval Page
 * Manager can review and approve salary batches with production log cross-reference
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../components/Navigation";
import {
  getSalaryBatches,
  getSalaryBatch,
  approveSalaryBatch,
  confirmSalaryPayment,
  approveSalaryRecord,
  rejectSalaryRecord,
  getProductionLogs,
} from "../utils/db";
const toISODate = (date: Date): string => date.toISOString().split("T")[0];

const getPeriodDateRange = (
  period: string,
): { startDate: string; endDate: string } | null => {
  if (period.includes("-W")) {
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

const getDaysInPeriod = (period: string): number => {
  if (period.includes("-W")) return 7;
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 0;
  return new Date(year, month, 0).getDate();
};

export const SalaryApproval: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState<{
    recordId: string;
    note: string;
  } | null>(null);
  const [viewRecordModal, setViewRecordModal] = useState<any>(null);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);

  useEffect(() => {
    loadPendingBatches();
    loadProductionLogs();
  }, []);

  const loadPendingBatches = async () => {
    try {
      const data = await getSalaryBatches("pending");
      setBatches(data);
    } catch (error) {
      console.error("Failed to load batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductionLogs = async () => {
    try {
      const data = await getProductionLogs();
      setProductionLogs(data);
    } catch (error) {
      console.error("Failed to load production logs:", error);
    }
  };

  const handleSelectBatch = async (batchId: string) => {
    try {
      const data = await getSalaryBatch(batchId);
      setSelectedBatch(data);
    } catch (error) {
      console.error("Failed to load batch details:", error);
    }
  };

  const handleApproveAll = async () => {
    if (!selectedBatch) return;
    try {
      await approveSalaryBatch(selectedBatch.batch.id, "Manager");
      await loadPendingBatches();
      setSelectedBatch(null);
    } catch (error) {
      console.error("Failed to approve batch:", error);
    }
  };

  const handleApproveRecord = async (recordId: string) => {
    try {
      await approveSalaryRecord(recordId);
      if (selectedBatch) {
        const data = await getSalaryBatch(selectedBatch.batch.id);
        setSelectedBatch(data);
      }
    } catch (error) {
      console.error("Failed to approve record:", error);
    }
  };

  const handleRejectRecord = async () => {
    if (!rejectDialog) return;
    try {
      await rejectSalaryRecord(rejectDialog.recordId, rejectDialog.note);
      setRejectDialog(null);
      if (selectedBatch) {
        const data = await getSalaryBatch(selectedBatch.batch.id);
        setSelectedBatch(data);
      }
    } catch (error) {
      console.error("Failed to reject record:", error);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedBatch) return;
    try {
      await confirmSalaryPayment(selectedBatch.batch.id, "Manager");
      await loadPendingBatches();
      setSelectedBatch(null);
    } catch (error) {
      console.error("Failed to confirm payment:", error);
    }
  };

  const getBlocksLogged = (employeeId: string, period: string): number => {
    const range = getPeriodDateRange(period);
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

  const isManagerRecord = (record: any): boolean =>
    record.employee_role === "Manager";

  const getActivityBilled = (record: any): number => {
    if (isManagerRecord(record)) return record.days_billed || getDaysInPeriod(record.period);
    return record.blocks_total;
  };

  const getActivityLogged = (record: any): number => {
    if (isManagerRecord(record)) return getDaysInPeriod(record.period);
    return getBlocksLogged(record.employee_id, record.period);
  };

  const hasMismatch = (record: any): boolean => {
    if (isManagerRecord(record)) return false;
    const logged = getBlocksLogged(record.employee_id, record.period);
    return logged !== record.blocks_total;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p>Loading...</p>
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
            onClick={() => navigate("/manager")}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Salary Approval
          </h1>
          <p className="text-gray-600">
            Review and approve pending salary disbursement requests
          </p>
        </div>

        {!selectedBatch ? (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Pending Batches ({batches.length})
              </h2>
            </div>
            {batches.length === 0 ? (
              <div className="p-6 text-gray-500">
                No pending batches to review
              </div>
            ) : (
              <div className="divide-y">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => handleSelectBatch(batch.id)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {batch.period_type === "week" ? "Week" : "Month"} of{" "}
                        {batch.period}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Submitted by {batch.submitted_by} on{" "}
                        {new Date(
                          batch.submitted_at || batch.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-800">
                        ${batch.total_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {batch.total_blocks} blocks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Batch Summary Card */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedBatch.batch.period_type === "week"
                      ? "Week"
                      : "Month"}{" "}
                    of {selectedBatch.batch.period}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Submitted by {selectedBatch.batch.submitted_by} on{" "}
                    {new Date(
                      selectedBatch.batch.submitted_at ||
                        selectedBatch.batch.created_at,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Payout</p>
                  <p className="text-2xl font-bold text-blue-800">
                    ${selectedBatch.batch.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Blocks</p>
                  <p className="text-2xl font-bold text-green-800">
                    {selectedBatch.batch.total_blocks}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Records</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {selectedBatch.records.length}
                  </p>
                </div>
              </div>

              {/* Audit Trail */}
              <div className="p-6 bg-gray-50 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Audit Trail
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    Created:{" "}
                    {new Date(selectedBatch.batch.created_at).toLocaleString()}
                  </p>
                  {selectedBatch.batch.approved_by && (
                    <p>
                      Approved by {selectedBatch.batch.approved_by} on{" "}
                      {new Date(
                        selectedBatch.batch.approved_at!,
                      ).toLocaleString()}
                    </p>
                  )}
                  {selectedBatch.batch.paid_by && (
                    <p>
                      Paid by {selectedBatch.batch.paid_by} on{" "}
                      {new Date(selectedBatch.batch.paid_at!).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Salary Records Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  Salary Breakdown
                </h2>
                {selectedBatch.batch.status === "pending" && (
                  <button
                    onClick={handleApproveAll}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Approve All
                  </button>
                )}
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
                        Activity Billed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Activity Logged
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Calculated Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedBatch.records.map((record: any) => {
                      const isManager = isManagerRecord(record);
                      const activityBilled = getActivityBilled(record);
                      const activityLogged = getActivityLogged(record);
                      const mismatch = hasMismatch(record);
                      return (
                        <tr
                          key={record.id}
                          className={
                            mismatch ? "bg-red-50" : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {record.employee_name}
                            </div>
                            {record.rejection_note && (
                              <div className="text-sm text-red-600 mt-1">
                                Note: {record.rejection_note}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            ${record.rate?.toFixed(2)}{" "}
                            {isManager ? "per day" : "per block"}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {activityBilled} {isManager ? "days" : "blocks"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={
                                mismatch
                                  ? "text-red-600 font-medium"
                                  : "text-gray-900"
                              }
                            >
                              {activityLogged} {isManager ? "days" : "blocks"}
                            </span>
                            {mismatch && (
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Mismatch
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            ${record.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                record.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setViewRecordModal(record)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirm Payment Button */}
            {selectedBatch.batch.status === "approved" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Ready for Payment
                    </h3>
                    <p className="text-gray-600">
                      All records have been approved. Confirm payment to
                      complete the batch.
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmPayment}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reject Dialog */}
        {rejectDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Reject Salary Record
              </h3>
              <textarea
                className="w-full border rounded-lg p-3 mb-4"
                rows={3}
                placeholder="Enter rejection note..."
                value={rejectDialog.note}
                onChange={(e) =>
                  setRejectDialog({ ...rejectDialog, note: e.target.value })
                }
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setRejectDialog(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectRecord}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Record Modal */}
        {viewRecordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  Salary Record Details
                </h3>
                <button
                  onClick={() => setViewRecordModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Employee Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Employee Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium text-gray-900">
                        {viewRecordModal.employee_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="font-medium text-gray-900">
                        {viewRecordModal.employee_role || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Salary Calculation */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Salary Calculation
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {isManagerRecord(viewRecordModal) ? "Daily Rate" : "Rate per Block"}
                      </span>
                      <span className="font-medium">
                        ${viewRecordModal.rate?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {isManagerRecord(viewRecordModal) ? "Days Billed" : "Blocks Billed"}
                      </span>
                      <span className="font-medium">
                        {isManagerRecord(viewRecordModal) ? viewRecordModal.days_billed : viewRecordModal.blocks_total}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-gray-600 font-medium">
                        Total Amount
                      </span>
                      <span className="font-bold text-lg text-blue-800">
                        ${viewRecordModal.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Production Logs */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Production Logs ({viewRecordModal.period})
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Blocks Logged</span>
                      <span className="font-medium">
                        {getBlocksLogged(
                          viewRecordModal.employee_id,
                          viewRecordModal.period,
                        )}
                      </span>
                    </div>
                    {hasMismatch(viewRecordModal) && (
                      <div className="bg-red-100 p-2 rounded text-red-800 text-sm">
                        ⚠️ Mismatch: Billed {viewRecordModal.blocks_total} vs
                        Logged{" "}
                        {getBlocksLogged(
                          viewRecordModal.employee_id,
                          viewRecordModal.period,
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {selectedBatch?.batch.status === "pending" &&
                  viewRecordModal.status === "pending" && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => {
                          handleApproveRecord(viewRecordModal.id);
                          setViewRecordModal(null);
                        }}
                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectDialog({
                            recordId: viewRecordModal.id,
                            note: "",
                          });
                          setViewRecordModal(null);
                        }}
                        className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
