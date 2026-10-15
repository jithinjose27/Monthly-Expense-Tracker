<<<<<<< HEAD
# Monthly-Expense-Tracker
=======
# Monthly Personal Expense Tracker (Cloud Web Application)

A clean, executive personal expense tracker designed specifically for daily food and lifestyle expense management — featuring dedicated tracking for **Chicken**, **Eggs**, and **Bananas**.

Accessible from any phone, laptop, or desktop via a single public URL with **instant cross-device synchronization**, **Supabase PostgreSQL cloud database**, **secure authentication**, and **public portfolio showcase mode**.

---

## 🌟 Key Features

### 1. Multi-Year & Full-Year Calendar Support
- **Full Coverage**: Easily navigate across October 2026 – December 2026, all 12 months of 2027, and beyond.
- **Independent Monthly Records**: Each month has its own isolated records and budget. October 2026 data and ₹12,510 budget are preserved as an authentic baseline.
- **Accurate Day Calculations**: Automatically generates 28, 29, 30, or 31 rows based on the selected month, with leap year handling.

### 2. Dual-Role Security Architecture
- **Public Portfolio Mode (Read-Only)**: Anyone with your website link can view and inspect your expense data, explore monthly breakdowns, view charts, and download CSV/Excel spreadsheets without logging in.
- **Authorized Owner Editing**: Only your authenticated account can add, modify, or delete expenses and change budgets.
- **Row Level Security (RLS)**: Enforced directly at the PostgreSQL database level. Even if visitors inspect frontend code or send direct API requests, all unauthorized writes are rejected.

### 3. Dedicated Dietary & Living Expense Columns
1. `Date` (e.g., `03 Oct 2026`) - Sticky column on mobile
2. `Day` (e.g., `Sat`) with weekend indicators - Sticky column on mobile
3. `Chicken (₹)` (dedicated dietary tracking)
4. `Eggs (₹)` (dedicated dietary tracking)
5. `Bananas (₹)` (dedicated dietary tracking)
6. `Other Food (₹)` (vegetables, dairy, dining)
7. `Other Expenses (₹)` (utilities, bills, shopping)
8. `Daily Total (₹)` (automatic live calculation)
9. `Notes` (context, quantities, e.g. *"Chicken 200g, 14 eggs"*)

### 4. Executive KPI Dashboard & Visual Charts
- **Live Recalculations**: Grand Total, Remaining Budget, Average Daily Expense, Peak Spending Day, Low Day, and Food Share %.
- **Category Doughnut Chart**: Interactive SVG doughnut with percentage contributions.
- **Daily Trend Bar Chart**: Visual bar chart with monthly average reference line and click-to-scroll to jump directly to any day.
- **Budget Alerts**: Visual progress bar and dynamic alerts for on-track, warning (80%), and over-budget states.

### 5. Client-Side Data Portability
- **Export to Excel (.xls)**: Instant client-side download of a formatted spreadsheet with XML formulas.
- **Export to CSV**: Plain text data export.
- **Print / PDF**: Clean, print-optimized stylesheet.

---

## 📁 Project Structure

```
Monthly-Expense-Tracker/
├── src/                                  # 🌐 Frontend Web Application (Deployed to Vercel)
│   ├── index.html                        # Application interface & spreadsheet
│   ├── styles.css                        # Executive styling, themes & responsive rules
│   ├── app.js                            # Core logic, calculations, charts & cloud sync
│   └── supabase-config.js                # Public cloud configuration
│
├── database/                             # 🗄️ Database & Schema (For Supabase)
│   ├── supabase_schema.sql               # Table definitions & Row Level Security (RLS)
│   └── seed_october_2026.sql             # October 2026 data migration script
│
├── scripts/                              # 🐍 Python Tools & Local Utilities
│   ├── generate_excel.py                 # OpenXML Excel engine
│   ├── generate_seed_sql.py              # Excel-to-SQL migration generator
│   ├── server.py                         # Local test server
│   └── Monthly_Expense_October_2026.xlsx # Preserved historical Excel workbook
│
├── .gitignore                            # Git ignore rules for caches, lock files, and secrets
├── vercel.json                           # Vercel deployment configuration (outputDirectory: src)
└── README.md                             # Project documentation & guide
```

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Set Up Supabase (Database & Authentication)
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** and name it (e.g., `personal-expense-tracker`).
3. In the Supabase Dashboard, open the **SQL Editor** (left navigation).
4. Open [database/supabase_schema.sql](database/supabase_schema.sql), paste its entire content into the SQL Editor, and click **Run**.
   - This creates `expenses` and `monthly_budgets` tables.
   - It enables Row Level Security (RLS) with public read access and owner-only editing.
5. In your Supabase Dashboard, go to **Authentication > Users** and click **Add User > Create User** (or use your app's "Create Owner Account" option in the UI).
6. In the SQL Editor, open [database/seed_october_2026.sql](database/seed_october_2026.sql), paste its content, and click **Run**.
   - This populates your existing October 2026 budget (₹12,510) and all recorded expenses into the database!
7. In the Supabase Dashboard, go to **Project Settings > API**:
   - Copy your **Project URL** (e.g. `https://xyzcompany.supabase.co`).
   - Copy your **Project API anon public key** (the publishable key starting with `ey...`).
   - *(Never copy or share the `service_role` secret key)*.

### Step 2: Configure Credentials in the App
You can either:
- Open [src/supabase-config.js](src/supabase-config.js) and paste the `url` and `anonKey`.
- OR open the website, click **⚙️ Cloud Setup** in the status bar, paste your Project URL and Anon Key, and click **Save & Connect**. (Saved safely in browser storage).

### Step 3: Push to GitHub (Private Repository)
```bash
git init
git add .
git commit -m "feat: migrate expense tracker to cloud web app with Supabase and multi-year support"
git branch -M main
# Create a private repository on github.com, then run:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 4: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New... > Project**.
3. Import your private repository.
4. Framework Preset: **Other** (Static HTML). Root Directory: `./`.
5. Click **Deploy**.
6. In ~15 seconds, Vercel gives you your free, secure public HTTPS URL (e.g. `https://my-expenses.vercel.app`).

---

## 🔒 Verification
- **On Ubuntu Desktop**: Open your public URL. You will see all your October 2026 expenses in **Visitor (Read-Only)** mode. Click **Sign In**, enter your email/password, and full editing mode unlocks.
- **On Android Phone**: Open the same URL. Sign in as owner. Change or add an expense today.
- Reopen on Ubuntu desktop: your updates are instantly saved in PostgreSQL and loaded seamlessly!
>>>>>>> f7307ec (feat: implement personal cloud web app with Supabase, public read access, multi-year support, and sticky mobile layout)
