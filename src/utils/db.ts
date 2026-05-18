/**
 * API Client
 * Replaces the old in-browser sql.js database with fetch calls to the Express API server
 */

const API_BASE = "http://localhost:3001/api";

/**
 * Generic fetch helper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Production Configs ────────────────────────────────────────────────────────

export async function getProductionConfigs() {
  return apiFetch<ProductionConfigRow[]>("/production-configs");
}

export async function updateProductionConfig(
  id: string,
  data: {
    bags_per_batch: number;
    quarry_dust_m3_per_batch: number;
    blocks_per_batch: number;
  },
) {
  return apiFetch<ProductionConfigRow>(`/production-configs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function resetProductionConfigs() {
  return apiFetch<ProductionConfigRow[]>("/production-configs/reset", {
    method: "POST",
  });
}

// ─── Employees ─────────────────────────────────────────────────────────────────

export async function getEmployees() {
  return apiFetch<EmployeeRow[]>("/employees");
}

export async function getEmployee(id: string) {
  return apiFetch<EmployeeRow>(`/employees/${id}`);
}

export async function createEmployee(data: {
  name: string;
  role: string;
  daily_rate_per_block: number;
  status?: string;
  specialisation?: string;
}) {
  return apiFetch<EmployeeRow>("/employees", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEmployee(
  id: string,
  data: {
    name: string;
    role: string;
    daily_rate_per_block: number;
    status: string;
    specialisation?: string | null;
  },
) {
  return apiFetch<EmployeeRow>(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEmployee(id: string) {
  return apiFetch<void>(`/employees/${id}`, { method: "DELETE" });
}

// ─── Production Logs ───────────────────────────────────────────────────────────

export async function getProductionLogs() {
  return apiFetch<ProductionLogRow[]>("/production-logs");
}

export async function createProductionLog(data: {
  date: string;
  employee_id: string;
  block_type: string;
  quantity_produced: number;
  cement_bags_used: number;
  quarry_dust_m3_used: number;
}) {
  return apiFetch<ProductionLogRow>("/production-logs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteProductionLog(id: string) {
  return apiFetch<void>(`/production-logs/${id}`, { method: "DELETE" });
}

// ─── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventory() {
  return apiFetch<InventoryRow>("/inventory");
}

export async function updateInventoryThresholds(data: {
  cement_bags_threshold: number;
  quarry_dust_m3_threshold: number;
}) {
  return apiFetch<InventoryRow>("/inventory/thresholds", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function restockInventory(data: {
  type: "cement" | "dust";
  quantity: number;
  note?: string;
}) {
  return apiFetch<{ message: string }>("/inventory/restock", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getInventoryLogs() {
  return apiFetch<InventoryLogRow[]>("/inventory/logs");
}

export async function getInventoryConsumption() {
  return apiFetch<MaterialUsageRow[]>("/inventory/consumption");
}

export async function getProductionBreakdown() {
  return apiFetch<ProductionBreakdownRow[]>("/inventory/production-breakdown");
}

// ─── Salary Records ────────────────────────────────────────────────────────────

export async function getSalaryRecords() {
  return apiFetch<SalaryRecordRow[]>("/salary-records");
}

export async function createSalaryRecord(data: {
  employee_id: string;
  period: string;
  blocks_total: number;
  amount: number;
  status: string;
}) {
  return apiFetch<SalaryRecordRow>("/salary-records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSalaryRecord(
  id: string,
  data: { status: string; rejection_note?: string },
) {
  return apiFetch<SalaryRecordRow>(`/salary-records/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ─── Salary Batches ─────────────────────────────────────────────────────────────

export async function getSalaryBatches(status?: string) {
  const query = status ? `?status=${status}` : "";
  return apiFetch<SalaryBatchRow[]>(`/salary-batches${query}`);
}

export async function getSalaryBatch(id: string) {
  return apiFetch<{ batch: SalaryBatchRow; records: SalaryRecordRow[] }>(
    `/salary-batches/${id}`,
  );
}

export async function createSalaryBatch(data: {
  period: string;
  period_type: string;
  submitted_by: string;
  employee_records: Array<{
    employee_id: string;
    blocks_total: number;
    amount: number;
  }>;
}) {
  return apiFetch<SalaryBatchRow>("/salary-batches", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function approveSalaryBatch(id: string, approved_by: string) {
  return apiFetch<SalaryBatchRow>(`/salary-batches/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify({ approved_by }),
  });
}

export async function confirmSalaryPayment(id: string, paid_by: string) {
  return apiFetch<SalaryBatchRow>(`/salary-batches/${id}/confirm-payment`, {
    method: "PUT",
    body: JSON.stringify({ paid_by }),
  });
}

export async function approveSalaryRecord(recordId: string) {
  return apiFetch<SalaryRecordRow>(`/salary-records/${recordId}/approve`, {
    method: "PUT",
  });
}

export async function rejectSalaryRecord(
  recordId: string,
  rejection_note: string,
) {
  return apiFetch<SalaryRecordRow>(`/salary-records/${recordId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ rejection_note }),
  });
}

// ─── Row Types (matching the SQLite schema) ────────────────────────────────────

interface ProductionConfigRow {
  id: string;
  block_type: string;
  bags_per_batch: number;
  quarry_dust_m3_per_batch: number;
  blocks_per_batch: number;
}

interface EmployeeRow {
  id: string;
  name: string;
  role: string;
  daily_rate_per_block: number;
  status: string;
  specialisation: string | null;
  created_at: string;
  total_blocks_month: number;
  projected_salary_month: number;
}

interface ProductionLogRow {
  id: string;
  date: string;
  employee_id: string;
  block_type: string;
  quantity_produced: number;
  cement_bags_used: number;
  quarry_dust_m3_used: number;
  created_at: string;
}

interface InventoryRow {
  id: string;
  cement_bags_current: number;
  quarry_dust_m3_current: number;
  cement_bags_threshold: number;
  quarry_dust_m3_threshold: number;
  last_updated: string;
}

interface InventoryLogRow {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
}

interface MaterialUsageRow {
  date: string;
  cement: number;
  dust: number;
}

interface ProductionBreakdownRow {
  block_type: string;
  total: number;
}

interface SalaryRecordRow {
  id: string;
  employee_id: string;
  period: string;
  blocks_total: number;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  batch_id?: string;
  rejection_note?: string;
  employee_name?: string;
  daily_rate_per_block?: number;
}

interface SalaryBatchRow {
  id: string;
  period: string;
  period_type: string;
  status: string;
  total_amount: number;
  total_blocks: number;
  submitted_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  paid_by?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
