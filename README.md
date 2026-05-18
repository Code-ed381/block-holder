# Block Factory Management System

A full-stack web application for managing block factory operations including production tracking, employee management, and salary approvals.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: React Context API
- **Routing**: React Router v7

## Features

### Authentication & Authorization

- Email/password authentication via employees table
- Two roles: **Supervisor** and **Manager** (from employee records)
- Auth state persisted in localStorage
- Protected routes with role validation

### Data Models

1. **Block Types**: solid-5inch, solid-6inch, hollow-5inch, hollow-6inch
2. **Production Config**: Customizable batch settings per block type
3. **Employee**: Worker details with daily production rate
4. **Production Log**: Daily production records (date, employee, block type, quantity, materials used)
5. **Inventory**: Current stock of cement bags and quarry dust (m³)
6. **Salary Record**: Payment tracking with status (pending | approved | paid)

### Database

- **PostgreSQL** hosted on Supabase
- Real-time data synchronization
- Row-level security for role-based access

### Navigation

- **/login** - Email/password login form
- **/supervisor** - Supervisor dashboard
- **/manager** - Manager dashboard
- **/not-found** - 404 error page

## Project Structure

```
src/
├── types/
│   └── index.ts                 # Shared data model interfaces
├── context/
│   ├── AuthContext.tsx          # Supabase Auth state management
│   └── ToastContext.tsx         # Toast notification context
├── hooks/
│   └── useAuth.ts               # Auth context hook
├── lib/
│   └── supabase.ts              # Supabase client configuration
├── utils/
│   ├── db.ts                    # Supabase database operations
│   └── config.ts               # Utility functions
├── components/
│   ├── Navigation.tsx           # Top navigation bar
│   └── ProtectedRoute.tsx       # Route guard component
├── pages/
│   ├── Login.tsx                # Login page
│   ├── SupervisorDashboard.tsx  # Supervisor dashboard
│   ├── EmployeeManagement.tsx   # Employee CRUD operations
│   ├── ProductionLogging.tsx    # Daily production entry
│   ├── Inventory.tsx            # Inventory management
│   ├── ManagerDashboard.tsx     # Manager dashboard
│   ├── ProductionConfig.tsx     # Production configuration
│   ├── SalaryApproval.tsx       # Salary approval workflow
│   ├── SalaryBatchSubmission.tsx # Salary batch creation
│   ├── Reports.tsx              # Reports and analytics
│   ├── AllDataView.tsx          # All data view
│   └── NotFound.tsx             # 404 page
├── App.tsx                      # Main app & routing setup
├── main.tsx                     # Entry point with AuthProvider
└── index.css                    # Global styles + Tailwind directives
```

## Getting Started

### Prerequisites

1. Create a Supabase project at https://supabase.com
2. Set up the following tables in your Supabase database:
   - production_configs
   - employees
   - production_logs
   - inventory
   - inventory_logs
   - salary_records
   - salary_batches
3. Enable Row Level Security (RLS) policies
4. Create auth users with role metadata

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Development

```bash
npm run dev
```

The app will start at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Usage

1. **Login**: Enter your email and password (must match an active employee in the database)
2. **Dashboard**: After login, you'll see the appropriate dashboard based on your role
3. **Navigation**: Use the top navbar to navigate between pages and logout
4. **Role-Based Access**: Supervisors can only access `/supervisor`, Managers can only access `/manager`

## Database Schema

### production_configs

- id (text, primary key)
- block_type (text, unique)

### employees

- id (text, primary key)
- name (text)
- email (text)
- password (text)
- role (text)
- daily_rate_per_block (real)
- status (text)
- specialisation (text, nullable)
- created_at (timestamp)

### production_logs

- id (text, primary key)
- date (text)
- employee_id (text, foreign key)
- block_type (text)
- quantity_produced (integer)
- cement_bags_used (integer)
- quarry_dust_m3_used (real)
- created_at (timestamp)
- config_snapshot_bags_per_batch (integer)
- config_snapshot_dust_per_batch (real)
- config_snapshot_blocks_per_batch (integer)

### inventory

- id (text, primary key)
- cement_bags_current (integer)
- quarry_dust_m3_current (real)
- cement_bags_threshold (integer)
- quarry_dust_m3_threshold (real)
- last_updated (timestamp)
- is_critical (integer)

### inventory_logs

- id (text, primary key)
- type (text)
- quantity (real)
- note (text, nullable)
- created_at (timestamp)

### salary_records

- id (text, primary key)
- employee_id (text, foreign key)
- period (text)
- blocks_total (integer)
- amount (real)
- status (text)
- created_at (timestamp)
- updated_at (timestamp)
- batch_id (text, foreign key, nullable)
- rejection_note (text, nullable)

### salary_batches

- id (text, primary key)
- period (text)
- period_type (text)
- status (text)
- total_amount (real)
- total_blocks (integer)
- submitted_by (text, nullable)
- submitted_at (timestamp, nullable)
- approved_by (text, nullable)
- approved_at (timestamp, nullable)
- paid_by (text, nullable)
- paid_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)

## License

MIT
