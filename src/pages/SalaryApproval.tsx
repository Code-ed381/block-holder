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

export const SalaryApproval: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState<{
    recordId: string;
    note: string;
  } | null>(null);
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
    return productionLogs
      .filter(
        (log) => log.employee_id === employeeId && log.date.startsWith(period),
      )
      .reduce((sum, log) => sum + log.quantity_produced, 0);
  };

  const hasMismatch = (record: any): boolean => {
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
                        Rate/Block
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Blocks Billed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Blocks Logged
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
                      const blocksLogged = getBlocksLogged(
                        record.employee_id,
                        record.period,
                      );
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
                            ${record.daily_rate_per_block?.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {record.blocks_total}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={
                                mismatch
                                  ? "text-red-600 font-medium"
                                  : "text-gray-900"
                              }
                            >
                              {blocksLogged}
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
                            {selectedBatch.batch.status === "pending" &&
                              record.status === "pending" && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() =>
                                      handleApproveRecord(record.id)
                                    }
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      setRejectDialog({
                                        recordId: record.id,
                                        note: "",
                                      })
                                    }
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
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
      </div>
    </div>
  );
};
