# Sam's Fitzter Gym Management System (Phase 2 Biometric-Ready)

A premium, local-ready full-stack web application designed for gym owners and front-desk receptionists to manage memberships, check-ins, payments, and renewals.

This system is built from the ground up to support future hardware biometric scanner integrations (ZKTeco, eSSL, etc.) without requiring database or routing refactoring.

---

## Key Features

1. **Role-Based Access Control**:
   - **Admin Manager**: Full privileges (member deletion, gateway configuration views).
   - **Receptionist**: Restricted view (no deletion privileges, front desk operations focus).
2. **Member Management**:
   - Register new members, search directory, filter by status, and edit profiles.
   - Smart renewal helper that auto-calculates plan durations (1, 3, 6, 12 months).
3. **Daily Attendance Gateway**:
   - Front-desk manual search & check-in triggers.
   - Prevents duplicate check-ins on the same day.
   - Filters attendance logs by date for historical reporting.
4. **Income Collections & Receipts**:
   - Log payments (UPI, Card, Cash) and auto-generate unique receipt numbers.
   - Display printable receipt invoice modals.
5. **Phase 2 Biometric Ready Features**:
   - Database schemas pre-configured with biometric linking columns (`device_user_id`, `attendance_method`, `device_log_id`).
   - Configuration table for biometric reader terminals (`device_settings`).
   - Decoupled `AttendanceService` separating route controllers from SQLite db logic.
   - Reserved and mocked device endpoints for synchronization and synchronization commands.

---

## Tech Stack

- **Frontend**: React (Vite, React Router v7, Lucide Icons)
- **Styling**: Tailwind CSS v4 (modern CSS-first build compile engine)
- **Backend**: Node.js + Express (ES Modules)
- **Database**: SQLite (self-contained local file storage `gym.db`)
- **Authentication**: JWT (JSON Web Tokens) and password hashing with `bcryptjs`

---

## Folder Structure

```
d:\FullStack/
├── package.json               # Root scripts (starts backend and frontend concurrently)
├── .env.example               # Template environment variables
├── .env                       # Active environment settings
├── docs/                      # Project documentation
│   └── PROJECT_CONTEXT.md     # Centralized system architecture and rules reference
├── backend/                   # Node.js + Express API
│   ├── package.json
│   ├── server.js              # Server entry point & API endpoints
│   ├── database.js            # SQLite database initialization & seeding
│   ├── auth.js                # JWT validation & bcrypt helpers
│   ├── services/
│   │   └── attendanceService.js # Decoupled attendance service layer
│   └── .env                   # Backend local env parameters
└── frontend/                  # React client via Vite
    ├── package.json
    ├── index.html             # Entry page
    ├── vite.config.js         # Tailwind v4 plugin & development API reverse proxy
    └── src/
        ├── main.jsx
        ├── index.css          # Tailwind imports & custom glassmorphism styles
        ├── App.jsx            # Routing and overall page structure
        ├── context/
        │   └── AuthContext.jsx # Global session management and authenticated fetch helper
        ├── components/
        │   ├── Sidebar.jsx    # Left navigation
        │   ├── Header.jsx     # Top utility bar with Biometric Sync Trigger
        │   ├── ProtectedRoute.jsx # Route guarding
        │   ├── ConfirmModal.jsx # Danger confirmation modals
        │   └── Toast.jsx      # Top-right notification banners
        └── pages/
            ├── Login.jsx      # Auth screen with one-click test credentials
            ├── Dashboard.jsx  # Overview metrics & expiring list
            ├── Members.jsx    # Search, filters, add modal (with biometric configuration)
            ├── MemberProfile.jsx # Detail cards, check-in log table, receipts invoice
            ├── Attendance.jsx # Search check-in desk & date-based report logs
            ├── Payments.jsx   # Log transaction, receipt templates
            └── Renewals.jsx   # List expired memberships and quick renew
```

---

## Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

### 2. Installation
Run the following script at the root directory (`d:\FullStack`) to automatically install dependencies for the root, backend, and frontend folders:

```bash
npm run install:all
```

### 3. Run the Development Environment
Run the following command at the root directory to spin up both the Express API backend (Port 5000) and the React Vite client (Port 5173) simultaneously:

```bash
npm run dev
```

The frontend will automatically proxy requests matching `/api/*` to the backend. Open your browser to `http://localhost:5173`.

### 4. Logging In
For easy testing, you can click on the **Demo Accounts** button at the bottom of the sign-in page to autofill, or enter:
- **Admin Account**: Username `admin`, Password `admin123`
- **Receptionist Account**: Username `receptionist`, Password `recep123`

---

## Biometric Integration Design (Phase 2 Ready)

### Database Schemas
1. **`members`**:
   - `device_user_id`: Stores the ID assigned on the physical ZKTeco/eSSL hardware.
   - `attendance_method`: Mode selected (`fingerprint`, `face`, `card`, `password`, `qr`, `manual`).
2. **`attendance`**:
   - `attendance_method`: Record mode used.
   - `device_log_id`: Unique check-in transaction log reference downloaded from the device.
3. **`device_settings`**:
   - Stores device terminal IP, port, active flag, and last logs synchronization timestamp.

### Service Layer Decoupling
All attendance verification, duplicate checking, and database writes are encapsulated in `backend/services/attendanceService.js`. When a biometric synchronization task is running (e.g., pulling transaction logs from a scanner via TCP/IP sockets), it can safely execute `AttendanceService.checkInMember` directly inside background workers without touching HTTP/API controllers.

### Reserved API Routes
- `GET /api/device/status`: Retrieves list of configured terminals and connection pings.
- `POST /api/device/sync`: Pulls logs from a biometric gateway terminal.
- `GET /api/device/logs`: Retrieves raw cached logs buffer from target device.
- `GET /api/device/users`: Pulls user templates enrolled on terminal keypads.
