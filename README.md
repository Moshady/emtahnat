# ULTRA PROFESSIONAL EXAM MICROBUS RESERVATION SYSTEM
## Enterprise Transportation Reservation Platform - Deployment & Setup Guide

This document provides complete instructions for configuring, deploying, and running the **Exam Microbus Reservation System**. The project is structured as a single-page enterprise web application with a Supabase realtime backend, making it fast, secure, and production-ready.

---

## 1. Folder Structure Explanation

Since this project follows the "Single-File Application" design paradigm, the repository is highly optimized for deployment and portability:

```text
ويبسايت/
├── index.html           # Main application file (HTML5 + Premium CSS + Modular JS)
├── schema.sql           # Database schema, constraints, security, and seeds
└── README.md            # Complete system documentation (This file)
```

- **`index.html`** containing:
  - Responsive layouts and multi-stage workflows (Landing Page, Student Portal, Admin Panel).
  - Premium Vanilla CSS with a state-of-the-art Dark/Light glassmorphism theme system.
  - Client-side application controllers using CDN resources (Supabase, Chart.js, HTML5-QRCode, etc.).
- **`schema.sql`** containing all setup structures, RLS policies, trigger code, transaction-safe lock procedures, and mock seeds.

---

## 2. Database Setup Guide

Follow these steps to set up the Supabase database instance:

1. **Create a Supabase Project**:
   - Log in to [Supabase Console](https://supabase.com/).
   - Click **New Project**, select an organization, name your project (e.g. `Exam Microbus Reservation`), choose a database password, and select your hosting region.

2. **Run the Database Schema**:
   - Once the database is ready, go to the left navigation bar and click **SQL Editor**.
   - Click **New Query**.
   - Copy the entire contents of [schema.sql](file:///c:/Users/M7mod/Desktop/ويبسايت/schema.sql) and paste them into the SQL Editor.
   - Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`).
   - Verify that the execution succeeds and all tables, views, and functions are created.

---

## 3. Supabase Configuration Guide

To support instant seat updates and secure workflows, you must configure Realtime and extract the project keys.

### A. Enabling Supabase Realtime
Supabase Realtime uses replication to broadcast database changes to connected clients. We must enable it for the `seat_locks` and `reservations` tables:

1. Go to **Database** (left sidebar) -> **Replication**.
2. Locate the **`supabase_realtime`** publication and click **Edit**.
3. Toggle the replication **ON** for the following tables:
   - `seat_locks`
   - `reservations`
   - `seats` (optional, if you want real-time layout adjustments to reflect instantly)
4. Save the configuration.

### B. Extracting API Credentials
1. Go to **Project Settings** (gear icon in the left sidebar) -> **API**.
2. Copy the following credentials:
   - **Project URL**: Under the *API Settings* section.
   - **Anon Public API Key**: Under *Project API keys* (make sure it's the `anon public` key, NOT the `service_role` key).
3. Open `index.html` and replace the placeholder values at the top of the script section:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
   const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';
   ```

---

## 4. Security Guide

This system uses a highly secure access model designed for client-only applications:

- **Row Level Security (RLS)**: RLS is active on all tables. By default, anonymous clients can only read configuration and reservation datasets. Direct inserts, updates, and deletes are disabled on crucial data points.
- **Security Definer Procedures**: To modify data safely, the frontend calls transactional stored procedures (Remote Procedure Calls - RPCs) written in PostgreSQL PL/pgSQL:
  - `lock_seat(...)` and `confirm_reservation(...)` check constraints, verify time windows, and manage locks transactionally, preventing double bookings.
  - `admin_save_student(...)`, `admin_save_bus(...)`, and other CRUD helpers check the admin credentials (`p_admin_user` and `p_admin_pass_hash`) on the database side before performing mutations.
- **Password Protection**: The default admin password hash stored in the seed is SHA-256:
  - **Username**: `admin`
  - **Password**: `admin123`
  - To customize the admin credentials, hash your new password using SHA-256 and update the `admins` table.

---

## 5. Deployment Guide & Instructions

Because the frontend is a single-file application, you can host it for free with maximum performance and minimal latency on any static hosting provider.

### Option A: Vercel (Recommended)
1. Install the Vercel CLI (`npm install -g vercel`) or log in to [vercel.com](https://vercel.com).
2. Open your terminal in the project directory (`ويبسايت`).
3. Run `vercel`. Follow the interactive instructions (Link to new project, accept default settings).
4. Vercel will build and provide a production URL (e.g. `https://your-project.vercel.app`).

### Option B: Netlify
1. Log in to [Netlify Dashboard](https://app.netlify.com/).
2. Drag and drop the `ويبسايت` folder directly into the deployment zone.
3. Your web page will be online instantly.

### Option C: GitHub Pages
1. Create a repository on GitHub.
2. Push `index.html`, `schema.sql`, and `README.md` to the main branch.
3. Go to **Settings** -> **Pages** in your repository.
4. Select the main branch as your build source and save.

---

## 6. PWA & Offline Support

The application is built with a Progressive Web App (PWA) manifest and a service worker declaration directly inside the HTML file to support local caching:

- **Offline Alerts**: Uses HTML5 network APIs (`navigator.onLine`) to detect connection loss and alert users.
- **Offline Tickets**: If a student has already confirmed their booking, their ticket details are cached in `localStorage` so they can open and print the ticket even when offline in transit.
