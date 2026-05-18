/**
 * Shared Data Models for Block Factory Management App
 * Define all entities used across the application
 */

// Block Types - Supported block sizes and styles
export type BlockType =
  | "solid-5inch"
  | "solid-6inch"
  | "hollow-5inch"
  | "hollow-6inch";

// Roles - User roles in the system
export type UserRole = "Supervisor" | "Manager";

// Production Config - Customizable batch settings per block type
export interface ProductionConfig {
  id: string;
  block_type: BlockType;
  bags_per_batch: number;
  quarry_dust_m3_per_batch: number;
  blocks_per_batch: number;
}

export type EmployeeStatus = "active" | "inactive";

// Employee - Worker in the factory
export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  daily_rate_per_block: number; // Rate paid per block produced
  status: EmployeeStatus;
  specialisation?: BlockType;
  created_at: string;
}

// Production Log - Record of daily production
export interface ProductionLog {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  employee_id: string;
  block_type: BlockType;
  quantity_produced: number;
  cement_bags_used: number;
  quarry_dust_m3_used: number;
  created_at: string;
}

// Inventory - Current stock of materials
export interface Inventory {
  id: string; // Single record, typically id=1
  cement_bags_current: number;
  quarry_dust_m3_current: number;
  cement_bags_threshold: number;
  quarry_dust_m3_threshold: number;
  last_updated: string;
}

export interface InventoryLog {
  id: string;
  type: "cement" | "dust";
  quantity: number;
  note?: string;
  created_at: string;
}

export interface MaterialUsage {
  date: string;
  cement: number;
  dust: number;
}

export interface ProductionBreakdown {
  block_type: BlockType;
  total: number;
}

// Salary Record - Payment record for an employee
export type SalaryStatus = "pending" | "approved" | "paid" | "rejected";

export interface SalaryRecord {
  id: string;
  employee_id: string;
  period: string; // e.g., "2026-05" for May 2026
  blocks_total: number;
  amount: number;
  status: SalaryStatus;
  created_at: string;
  updated_at: string;
  batch_id?: string;
  rejection_note?: string;
  employee_name?: string;
  daily_rate_per_block?: number;
}

// Salary Batch - Group of salary records for a period
export type BatchStatus = "pending" | "approved" | "paid";
export type PeriodType = "week" | "month";

export interface SalaryBatch {
  id: string;
  period: string;
  period_type: PeriodType;
  status: BatchStatus;
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

export interface SalaryBatchDetail {
  batch: SalaryBatch;
  records: SalaryRecord[];
}

// User - Currently logged-in user
export interface User {
  id: string;
  name: string;
  role: UserRole;
}

// Auth Context State
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
