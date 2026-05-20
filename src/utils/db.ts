/**
 * Supabase Client
 * Replaces Express API calls with Supabase client
 */

import { supabase } from "../lib/supabase";

// ─── Production Configs ────────────────────────────────────────────────────────

export async function getProductionConfigs() {
  const { data, error } = await supabase
    .from("production_configs")
    .select("*")
    .order("block_type");
  if (error) throw error;
  return data;
}

export async function updateProductionConfig(
  id: string,
  data: {
    bags_per_batch: number;
    quarry_dust_m3_per_batch: number;
    blocks_per_batch: number;
  },
) {
  const { data: result, error } = await supabase
    .from("production_configs")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function resetProductionConfigs() {
  const { data, error } = await supabase
    .from("production_configs")
    .update({
      bags_per_batch: 20,
      quarry_dust_m3_per_batch: 5.0,
      blocks_per_batch: 100,
    })
    .select()
    .order("block_type");
  if (error) throw error;
  return data;
}

// ─── Employees ─────────────────────────────────────────────────────────────────

export async function getEmployees() {
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  const { data, error } = await supabase
    .from("employees")
    .select(
      `
      *,
      production_logs(quantity_produced)
    `,
    )
    .order("name");

  if (error) throw error;

  // Calculate monthly totals
  return data.map((emp: any) => {
    const monthlyLogs =
      emp.production_logs?.filter((log: any) =>
        log.date?.startsWith(currentMonth),
      ) || [];
    const totalBlocks = monthlyLogs.reduce(
      (sum: number, log: any) => sum + (log.quantity_produced || 0),
      0,
    );
    return {
      ...emp,
      total_blocks_month: totalBlocks,
      projected_salary_month: totalBlocks * emp.daily_rate_per_block,
    };
  });
}

export async function getEmployee(id: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createEmployee(data: {
  name: string;
  role: string;
  daily_rate_per_block: number;
  status?: string;
  specialisation?: string;
}) {
  const { data: result, error } = await supabase
    .from("employees")
    .insert({
      ...data,
      status: data.status || "active",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateEmployee(
  id: string,
  data: {
    name: string;
    phone_number: string;
    role: string;
    daily_rate_per_block: number;
    status: string;
    specialisation?: string | null;
  },
) {
  const { data: result, error } = await supabase
    .from("employees")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}

// ─── Production Logs ───────────────────────────────────────────────────────────

export async function getProductionLogs() {
  const { data, error } = await supabase
    .from("production_logs")
    .select(
      `
      *,
      employees(name)
    `,
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((log: any) => ({
    ...log,
    employee_name: log.employees?.name,
  }));
}

export async function createProductionLog(data: {
  date: string;
  employee_id: string;
  block_type: string;
  quantity_produced: number;
  cement_bags_used: number;
  quarry_dust_m3_used: number;
}) {
  // Get config snapshot
  const { data: config, error: configError } = await supabase
    .from("production_configs")
    .select("*")
    .eq("block_type", data.block_type)
    .single();

  if (configError || !config) {
    throw new Error("Invalid block type");
  }

  const now = new Date().toISOString();

  // Create production log
  const { data: result, error: logError } = await supabase
    .from("production_logs")
    .insert({
      id: crypto.randomUUID(),
      date: data.date,
      employee_id: data.employee_id,
      block_type: data.block_type,
      quantity_produced: data.quantity_produced,
      cement_bags_used: data.cement_bags_used,
      quarry_dust_m3_used: data.quarry_dust_m3_used,
      created_at: now,
      config_snapshot_bags_per_batch: config.bags_per_batch,
      config_snapshot_dust_per_batch: config.quarry_dust_m3_per_batch,
      config_snapshot_blocks_per_batch: config.blocks_per_batch,
    })
    .select(
      `
      *,
      employees(name)
    `,
    )
    .single();

  if (logError) throw logError;

  // Update inventory
  const { data: currentInv } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", "inventory_1")
    .single();

  if (currentInv) {
    const { error: invError } = await supabase
      .from("inventory")
      .update({
        cement_bags_current:
          currentInv.cement_bags_current - data.cement_bags_used,
        quarry_dust_m3_current:
          currentInv.quarry_dust_m3_current - data.quarry_dust_m3_used,
        last_updated: now,
        is_critical:
          currentInv.cement_bags_current - data.cement_bags_used < 0 ||
          currentInv.quarry_dust_m3_current - data.quarry_dust_m3_used < 0
            ? 1
            : currentInv.is_critical,
      })
      .eq("id", "inventory_1");

    if (invError) throw invError;
  }

  return {
    ...result,
    employee_name: result.employees?.name,
    inventory_critical:
      (currentInv?.cement_bags_current || 0) - data.cement_bags_used < 0 ||
      (currentInv?.quarry_dust_m3_current || 0) - data.quarry_dust_m3_used < 0,
  };
}

export async function deleteProductionLog(id: string) {
  const { data: log } = await supabase
    .from("production_logs")
    .select("*")
    .eq("id", id)
    .single();

  if (!log) throw new Error("Log not found");

  const today = new Date().toISOString().split("T")[0];
  if (log.date !== today) {
    throw new Error("Only same-day logs can be deleted");
  }

  const now = new Date().toISOString();

  // Restore inventory
  const { data: currentInv } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", "inventory_1")
    .single();

  if (currentInv) {
    const { error: invError } = await supabase
      .from("inventory")
      .update({
        cement_bags_current:
          currentInv.cement_bags_current + log.cement_bags_used,
        quarry_dust_m3_current:
          currentInv.quarry_dust_m3_current + log.quarry_dust_m3_used,
        last_updated: now,
      })
      .eq("id", "inventory_1");

    if (invError) throw invError;
  }

  // Delete log
  const { error: deleteError } = await supabase
    .from("production_logs")
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;
}

// ─── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No inventory record, return default
      return {
        id: "inventory_1",
        cement_bags_current: 0,
        quarry_dust_m3_current: 0,
        cement_bags_threshold: 100,
        quarry_dust_m3_threshold: 10.0,
        last_updated: new Date().toISOString(),
        is_critical: 0,
      };
    }
    throw error;
  }
  return data;
}

export async function updateInventoryThresholds(data: {
  cement_bags_threshold: number;
  quarry_dust_m3_threshold: number;
}) {
  const { data: result, error } = await supabase
    .from("inventory")
    .update({
      ...data,
      last_updated: new Date().toISOString(),
    })
    .eq("id", "inventory_1")
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function restockInventory(data: {
  type: "cement" | "dust";
  quantity: number;
  note?: string;
}) {
  const now = new Date().toISOString();

  // Get current inventory
  const { data: currentInv, error: fetchError } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", "inventory_1")
    .single();

  if (fetchError) throw fetchError;

  // Calculate new value
  const updateField =
    data.type === "cement" ? "cement_bags_current" : "quarry_dust_m3_current";
  const currentValue =
    data.type === "cement"
      ? currentInv.cement_bags_current
      : currentInv.quarry_dust_m3_current;
  const newValue = currentValue + data.quantity;

  // Update inventory
  const { error: updateError } = await supabase
    .from("inventory")
    .update({
      [updateField]: newValue,
      last_updated: now,
    })
    .eq("id", "inventory_1");

  if (updateError) throw updateError;

  // Create inventory log
  const { error: logError } = await supabase.from("inventory_logs").insert({
    id: crypto.randomUUID(),
    type: data.type,
    quantity: data.quantity,
    note: data.note,
    created_at: now,
  });

  if (logError) throw logError;

  return { message: "Restock successful" };
}

export async function getInventoryLogs() {
  const { data, error } = await supabase
    .from("inventory_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function getInventoryConsumption() {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }

  const stats = await Promise.all(
    last7Days.map(async (date) => {
      const { data, error } = await supabase
        .from("production_logs")
        .select("cement_bags_used, quarry_dust_m3_used")
        .eq("date", date);

      if (error) throw error;

      const cement =
        data?.reduce((sum, log) => sum + (log.cement_bags_used || 0), 0) || 0;
      const dust =
        data?.reduce((sum, log) => sum + (log.quarry_dust_m3_used || 0), 0) ||
        0;

      return { date, cement, dust };
    }),
  );

  return stats;
}

export async function getProductionBreakdown() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data, error } = await supabase
    .from("production_logs")
    .select("block_type, quantity_produced")
    .like("date", `${currentMonth}%`);

  if (error) throw error;

  const breakdown: Record<string, number> = {};
  data?.forEach((log) => {
    breakdown[log.block_type] =
      (breakdown[log.block_type] || 0) + (log.quantity_produced || 0);
  });

  return Object.entries(breakdown).map(([block_type, total]) => ({
    block_type,
    total,
  }));
}

// ─── Salary Records ────────────────────────────────────────────────────────────

export async function getSalaryRecords() {
  const { data, error } = await supabase
    .from("salary_records")
    .select("*")
    .order("period", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createSalaryRecord(data: {
  employee_id: string;
  period: string;
  blocks_total: number;
  amount: number;
  status: string;
}) {
  const now = new Date().toISOString();
  const { data: result, error } = await supabase
    .from("salary_records")
    .insert({
      ...data,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateSalaryRecord(
  id: string,
  data: { status: string; rejection_note?: string },
) {
  const { data: result, error } = await supabase
    .from("salary_records")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

// ─── Salary Batches ─────────────────────────────────────────────────────────────

export async function getSalaryBatches(status?: string) {
  let query = supabase
    .from("salary_batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getSalaryBatch(id: string) {
  const { data: batch, error: batchError } = await supabase
    .from("salary_batches")
    .select("*")
    .eq("id", id)
    .single();

  if (batchError) throw batchError;

  const { data: records, error: recordsError } = await supabase
    .from("salary_records")
    .select(
      `
      *,
      employees(name, daily_rate_per_block)
    `,
    )
    .eq("batch_id", id)
    .order("name", { foreignTable: "employees" });

  if (recordsError) throw recordsError;

  return {
    batch,
    records: records?.map((r: any) => ({
      ...r,
      employee_name: r.employees?.name,
      daily_rate_per_block: r.employees?.daily_rate_per_block,
    })),
  };
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
  const now = new Date().toISOString();
  const totalAmount = data.employee_records.reduce(
    (sum, r) => sum + r.amount,
    0,
  );
  const totalBlocks = data.employee_records.reduce(
    (sum, r) => sum + r.blocks_total,
    0,
  );

  // Create batch
  const { data: batch, error: batchError } = await supabase
    .from("salary_batches")
    .insert({
      id: crypto.randomUUID(),
      period: data.period,
      period_type: data.period_type,
      status: "pending",
      total_amount: totalAmount,
      total_blocks: totalBlocks,
      submitted_by: data.submitted_by,
      submitted_at: now,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (batchError) throw batchError;

  // Create records
  const records = data.employee_records.map((r) => ({
    id: crypto.randomUUID(),
    employee_id: r.employee_id,
    period: data.period,
    blocks_total: r.blocks_total,
    amount: r.amount,
    status: "pending",
    created_at: now,
    updated_at: now,
    batch_id: batch.id,
  }));

  const { error: recordsError } = await supabase
    .from("salary_records")
    .insert(records);

  if (recordsError) throw recordsError;

  return batch;
}

export async function approveSalaryBatch(id: string, approved_by: string) {
  const now = new Date().toISOString();

  // Update batch
  const { data: batch, error: batchError } = await supabase
    .from("salary_batches")
    .update({
      status: "approved",
      approved_by,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (batchError) throw batchError;

  // Update records
  const { error: recordsError } = await supabase
    .from("salary_records")
    .update({ status: "approved", updated_at: now })
    .eq("batch_id", id);

  if (recordsError) throw recordsError;

  return batch;
}

export async function confirmSalaryPayment(id: string, paid_by: string) {
  const now = new Date().toISOString();

  // Update batch
  const { data: batch, error: batchError } = await supabase
    .from("salary_batches")
    .update({
      status: "paid",
      paid_by,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (batchError) throw batchError;

  // Update records
  const { error: recordsError } = await supabase
    .from("salary_records")
    .update({ status: "paid", updated_at: now })
    .eq("batch_id", id);

  if (recordsError) throw recordsError;

  return batch;
}

export async function approveSalaryRecord(recordId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("salary_records")
    .update({
      status: "approved",
      updated_at: now,
      rejection_note: null,
    })
    .eq("id", recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectSalaryRecord(
  recordId: string,
  rejection_note: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("salary_records")
    .update({
      status: "rejected",
      updated_at: now,
      rejection_note,
    })
    .eq("id", recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
