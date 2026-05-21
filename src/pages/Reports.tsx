import React, { useState, useEffect } from "react";
import { Navigation } from "../components/Navigation";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate } from "../utils/config";
import { supabase } from "../lib/supabase";
import "./Reports.css";

type ReportType = "production" | "inventory" | "payroll" | "ceo";

interface SummaryData {
  productionLogs: any[];
  inventoryLogs: any[];
  currentInventory: any;
  employees: any[];
  salaryRecords: any[];
  openingStock: { cement: number; dust: number };
  meta: { startDate: string; endDate: string };
}

export const Reports: React.FC = () => {
  const toast = useToast();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [reportType, setReportType] = useState<ReportType>("production");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query production logs with employee names
      const { data: productionLogs, error: productionError } = await supabase
        .from("production_logs")
        .select(
          `
          *,
          employees(name, rate)
        `,
        )
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (productionError) throw productionError;

      // Query inventory logs for the period
      const { data: inventoryLogs, error: inventoryError } = await supabase
        .from("inventory_logs")
        .select("*")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .order("created_at", { ascending: true });

      if (inventoryError) throw inventoryError;

      // Get current inventory
      const { data: currentInventory, error: inventoryFetchError } =
        await supabase.from("inventory").select("*").limit(1).single();

      if (inventoryFetchError && inventoryFetchError.code !== "PGRST116") {
        throw inventoryFetchError;
      }

      // Get employees
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .order("name");

      if (employeesError) throw employeesError;

      // Query salary records for the period
      const { data: salaryRecords, error: salaryError } = await supabase
        .from("salary_records")
        .select(
          `
          *,
          employees(name, rate)
        `,
        )
        .gte("period", startDate)
        .lte("period", endDate)
        .order("period", { ascending: true });

      if (salaryError) throw salaryError;

      // Calculate opening stock (inventory before start date)
      const { data: previousLogs } = await supabase
        .from("inventory_logs")
        .select("*")
        .lt("created_at", `${startDate}T00:00:00`)
        .order("created_at", { ascending: false });

      let openingCement = 0;
      let openingDust = 0;

      if (previousLogs && previousLogs.length > 0) {
        // Calculate from inventory logs
        previousLogs.forEach((log: any) => {
          if (log.type === "cement") openingCement += log.quantity;
          if (log.type === "dust") openingDust += log.quantity;
        });
      }

      // Transform data to match expected format
      const transformedSalaryRecords =
        salaryRecords?.map((rec: any) => ({
          ...rec,
          employee_name: rec.employees?.name,
          rate: rec.employees?.rate,
        })) || [];

      const transformedProductionLogs =
        productionLogs?.map((log: any) => ({
          ...log,
          employee_name: log.employees?.name,
        })) || [];

      setData({
        productionLogs: transformedProductionLogs,
        inventoryLogs: inventoryLogs || [],
        currentInventory: currentInventory || {
          cement_bags_current: 0,
          quarry_dust_m3_current: 0,
        },
        employees: employees || [],
        salaryRecords: transformedSalaryRecords,
        openingStock: {
          cement: openingCement,
          dust: openingDust,
        },
        meta: {
          startDate,
          endDate,
        },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "";
    let fileName = `report_${reportType}_${startDate}_to_${endDate}.csv`;

    if (reportType === "production") {
      csvContent = "Date,Employee,Block Type,Quantity,Cement Used,Dust Used\n";
      data.productionLogs.forEach((log) => {
        csvContent += `${log.date},${log.employee_name},${log.block_type},${log.quantity_produced},${log.cement_bags_used},${log.quarry_dust_m3_used}\n`;
      });
    } else if (reportType === "inventory") {
      csvContent = "Item,Opening Stock,Consumed,Restocked,Closing Stock\n";
      const cementRestocked = data.inventoryLogs
        .filter((l) => l.type === "cement")
        .reduce((sum, l) => sum + l.quantity, 0);
      const cementConsumed = data.productionLogs.reduce(
        (sum, l) => sum + l.cement_bags_used,
        0,
      );
      const dustRestocked = data.inventoryLogs
        .filter((l) => l.type === "dust")
        .reduce((sum, l) => sum + l.quantity, 0);
      const dustConsumed = data.productionLogs.reduce(
        (sum, l) => sum + l.quarry_dust_m3_used,
        0,
      );

      csvContent += `Cement Bags,${data.openingStock.cement},${cementConsumed},${cementRestocked},${data.openingStock.cement - cementConsumed + cementRestocked}\n`;
      csvContent += `Quarry Dust (m3),${data.openingStock.dust},${dustConsumed},${dustRestocked},${data.openingStock.dust - dustConsumed + dustRestocked}\n`;
    } else if (reportType === "payroll") {
      csvContent = "Employee,Period,Blocks Produced,Salary Amount,Status\n";
      data.salaryRecords.forEach((rec) => {
        csvContent += `${rec.employee_name},${rec.period},${rec.blocks_total},${rec.amount},${rec.status}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export downloaded successfully");
  };

  // ─── Render Components ───────────────────────────────────────────────────────

  const renderProductionSummary = () => {
    if (!data) return null;

    // Grouping by type for summary

    return (
      <div>
        <h2 className="section-title">Production Summary Breakdown</h2>
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Block Type</th>
                <th>Quantity</th>
                <th>Materials (Cement/Dust)</th>
              </tr>
            </thead>
            <tbody>
              {data.productionLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.date)}</td>
                  <td>{log.employee_name}</td>
                  <td>{log.block_type}</td>
                  <td>{log.quantity_produced.toLocaleString()}</td>
                  <td>
                    {log.cement_bags_used} bags / {log.quarry_dust_m3_used}m³
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    if (!data) return null;

    const cementRestocked = data.inventoryLogs
      .filter((l) => l.type === "cement")
      .reduce((sum, l) => sum + l.quantity, 0);
    const cementConsumed = data.productionLogs.reduce(
      (sum, l) => sum + l.cement_bags_used,
      0,
    );
    const dustRestocked = data.inventoryLogs
      .filter((l) => l.type === "dust")
      .reduce((sum, l) => sum + l.quantity, 0);
    const dustConsumed = data.productionLogs.reduce(
      (sum, l) => sum + l.quarry_dust_m3_used,
      0,
    );

    return (
      <div>
        <h2 className="section-title">Material Inventory Report</h2>
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Opening Stock</th>
                <th>Consumed (−)</th>
                <th>Restocked (+)</th>
                <th>Closing Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Cement Bags</strong>
                </td>
                <td>{data.openingStock.cement}</td>
                <td style={{ color: "#dc2626" }}>-{cementConsumed}</td>
                <td style={{ color: "#16a34a" }}>+{cementRestocked}</td>
                <td>
                  <strong>
                    {data.openingStock.cement -
                      cementConsumed +
                      cementRestocked}
                  </strong>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Quarry Dust (m³)</strong>
                </td>
                <td>{data.openingStock.dust.toFixed(2)}</td>
                <td style={{ color: "#dc2626" }}>-{dustConsumed.toFixed(2)}</td>
                <td style={{ color: "#16a34a" }}>
                  +{dustRestocked.toFixed(2)}
                </td>
                <td>
                  <strong>
                    {(
                      data.openingStock.dust -
                      dustConsumed +
                      dustRestocked
                    ).toFixed(2)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3
          className="section-title"
          style={{ fontSize: "1rem", marginTop: "3rem" }}
        >
          Recent Inventory Transactions
        </h3>
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {data.inventoryLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>{log.type.toUpperCase()}</td>
                  <td>{log.quantity}</td>
                  <td>{log.note || "-"}</td>
                </tr>
              ))}
              {data.inventoryLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    No inventory logs for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPayrollReport = () => {
    if (!data) return null;
    return (
      <div>
        <h2 className="section-title">Payroll & Salary Records</h2>
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Blocks Produced</th>
                <th>Rate</th>
                <th>Total Salary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.salaryRecords.map((rec) => (
                <tr key={rec.id}>
                  <td>
                    <strong>{rec.employee_name}</strong>
                  </td>
                  <td>{rec.period}</td>
                  <td>{rec.blocks_total.toLocaleString()}</td>
                  <td>{formatCurrency(rec.rate)}</td>
                  <td>
                    <strong>{formatCurrency(rec.amount)}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge badge-${rec.status === "paid" ? "success" : rec.status === "approved" ? "warning" : "danger"}`}
                    >
                      {rec.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {data.salaryRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    No payroll records for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCEOOverview = () => {
    if (!data) return null;

    const totalBlocks = data.productionLogs.reduce(
      (sum, l) => sum + l.quantity_produced,
      0,
    );
    const cementUsed = data.productionLogs.reduce(
      (sum, l) => sum + l.cement_bags_used,
      0,
    );
    const dustUsed = data.productionLogs.reduce(
      (sum, l) => sum + l.quarry_dust_m3_used,
      0,
    );
    const totalPayroll = data.salaryRecords.reduce(
      (sum, l) => sum + l.amount,
      0,
    );

    // Grouping for top employees
    const empPerformance = data.productionLogs.reduce((acc: any, log) => {
      acc[log.employee_name] =
        (acc[log.employee_name] || 0) + log.quantity_produced;
      return acc;
    }, {});
    const topEmployees = Object.entries(empPerformance)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5);

    const blockTypeBreakdown = data.productionLogs.reduce((acc: any, log) => {
      acc[log.block_type] = (acc[log.block_type] || 0) + log.quantity_produced;
      return acc;
    }, {});

    return (
      <div className="ceo-overview">
        <header className="ceo-header">
          <h2>Factory Executive Summary</h2>
          <div className="ceo-meta">
            <span>
              Period: {formatDate(startDate)} to {formatDate(endDate)}
            </span>
            <span>Generated: {formatDate(new Date().toISOString())}</span>
          </div>
        </header>

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Blocks Produced</div>
            <div className="kpi-value" style={{ color: "#2563eb" }}>
              {totalBlocks.toLocaleString()}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Cement Used (Bags)</div>
            <div className="kpi-value" style={{ color: "#64748b" }}>
              {cementUsed.toLocaleString()}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Quarry Dust Used (m³)</div>
            <div className="kpi-value" style={{ color: "#64748b" }}>
              {dustUsed.toFixed(1)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total Payroll Obligation</div>
            <div className="kpi-value" style={{ color: "#16a34a" }}>
              {formatCurrency(totalPayroll)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
          }}
        >
          <div>
            <h3 className="section-title">Block Type Distribution</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Block Type</th>
                  <th>Total Output</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(blockTypeBreakdown).map(([type, qty]: any) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{qty.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="section-title">Top Performers (by Quantity)</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Blocks Produced</th>
                </tr>
              </thead>
              <tbody>
                {topEmployees.map(([name, qty]: any) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{qty.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h3 className="section-title">Resource & Payroll Status</h3>
          <div
            className="kpi-grid"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <div className="kpi-card" style={{ background: "#fff" }}>
              <div className="kpi-label">Current Inventory Status</div>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#4b5563",
                  marginTop: "0.5rem",
                }}
              >
                Cement:{" "}
                <strong>
                  {data.currentInventory.cement_bags_current} bags
                </strong>{" "}
                <br />
                Quarry Dust:{" "}
                <strong>
                  {data.currentInventory.quarry_dust_m3_current.toFixed(1)} m³
                </strong>
              </p>
            </div>
            <div className="kpi-card" style={{ background: "#fff" }}>
              <div className="kpi-label">Payroll Summary</div>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#4b5563",
                  marginTop: "0.5rem",
                }}
              >
                Total Pending:{" "}
                <strong>
                  {formatCurrency(
                    data.salaryRecords
                      .filter((r) => r.status === "pending")
                      .reduce((sum, r) => sum + r.amount, 0),
                  )}
                </strong>{" "}
                <br />
                Total Paid:{" "}
                <strong>
                  {formatCurrency(
                    data.salaryRecords
                      .filter((r) => r.status === "paid")
                      .reduce((sum, r) => sum + r.amount, 0),
                  )}
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="reports-container">
        <header className="reports-header no-print">
          <div>
            <h1>Reports & Export</h1>
            <p className="text-gray-600">
              Select parameters to generate business intelligence reports.
            </p>
          </div>
          <div className="flex gap-4">
            <button className="secondary-btn" onClick={handleExportCSV}>
              Export CSV
            </button>
            {reportType === "ceo" && (
              <button className="primary-btn" onClick={handlePrint}>
                Print PDF
              </button>
            )}
          </div>
        </header>

        <section className="controls-card no-print">
          <div className="control-group">
            <label>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              <option value="production">Production Summary</option>
              <option value="inventory">Inventory Report</option>
              <option value="payroll">Payroll Report</option>
              <option value="ceo">CEO Overview</option>
            </select>
          </div>
          <div className="control-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="control-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            className="primary-btn"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </section>

        <main className="report-content">
          {error && (
            <div className="p-4 bg-red-100 text-red-800 rounded-lg mb-4">
              {error}
            </div>
          )}

          {!data && !loading && (
            <div className="text-center text-gray-500 py-20">
              Click 'Generate Report' to load data.
            </div>
          )}

          {data && (
            <>
              {reportType === "production" && renderProductionSummary()}
              {reportType === "inventory" && renderInventoryReport()}
              {reportType === "payroll" && renderPayrollReport()}
              {reportType === "ceo" && renderCEOOverview()}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
