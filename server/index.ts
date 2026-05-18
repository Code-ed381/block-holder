/**
 * Express API Server
 * Serves the blockholder API using a local SQLite database file
 */

import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "database.sqlite");
const PORT = 3001;

// ─── Initialize Database ───────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS production_configs (
    id TEXT PRIMARY KEY,
    block_type TEXT NOT NULL UNIQUE,
    bags_per_batch INTEGER NOT NULL,
    quarry_dust_m3_per_batch REAL NOT NULL,
    blocks_per_batch INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    daily_rate_per_block REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    specialisation TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS production_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    block_type TEXT NOT NULL,
    quantity_produced INTEGER NOT NULL,
    cement_bags_used INTEGER NOT NULL,
    quarry_dust_m3_used REAL NOT NULL,
    created_at TEXT NOT NULL,
    config_snapshot_bags_per_batch INTEGER NOT NULL,
    config_snapshot_dust_per_batch REAL NOT NULL,
    config_snapshot_blocks_per_batch INTEGER NOT NULL,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    cement_bags_current INTEGER NOT NULL,
    quarry_dust_m3_current REAL NOT NULL,
    cement_bags_threshold INTEGER NOT NULL DEFAULT 100,
    quarry_dust_m3_threshold REAL NOT NULL DEFAULT 10.0,
    last_updated TEXT NOT NULL,
    is_critical INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS inventory_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'cement' or 'dust'
    quantity REAL NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS salary_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    period TEXT NOT NULL,
    blocks_total INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    batch_id TEXT,
    rejection_note TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY(batch_id) REFERENCES salary_batches(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS salary_batches (
    id TEXT PRIMARY KEY,
    period TEXT NOT NULL,
    period_type TEXT NOT NULL,
    status TEXT NOT NULL,
    total_amount REAL NOT NULL,
    total_blocks INTEGER NOT NULL,
    submitted_by TEXT,
    submitted_at TEXT,
    approved_by TEXT,
    approved_at TEXT,
    paid_by TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// ─── Seed Data (only if database is empty) ─────────────────────────────────────

function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

const employeeCount = db
  .prepare("SELECT COUNT(*) as count FROM employees")
  .get() as { count: number };

if (employeeCount.count === 0) {
  console.log("🌱 Seeding database with demo data...");
  const now = new Date().toISOString();

  // Seed Production Configs
  const insertConfig = db.prepare(
    `INSERT INTO production_configs (id, block_type, bags_per_batch, quarry_dust_m3_per_batch, blocks_per_batch)
     VALUES (?, ?, ?, ?, ?)`,
  );
  ["solid-5inch", "solid-6inch", "hollow-5inch", "hollow-6inch"].forEach(
    (blockType) => {
      insertConfig.run(generateId(), blockType, 20, 5.0, 100);
    },
  );

  // Seed Employees
  const insertEmployee = db.prepare(
    `INSERT INTO employees (id, name, role, daily_rate_per_block, status, specialisation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const employees = [
    {
      name: "Ahmed Hassan",
      role: "Supervisor",
      rate: 0.5,
      status: "active",
      spec: "solid-5inch",
    },
    {
      name: "Fatima Juma",
      role: "Supervisor",
      rate: 0.45,
      status: "active",
      spec: "solid-6inch",
    },
    {
      name: "Mohammed Ali",
      role: "Manager",
      rate: 1.0,
      status: "active",
      spec: null,
    },
    {
      name: "Zainab Omar",
      role: "Manager",
      rate: 1.0,
      status: "active",
      spec: null,
    },
    {
      name: "Karim Ibrahim",
      role: "Supervisor",
      rate: 0.48,
      status: "active",
      spec: "hollow-5inch",
    },
  ];
  const employeeIds: string[] = [];
  employees.forEach((emp) => {
    const id = generateId();
    employeeIds.push(id);
    insertEmployee.run(
      id,
      emp.name,
      emp.role,
      emp.rate,
      emp.status,
      emp.spec,
      now,
    );
  });

  // Seed Production Logs
  const insertLog = db.prepare(
    `INSERT INTO production_logs (id, date, employee_id, block_type, quantity_produced, cement_bags_used, quarry_dust_m3_used, created_at, config_snapshot_bags_per_batch, config_snapshot_dust_per_batch, config_snapshot_blocks_per_batch)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const logsData = [
    { empIdx: 0, blockType: "solid-5inch", qty: 500, bags: 10, dust: 2.5 },
    { empIdx: 1, blockType: "solid-6inch", qty: 400, bags: 8, dust: 2.0 },
    { empIdx: 2, blockType: "hollow-5inch", qty: 600, bags: 12, dust: 3.0 },
    { empIdx: 3, blockType: "hollow-6inch", qty: 550, bags: 11, dust: 2.75 },
    { empIdx: 0, blockType: "solid-5inch", qty: 480, bags: 10, dust: 2.4 },
    { empIdx: 1, blockType: "solid-6inch", qty: 420, bags: 8, dust: 2.1 },
    { empIdx: 4, blockType: "hollow-5inch", qty: 520, bags: 10, dust: 2.6 },
    { empIdx: 2, blockType: "hollow-6inch", qty: 570, bags: 11, dust: 2.85 },
    { empIdx: 3, blockType: "solid-5inch", qty: 510, bags: 10, dust: 2.55 },
    { empIdx: 4, blockType: "solid-6inch", qty: 450, bags: 9, dust: 2.25 },
  ];
  const today = new Date();
  logsData.forEach((log, idx) => {
    const logDate = new Date(today.getTime() - idx * 24 * 60 * 60 * 1000);
    const dateStr = logDate.toISOString().split("T")[0];
    insertLog.run(
      generateId(),
      dateStr,
      employeeIds[log.empIdx],
      log.blockType,
      log.qty,
      log.bags,
      log.dust,
      now,
      20, // config_snapshot_bags_per_batch
      5.0, // config_snapshot_dust_per_batch
      100, // config_snapshot_blocks_per_batch
    );
  });

  // Seed Inventory
  db.prepare(
    `INSERT INTO inventory (id, cement_bags_current, quarry_dust_m3_current, cement_bags_threshold, quarry_dust_m3_threshold, last_updated, is_critical)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run("inventory_1", 500, 50.0, 100, 10.0, now, 0);

  // Seed Salary Records
  const insertSalary = db.prepare(
    `INSERT INTO salary_records (id, employee_id, period, blocks_total, amount, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const currentMonth = new Date().toISOString().substring(0, 7);
  [
    { empIdx: 0, blocks: 5000, amount: 2500, status: "pending" },
    { empIdx: 1, blocks: 4200, amount: 1890, status: "approved" },
    { empIdx: 2, blocks: 3000, amount: 3000, status: "paid" },
  ].forEach((rec) => {
    insertSalary.run(
      generateId(),
      employeeIds[rec.empIdx],
      currentMonth,
      rec.blocks,
      rec.amount,
      rec.status,
      now,
      now,
    );
  });

  console.log("✅ Database seeded successfully");
}

// ─── Express App ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ─── Production Configs ────────────────────────────────────────────────────────

app.get("/api/production-configs", (_req, res) => {
  const configs = db
    .prepare("SELECT * FROM production_configs ORDER BY block_type")
    .all();
  res.json(configs);
});

app.put("/api/production-configs/:id", (req, res) => {
  const { id } = req.params;
  const { bags_per_batch, quarry_dust_m3_per_batch, blocks_per_batch } =
    req.body;

  db.prepare(
    `UPDATE production_configs
     SET bags_per_batch = ?, quarry_dust_m3_per_batch = ?, blocks_per_batch = ?
     WHERE id = ?`,
  ).run(bags_per_batch, quarry_dust_m3_per_batch, blocks_per_batch, id);

  const updated = db
    .prepare("SELECT * FROM production_configs WHERE id = ?")
    .get(id);
  res.json(updated);
});

app.post("/api/production-configs/reset", (_req, res) => {
  db.prepare(
    `UPDATE production_configs
     SET bags_per_batch = 20, quarry_dust_m3_per_batch = 5.0, blocks_per_batch = 100`,
  ).run();

  const configs = db
    .prepare("SELECT * FROM production_configs ORDER BY block_type")
    .all();
  res.json(configs);
});

// ─── Employees ─────────────────────────────────────────────────────────────────

app.get("/api/employees", (_req, res) => {
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  const employees = db
    .prepare(
      `
    SELECT e.*, 
      COALESCE(SUM(l.quantity_produced), 0) as total_blocks_month,
      COALESCE(SUM(l.quantity_produced * e.daily_rate_per_block), 0) as projected_salary_month
    FROM employees e
    LEFT JOIN production_logs l ON e.id = l.employee_id AND l.date LIKE ?
    GROUP BY e.id
    ORDER BY e.name
  `,
    )
    .all(`${currentMonth}%`);

  res.json(employees);
});

app.get("/api/employees/:id", (req, res) => {
  const employee = db
    .prepare("SELECT * FROM employees WHERE id = ?")
    .get(req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  res.json(employee);
});

app.post("/api/employees", (req, res) => {
  const { name, role, daily_rate_per_block, status, specialisation } = req.body;
  const id = generateId();
  const created_at = new Date().toISOString();

  db.prepare(
    `INSERT INTO employees (id, name, role, daily_rate_per_block, status, specialisation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    name,
    role,
    daily_rate_per_block,
    status || "active",
    specialisation || null,
    created_at,
  );

  const employee = db.prepare("SELECT * FROM employees WHERE id = ?").get(id);
  res.status(201).json(employee);
});

app.put("/api/employees/:id", (req, res) => {
  const { name, role, daily_rate_per_block, status, specialisation } = req.body;

  db.prepare(
    `UPDATE employees SET name = ?, role = ?, daily_rate_per_block = ?, status = ?, specialisation = ? WHERE id = ?`,
  ).run(
    name,
    role,
    daily_rate_per_block,
    status,
    specialisation,
    req.params.id,
  );

  const updated = db
    .prepare("SELECT * FROM employees WHERE id = ?")
    .get(req.params.id);
  res.json(updated);
});

app.delete("/api/employees/:id", (req, res) => {
  db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

// ─── Production Logs ───────────────────────────────────────────────────────────

app.get("/api/production-logs", (_req, res) => {
  const logs = db
    .prepare(
      `
      SELECT l.*, e.name as employee_name 
      FROM production_logs l 
      JOIN employees e ON l.employee_id = e.id 
      ORDER BY l.date DESC, l.created_at DESC
    `,
    )
    .all();
  res.json(logs);
});

app.get("/api/production-logs/check-duplicate", (req, res) => {
  const { date, employee_id, block_type } = req.query;

  if (!date || !employee_id || !block_type) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const duplicate = db
    .prepare(
      `SELECT * FROM production_logs 
     WHERE date = ? AND employee_id = ? AND block_type = ?`,
    )
    .get(date, employee_id, block_type);

  res.json({ isDuplicate: !!duplicate });
});

app.post("/api/production-logs", (req, res) => {
  const {
    date,
    employee_id,
    block_type,
    quantity_produced,
    cement_bags_used,
    quarry_dust_m3_used,
  } = req.body;
  const id = generateId();
  const created_at = new Date().toISOString();

  // Get config snapshot at log time
  const config = db
    .prepare("SELECT * FROM production_configs WHERE block_type = ?")
    .get(block_type) as any;
  if (!config) {
    return res.status(400).json({ error: "Invalid block type" });
  }

  const insertLog = db.prepare(
    `INSERT INTO production_logs (id, date, employee_id, block_type, quantity_produced, cement_bags_used, quarry_dust_m3_used, created_at, config_snapshot_bags_per_batch, config_snapshot_dust_per_batch, config_snapshot_blocks_per_batch)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const updateInventory = db.prepare(
    `UPDATE inventory 
     SET cement_bags_current = cement_bags_current - ?, 
         quarry_dust_m3_current = quarry_dust_m3_current - ?,
         last_updated = ?,
         is_critical = CASE 
           WHEN cement_bags_current - ? < 0 OR quarry_dust_m3_current - ? < 0 THEN 1
           ELSE is_critical
         END
     WHERE id = 'inventory_1'`,
  );

  const createLogTransaction = db.transaction((logData) => {
    insertLog.run(
      logData.id,
      logData.date,
      logData.employee_id,
      logData.block_type,
      logData.quantity_produced,
      logData.cement_bags_used,
      logData.quarry_dust_m3_used,
      logData.created_at,
      logData.config_snapshot_bags_per_batch,
      logData.config_snapshot_dust_per_batch,
      logData.config_snapshot_blocks_per_batch,
    );
    updateInventory.run(
      logData.cement_bags_used,
      logData.quarry_dust_m3_used,
      logData.created_at,
      logData.cement_bags_used,
      logData.quarry_dust_m3_used,
    );
  });

  try {
    createLogTransaction({
      id,
      date,
      employee_id,
      block_type,
      quantity_produced,
      cement_bags_used,
      quarry_dust_m3_used,
      created_at,
      config_snapshot_bags_per_batch: config.bags_per_batch,
      config_snapshot_dust_per_batch: config.quarry_dust_m3_per_batch,
      config_snapshot_blocks_per_batch: config.blocks_per_batch,
    });

    const log = db
      .prepare(
        `
        SELECT l.*, e.name as employee_name 
        FROM production_logs l 
        JOIN employees e ON l.employee_id = e.id 
        WHERE l.id = ?
      `,
      )
      .get(id) as any;

    // Check if inventory is now critical
    const inventory = db
      .prepare("SELECT * FROM inventory WHERE id = 'inventory_1'")
      .get() as any;
    const isCritical = inventory.is_critical === 1;

    const response = { ...log, inventory_critical: isCritical };
    res.status(201).json(response);
  } catch (error) {
    console.error("Transaction failed:", error);
    res.status(500).json({ error: "Failed to record production log" });
  }
});

app.delete("/api/production-logs/:id", (req, res) => {
  const { id } = req.params;
  const log = db
    .prepare("SELECT * FROM production_logs WHERE id = ?")
    .get(id) as any;

  if (!log) return res.status(404).json({ error: "Log not found" });

  // Optional: Restrict deletion to same-day logs only
  const today = new Date().toISOString().split("T")[0];
  if (log.date !== today) {
    return res.status(403).json({ error: "Only same-day logs can be deleted" });
  }

  // When deleting a log, we should probably add materials back to inventory
  const restoreInventory = db.prepare(`
    UPDATE inventory 
    SET cement_bags_current = cement_bags_current + ?, 
        quarry_dust_m3_current = quarry_dust_m3_current + ?,
        last_updated = ?
    WHERE id = 'inventory_1'
  `);

  const deleteLog = db.prepare("DELETE FROM production_logs WHERE id = ?");

  const deleteTransaction = db.transaction((logEntry) => {
    restoreInventory.run(
      logEntry.cement_bags_used,
      logEntry.quarry_dust_m3_used,
      new Date().toISOString(),
    );
    deleteLog.run(logEntry.id);
  });

  try {
    deleteTransaction(log);
    res.status(204).send();
  } catch (error) {
    console.error("Delete transaction failed:", error);
    res
      .status(500)
      .json({ error: "Failed to delete log and restore inventory" });
  }
});

// ─── Inventory ─────────────────────────────────────────────────────────────────

app.get("/api/inventory", (_req, res) => {
  const inventory = db.prepare("SELECT * FROM inventory LIMIT 1").get();
  res.json(
    inventory || {
      cement_bags_current: 0,
      quarry_dust_m3_current: 0,
      cement_bags_threshold: 100,
      quarry_dust_m3_threshold: 10.0,
      is_critical: 0,
    },
  );
});

app.put("/api/inventory/thresholds", (req, res) => {
  const { cement_bags_threshold, quarry_dust_m3_threshold } = req.body;
  db.prepare(
    `
    UPDATE inventory 
    SET cement_bags_threshold = ?, quarry_dust_m3_threshold = ?, last_updated = ?
    WHERE id = 'inventory_1'
  `,
  ).run(
    cement_bags_threshold,
    quarry_dust_m3_threshold,
    new Date().toISOString(),
  );

  res.json(db.prepare("SELECT * FROM inventory LIMIT 1").get());
});

app.post("/api/inventory/restock", (req, res) => {
  const { type, quantity, note } = req.body;
  const id = generateId();
  const now = new Date().toISOString();

  const updateInventory = db.prepare(`
    UPDATE inventory 
    SET ${type === "cement" ? "cement_bags_current" : "quarry_dust_m3_current"} = ${type === "cement" ? "cement_bags_current" : "quarry_dust_m3_current"} + ?,
        last_updated = ?
    WHERE id = 'inventory_1'
  `);

  const insertLog = db.prepare(`
    INSERT INTO inventory_logs (id, type, quantity, note, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const restockTransaction = db.transaction(() => {
    updateInventory.run(quantity, now);
    insertLog.run(id, type, quantity, note, now);
  });

  restockTransaction();
  res.status(201).json({ message: "Restock successful" });
});

app.get("/api/inventory/logs", (_req, res) => {
  const logs = db
    .prepare("SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 50")
    .all();
  res.json(logs);
});

app.get("/api/inventory/consumption", (_req, res) => {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }

  const stats = last7Days.map((date) => {
    const usage = db
      .prepare(
        `
      SELECT SUM(cement_bags_used) as cement, SUM(quarry_dust_m3_used) as dust
      FROM production_logs
      WHERE date = ?
    `,
      )
      .get(date) as any;
    return {
      date,
      cement: usage.cement || 0,
      dust: usage.dust || 0,
    };
  });

  res.json(stats);
});

app.get("/api/inventory/production-breakdown", (_req, res) => {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const breakdown = db
    .prepare(
      `
    SELECT block_type, SUM(quantity_produced) as total
    FROM production_logs
    WHERE date LIKE ?
    GROUP BY block_type
  `,
    )
    .all(`${currentMonth}%`);
  res.json(breakdown);
});

// ─── Salary Records ────────────────────────────────────────────────────────────

app.get("/api/salary-records", (_req, res) => {
  const records = db
    .prepare("SELECT * FROM salary_records ORDER BY period DESC")
    .all();
  res.json(records);
});

app.post("/api/salary-records", (req, res) => {
  const { employee_id, period, blocks_total, amount, status } = req.body;
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO salary_records (id, employee_id, period, blocks_total, amount, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, employee_id, period, blocks_total, amount, status, now, now);

  const record = db
    .prepare("SELECT * FROM salary_records WHERE id = ?")
    .get(id);
  res.status(201).json(record);
});

app.put("/api/salary-records/:id", (req, res) => {
  const { status, rejection_note } = req.body;
  const updated_at = new Date().toISOString();

  db.prepare(
    `UPDATE salary_records SET status = ?, updated_at = ?, rejection_note = ? WHERE id = ?`,
  ).run(status, updated_at, rejection_note || null, req.params.id);

  const updated = db
    .prepare("SELECT * FROM salary_records WHERE id = ?")
    .get(req.params.id);
  res.json(updated);
});

// ─── Salary Batches ─────────────────────────────────────────────────────────────

app.get("/api/salary-batches", (req, res) => {
  const { status } = req.query;
  let query = "SELECT * FROM salary_batches ORDER BY created_at DESC";
  let params: any[] = [];

  if (status) {
    query =
      "SELECT * FROM salary_batches WHERE status = ? ORDER BY created_at DESC";
    params = [status];
  }

  const batches = db.prepare(query).all(...params);
  res.json(batches);
});

app.get("/api/salary-batches/:id", (req, res) => {
  const batch = db
    .prepare("SELECT * FROM salary_batches WHERE id = ?")
    .get(req.params.id);
  if (!batch) return res.status(404).json({ error: "Batch not found" });

  const records = db
    .prepare(
      `
    SELECT sr.*, e.name as employee_name, e.daily_rate_per_block
    FROM salary_records sr
    JOIN employees e ON sr.employee_id = e.id
    WHERE sr.batch_id = ?
    ORDER BY e.name
  `,
    )
    .all(req.params.id);

  res.json({ batch, records });
});

app.post("/api/salary-batches", (req, res) => {
  const { period, period_type, submitted_by, employee_records } = req.body;
  const id = generateId();
  const now = new Date().toISOString();

  let total_amount = 0;
  let total_blocks = 0;

  employee_records.forEach((rec: any) => {
    total_amount += rec.amount;
    total_blocks += rec.blocks_total;
  });

  const insertBatch = db.prepare(`
    INSERT INTO salary_batches (id, period, period_type, status, total_amount, total_blocks, submitted_by, submitted_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBatch.run(
    id,
    period,
    period_type,
    "pending",
    total_amount,
    total_blocks,
    submitted_by,
    now,
    now,
    now,
  );

  // Create salary records for each employee
  const insertRecord = db.prepare(`
    INSERT INTO salary_records (id, employee_id, period, blocks_total, amount, status, created_at, updated_at, batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  employee_records.forEach((rec: any) => {
    const recordId = generateId();
    insertRecord.run(
      recordId,
      rec.employee_id,
      period,
      rec.blocks_total,
      rec.amount,
      "pending",
      now,
      now,
      id,
    );
  });

  const batch = db.prepare("SELECT * FROM salary_batches WHERE id = ?").get(id);
  res.status(201).json(batch);
});

app.get("/api/salary-batches/calculate/:period", (req, res) => {
  const { period } = req.params;

  // Get all employees including deactivated ones (for work done in period)
  const employees = db.prepare("SELECT * FROM employees").all();

  const calculations = employees
    .map((emp: any) => {
      const logs = db
        .prepare(
          `SELECT SUM(quantity_produced) as total_blocks 
       FROM production_logs 
       WHERE employee_id = ? AND date LIKE ?`,
        )
        .get(emp.id, `${period}%`) as any;

      const totalBlocks = logs.total_blocks || 0;
      const amount = totalBlocks * emp.daily_rate_per_block;

      return {
        employee_id: emp.id,
        name: emp.name,
        role: emp.role,
        status: emp.status,
        blocks_total: totalBlocks,
        amount,
        daily_rate_per_block: emp.daily_rate_per_block,
      };
    })
    .filter((calc: any) => calc.blocks_total > 0);

  res.json(calculations);
});

app.put("/api/salary-batches/:id/approve", (req, res) => {
  const { approved_by } = req.body;
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE salary_batches 
    SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ?
    WHERE id = ?
  `,
  ).run(approved_by, now, now, req.params.id);

  // Also approve all individual records in the batch
  db.prepare(
    `
    UPDATE salary_records 
    SET status = 'approved', updated_at = ?
    WHERE batch_id = ?
  `,
  ).run(now, req.params.id);

  const batch = db
    .prepare("SELECT * FROM salary_batches WHERE id = ?")
    .get(req.params.id);
  res.json(batch);
});

app.put("/api/salary-batches/:id/confirm-payment", (req, res) => {
  const { paid_by } = req.body;
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE salary_batches 
    SET status = 'paid', paid_by = ?, paid_at = ?, updated_at = ?
    WHERE id = ?
  `,
  ).run(paid_by, now, now, req.params.id);

  // Also mark all individual records as paid
  db.prepare(
    `
    UPDATE salary_records 
    SET status = 'paid', updated_at = ?
    WHERE batch_id = ?
  `,
  ).run(now, req.params.id);

  const batch = db
    .prepare("SELECT * FROM salary_batches WHERE id = ?")
    .get(req.params.id);
  res.json(batch);
});

app.put("/api/salary-records/:recordId/approve", (req, res) => {
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE salary_records 
    SET status = 'approved', updated_at = ?, rejection_note = NULL
    WHERE id = ?
  `,
  ).run(now, req.params.recordId);

  const record = db
    .prepare("SELECT * FROM salary_records WHERE id = ?")
    .get(req.params.recordId);
  res.json(record);
});

app.put("/api/salary-records/:recordId/reject", (req, res) => {
  const { rejection_note } = req.body;
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE salary_records 
    SET status = 'rejected', updated_at = ?, rejection_note = ?
    WHERE id = ?
  `,
  ).run(now, rejection_note, req.params.recordId);

  const record = db
    .prepare("SELECT * FROM salary_records WHERE id = ?")
    .get(req.params.recordId);
  res.json(record);
});
// ─── Reports ───────────────────────────────────────────────────────────────────

app.get("/api/reports/summary", (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
  }

  const startStr = startDate as string;
  const endStr = endDate as string;

  // 1. Production Logs
  const productionLogs = db
    .prepare(
      `
    SELECT l.*, e.name as employee_name 
    FROM production_logs l 
    JOIN employees e ON l.employee_id = e.id 
    WHERE l.date BETWEEN ? AND ?
    ORDER BY l.date ASC
  `,
    )
    .all(startStr, endStr);

  // 2. Inventory Logs (Restocks)
  const inventoryLogs = db
    .prepare(
      `
    SELECT * FROM inventory_logs 
    WHERE created_at BETWEEN ? AND ?
  `,
    )
    .all(`${startStr}T00:00:00.000Z`, `${endStr}T23:59:59.999Z`);

  // 3. Current Inventory
  const currentInventory = db
    .prepare("SELECT * FROM inventory LIMIT 1")
    .get() as any;

  // 4. Employees
  const employees = db.prepare("SELECT * FROM employees").all();

  // 5. Salary Records (matching the periods covered)
  const startMonth = startStr.substring(0, 7);
  const endMonth = endStr.substring(0, 7);
  const salaryRecords = db
    .prepare(
      `
    SELECT sr.*, e.name as employee_name, e.daily_rate_per_block
    FROM salary_records sr
    JOIN employees e ON sr.employee_id = e.id
    WHERE sr.period >= ? AND sr.period <= ?
  `,
    )
    .all(startMonth, endMonth);

  // Calculate opening stock for inventory report
  // Opening = Current - (Restocks after start) + (Consumption after start)
  const laterRestocks = db
    .prepare(
      `
    SELECT type, SUM(quantity) as total 
    FROM inventory_logs 
    WHERE created_at > ?
    GROUP BY type
  `,
    )
    .all(`${startStr}T00:00:00.000Z`) as any[];

  const laterConsumption = db
    .prepare(
      `
    SELECT SUM(cement_bags_used) as cement, SUM(quarry_dust_m3_used) as dust
    FROM production_logs
    WHERE date >= ?
  `,
    )
    .get(startStr) as any;

  const restockAfterStart = {
    cement: laterRestocks.find((r) => r.type === "cement")?.total || 0,
    dust: laterRestocks.find((r) => r.type === "dust")?.total || 0,
  };

  const openingStock = {
    cement:
      currentInventory.cement_bags_current -
      restockAfterStart.cement +
      (laterConsumption.cement || 0),
    dust:
      currentInventory.quarry_dust_m3_current -
      restockAfterStart.dust +
      (laterConsumption.dust || 0),
  };

  res.json({
    productionLogs,
    inventoryLogs,
    currentInventory,
    employees,
    salaryRecords,
    openingStock,
    meta: { startDate, endDate },
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 API server running at http://localhost:${PORT}`);
  console.log(`📁 Database file: ${DB_PATH}`);
});
