# Block Factory Management System

A full-stack web application for managing block factory operations including production tracking, employee management, and salary approvals.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: sql.js (SQLite in browser, no backend server)
- **State Management**: React Context API
- **Routing**: React Router v6

## Features (Phase 1 - Foundation)

### Authentication & Authorization
- Simple role-based login (no password required for this phase)
- Two roles: **Supervisor** and **Manager**
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
- **SQLite** running in the browser via sql.js
- Database serialized and stored in localStorage for persistence
- Demo/seed data loaded on first app start

### Navigation
- **/login** - Role-based login form
- **/supervisor** - Supervisor dashboard (placeholder with feature cards)
- **/manager** - Manager dashboard (placeholder with feature cards)
- **/not-found** - 404 error page

## Project Structure

```
src/
├── types/
│   └── index.ts                 # Shared data model interfaces
├── context/
│   └── AuthContext.tsx          # Authentication state management
├── hooks/
│   └── useAuth.ts               # Auth context hook
├── utils/
│   ├── db.ts                    # SQLite utilities (init, query, save)
│   └── seed-data.ts             # Demo data generation
├── components/
│   ├── Navigation.tsx           # Top navigation bar
│   └── ProtectedRoute.tsx       # Route guard component
├── pages/
│   ├── Login.tsx                # Login page
│   ├── SupervisorDashboard.tsx  # Supervisor dashboard placeholder
│   ├── ManagerDashboard.tsx     # Manager dashboard placeholder
│   └── NotFound.tsx             # 404 page
├── App.tsx                      # Main app & routing setup
├── main.tsx                     # Entry point with AuthProvider
└── index.css                    # Global styles + Tailwind directives
```

## Getting Started

### Installation

```bash
npm install
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

1. **Login**: Enter your name and select a role (Supervisor or Manager)
2. **Dashboard**: After login, you'll see the appropriate dashboard based on your role
3. **Navigation**: Use the top navbar to navigate between pages and logout
4. **Role-Based Access**: Supervisors can only access `/supervisor`, Managers can only access `/manager`

## Default Demo Data

On first load, the app seeds the database with:
- 5 sample employees (3 Supervisors, 2 Managers)
- 4 production configurations (one per block type)
- 10 sample production logs
- Initial inventory (500 cement bags, 50 m³ quarry dust)
- 3 sample salary records (various statuses)

## Storage

- **Auth User**: localStorage key `blockholder_auth_user`
- **Database**: localStorage key `blockholder_db` (serialized SQLite file)

To clear all data, open browser DevTools and run:
```javascript
localStorage.removeItem('blockholder_auth_user');
localStorage.removeItem('blockholder_db');
```

Then refresh the page.

## Phase 2 (Upcoming)

- Production logging interface (date, employee, block type, quantity, materials)
- Salary approval workflows with payment status tracking
- Inventory management and depletion tracking
- Manager reports and analytics
- CSV/PDF export functionality
- Production configuration management

## Notes

- This is a **browser-only application** with no backend server
- Data persists only within the current browser's localStorage
- No multi-device sync or cloud backup
- Suitable for single-location factory management

## License

MIT
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# block-holder
