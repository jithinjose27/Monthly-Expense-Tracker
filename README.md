# Monthly Expense Tracker

A lightweight, responsive personal expense tracker designed for daily food and lifestyle budgeting. It features dedicated tracking for dietary staples (chicken, eggs, bananas) alongside general grocery and living expenses, paired with visual charts, monthly budget health indicators, and instant cross-device cloud synchronization.

You can explore the live deployment here:
[monthly-expense-tracker-flame.vercel.app](https://monthly-expense-tracker-flame.vercel.app/)

The public link opens in read-only visitor mode by default. You can browse through different months and years, view daily breakdown charts, inspect budget metrics, and test data exports without needing an account.

---

## Why This Project Exists

This project started from a simple personal need: tracking day-to-day food expenses and dietary habits accurately without the bloat of complex accounting software. Tracking items like chicken, eggs, and fruit separately from general household bills makes it easy to see where nutrition and grocery budgets actually go each month.

It originally began as a local setup using Python scripts and an Excel spreadsheet. While that worked well on a desktop, it was impossible to update quickly while out shopping or from a mobile phone.

To solve that, the project was rebuilt into a full cloud-connected web application:
- Accessible on any mobile phone, tablet, or desktop browser.
- Stores records in a managed PostgreSQL cloud database via Supabase.
- Deployed statically on Vercel with automatic continuous deployment on every code push.
- Protected by database-level security so anyone can view the portfolio demo, but only the owner can modify entries.

---

## What It Does

- Full Calendar and Multi-Year Navigation: Switch between any month and year with independent monthly records, automatic days-in-month calculations, and leap year handling.
- Dual Access Modes:
  - Visitor Mode (Public): Safe read-only access for portfolio demonstrations. Visitors can inspect records and charts, but all write attempts are blocked.
  - Owner Mode (Authenticated): Sign in with your account to unlock live in-line editing, budget adjustments, and automatic cloud saving.
- Real Database Security: Security is enforced at the database layer using Supabase Row Level Security (RLS) policies. Even if someone inspects the frontend code or sends custom API requests, unauthorized write operations are rejected by the database.
- Visual Analytics and KPIs:
  - Grand total and remaining monthly budget calculation.
  - Daily spending trend bar chart with monthly average reference lines.
  - Category breakdown doughnut chart showing food share percentage.
  - Highest and lowest spending day indicators.
  - Visual budget health indicators (on track, warning threshold, or exceeded).
- Mobile-Friendly Design: Clean table interface with sticky date and day columns so you can comfortably input expenses from a smartphone.
- Data Portability: Export your monthly data as a formatted Excel spreadsheet (.xls) with calculation formulas, download as a CSV file, or use the print-optimized stylesheet.

---

## How It Works

The architecture is kept minimal and straightforward:

- Frontend: Written in vanilla HTML, CSS, and modern JavaScript. There are no heavy frameworks, build steps, or bundle dependencies to manage.
- Database & Auth: Supabase provides the PostgreSQL database and user authentication. The frontend talks directly to the Supabase client using publishable public keys.
- Debounced Auto-Save: As you edit cells or modify your monthly budget, the app waits 700 milliseconds after you stop typing before sending updates to the cloud, preventing unnecessary network traffic.
- Hosting: Vercel serves the static files directly from the `src/` directory.

---

## Setting Up Your Own Tracker

If you would like to run your own copy of this expense tracker, follow the steps below.

### 1. Prerequisites

You will need free accounts on:
- GitHub (to host your repository)
- Supabase (for the cloud database and user login)
- Vercel (for hosting the web application)

### 2. Clone the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/YOUR_USERNAME/Monthly-Expense-Tracker.git
cd Monthly-Expense-Tracker
```

### 3. Create and Configure Your Supabase Database

1. Sign in to Supabase and click "New Project". Give your project a name and choose a database password.
2. In the Supabase sidebar, open the "SQL Editor".
3. Open the file `database/supabase_schema.sql` from this repository, copy its contents, paste them into the SQL Editor, and click "Run".
   - This creates the `expenses` and `monthly_budgets` tables.
   - It sets up Row Level Security (RLS) rules allowing public read access, while restricting insert, update, and delete permissions strictly to authenticated users.
4. Go to "Authentication" > "Users" in the Supabase sidebar and click "Add User" > "Create User". Enter your email and a password. This will be your owner account for logging into the tracker.
5. Go to "Project Settings" > "API":
   - Copy the "Project URL".
   - Copy the "Project API anon public key" (the publishable key starting with `ey...`).
   - Note: Never expose or use the `service_role` secret key.

### 4. Connect the App to Your Database

You have two simple ways to connect your credentials:

- Option A (In the browser): Launch the website, click "Cloud Setup" in the bottom status bar, paste your Project URL and Anon Public Key, and click "Save & Connect". These are saved locally in your browser storage.
- Option B (In the source code): Open `src/supabase-config.js` and set your defaults:
  ```javascript
  window.SUPABASE_CONFIG = {
    url: window.localStorage.getItem('supabase_project_url') || 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: window.localStorage.getItem('supabase_anon_key') || 'YOUR_SUPABASE_ANON_KEY'
  };
  ```

### 5. Deploy to Vercel

1. Push your repository to GitHub.
2. Sign in to Vercel using your GitHub account.
3. Click "Add New..." > "Project" and select your repository.
4. Vercel will read `vercel.json` (which designates `src` as the output directory). Keep framework preset as "Other".
5. Click "Deploy". Within seconds, you will receive your live HTTPS website URL.

### 6. (Optional) Running Locally

If you prefer to run or test the app on your computer:

```bash
# Using Python's built-in server
python3 -m http.server 5000 --directory src

# Or using the local sync script in scripts/
python3 scripts/server.py
```

Then open `http://localhost:5000` in your web browser.

---

## Project Structure

```
Monthly-Expense-Tracker/
├── src/                                  # Frontend web application
│   ├── index.html                        # Main user interface and spreadsheet layout
│   ├── styles.css                        # Responsive styles, themes, and sticky columns
│   ├── app.js                            # State management, calculations, and Supabase sync
│   └── supabase-config.js                # Public database configuration
│
├── database/                             # Database scripts
│   ├── supabase_schema.sql               # PostgreSQL tables and Row Level Security rules
│   └── seed_october_2026.sql             # Historical data migration script
│
├── scripts/                              # Local utilities
│   ├── generate_excel.py                 # Spreadsheet generator
│   ├── generate_seed_sql.py              # Excel to SQL generator script
│   ├── server.py                         # Local Python development server
│   └── Monthly_Expense_October_2026.xlsx # Baseline spreadsheet
│
├── vercel.json                           # Vercel deployment configuration
├── .gitignore                            # Ignored files and local caches
└── README.md                             # Documentation
```

---

## License

This project is open source and available under the MIT License. Feel free to adapt it for your own personal budgeting needs.
