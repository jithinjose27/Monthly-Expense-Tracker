# Monthly Expense Tracker

Before diving into how everything works, you can check out the live version here:
[monthly-expense-tracker-flame.vercel.app](https://monthly-expense-tracker-flame.vercel.app/)

The public link opens in read-only visitor mode by default. You can freely switch between months and years, look over daily expense records, explore interactive charts, test calculations, and export spreadsheet reports without needing to create an account or sign in.

---

## About This Project

I built this personal expense tracker to solve a very practical, daily need: keeping close track of my food and lifestyle spending without relying on heavy, bloated financial apps or manual paper notes.

In my routine, I wanted dedicated tracking for daily protein and staple groceries (specifically Chicken, Eggs, and Fruits) separately from general meals, dining out, and other recurring living expenses. Having dedicated columns for these items lets me immediately see how much of my monthly budget goes toward nutrition versus general living costs.

### How the Project Evolved

1. The Local Setup:
   It originally started as a local project using Python scripts and an Excel spreadsheet on my laptop. While that was functional at home, it was inconvenient when I was out buying groceries or wanting to log expenses directly from my phone.

2. Moving to the Cloud:
   To make it accessible anywhere, I rebuilt it into a responsive web application backed by a cloud database. It connects to Supabase (a managed PostgreSQL database with built-in authentication and security rules) and deploys automatically on Vercel whenever I update my code.

3. Mobile & Phone App Support:
   Just like my Holy Bible project, I wanted this tracker to feel like a real app on my phone, not just a bookmark in a browser tab. It now supports both direct Progressive Web App (PWA) installation from the browser and a standalone Android app (APK) built with Capacitor.

---

## What the App Does

- Multi-Year Calendar Navigation: You can jump across any month and year (e.g. October 2026, all months of 2027, and beyond) with independent records and budgets for each month. Days of the month and leap years are calculated automatically.
- Dual Access Model:
  - Visitor Mode: When visitors open the site, they get full read-only access to view data, charts, and summaries.
  - Owner Mode: When I sign in with my account, the spreadsheet unlocks in-line editing, budget adjustments, and automatic cloud synchronization.
- Real Database Security (RLS): Security is not just a hidden button on the screen. It is enforced directly inside the PostgreSQL database using Supabase Row Level Security. Even if someone inspects the website code or tries to send direct API requests, the database rejects any unauthorized changes.
- Visual Dashboard & Metrics:
  - Real-time totals, average daily expense, and remaining budget calculation.
  - Interactive category breakdown doughnut chart showing what percentage of your budget goes to food.
  - Daily spending bar chart with a monthly average line.
  - Peak and low spending day indicators.
  - Visual budget health indicators (on track, warning threshold, or exceeded).
- Mobile-Optimized Interface: Sticky date and day columns allow easy side-scrolling on phones without losing track of which day you are editing.
- Data Portability: You can export any month to a formatted Excel workbook (.xls) with calculation formulas, download as a CSV file, or print a clean summary sheet.

---

## Let Me Teach You How to Build This on Your Own

If you want to create your own cloud-connected expense tracker, I have laid out the entire process below so you can follow along step by step.

### Step 1: Clone the Code

Start by cloning this repository to your computer:

```bash
git clone https://github.com/YOUR_USERNAME/Monthly-Expense-Tracker.git
cd Monthly-Expense-Tracker
```

### Step 2: Set Up Your Free Cloud Database (Supabase)

Supabase gives you a real PostgreSQL database with user authentication for free.

1. Go to supabase.com and create a free account.
2. Click "New Project", give it a name (such as `my-expense-tracker`), and set a database password.
3. Open the "SQL Editor" from the left menu.
4. Copy the SQL code from `database/supabase_schema.sql` in this repo, paste it into the SQL Editor, and click "Run".
   - This creates two tables: `expenses` (storing daily entries for chicken, eggs, fruits, other food, other expenses, and notes) and `monthly_budgets` (storing your budget per month).
   - It also turns on Row Level Security (RLS) policies so anyone can view the tracker, but only your authenticated account can make changes.
5. In the Supabase sidebar, go to "Authentication" > "Users" and click "Add User" > "Create User". Enter the email and password you want to use for your owner login.
6. In the Supabase sidebar, go to "Project Settings" > "API":
   - Copy your "Project URL".
   - Copy your "Project API anon public key" (the publishable key starting with `ey...`).
   - Keep your `service_role` key private; you only need the anon key for the frontend.

### Step 3: Connect Your App to Supabase

You can link your credentials in one of two ways:

Method A (Directly through the website interface):
Open the website, click "Cloud Setup" in the bottom status bar, paste your Project URL and Anon Public Key, and click "Save & Connect". These credentials will be stored safely in your browser local storage.

Method B (Pre-configured in code):
Open `src/supabase-config.js` and set your defaults:

```javascript
window.SUPABASE_CONFIG = {
  url: window.localStorage.getItem('supabase_project_url') || 'YOUR_SUPABASE_PROJECT_URL',
  anonKey: window.localStorage.getItem('supabase_anon_key') || 'YOUR_SUPABASE_ANON_KEY'
};
```

### Step 4: Deploy Your Web Version to Vercel

Vercel provides free, high-speed static hosting with automatic HTTPS:

1. Push your project to a GitHub repository.
2. Sign in to vercel.com using your GitHub account.
3. Click "Add New Project" and import your repository.
4. The project includes a `vercel.json` file that tells Vercel to serve files from the `src` folder. Keep framework preset as "Other" and root directory as `./`.
5. Click "Deploy". In a few moments, your website will be live on a secure HTTPS domain.

---

## Using It as a Phone App

You do not need to keep opening browser tabs every time you buy groceries. Here are two ways you can run this tracker on your phone:

### Option 1: Install Instantly as a PWA (No App Store or Build Required)

The project includes a web app manifest and service worker:

1. Open your live Vercel URL on your phone's browser (e.g. Chrome on Android or Safari on iPhone).
2. On Android: Tap the three dots menu in Chrome and select "Install app" or "Add to Home screen".
3. On iPhone: Tap the Share button in Safari and tap "Add to Home Screen".
4. The app will install directly onto your home screen with its own icon and open in full-screen mode just like a native app.

### Option 2: Build the Native Android App (APK) with Capacitor

If you want a standalone Android APK package (just like in the Holy Bible project):

1. Install project dependencies:
   ```bash
   yarn install
   ```
2. Build the Android APK with a single command:
   ```bash
   yarn build:apk
   ```
   This command automatically syncs the web assets into the Android native wrapper (`npx cap sync android`) and compiles the debug APK via Gradle.
3. Once the build finishes, you will find `MonthlyExpenseTracker-debug.apk` directly in the project root directory.
4. Transfer this APK file to your phone and install it, or install it via your terminal using ADB:
   ```bash
   adb install -r MonthlyExpenseTracker-debug.apk
   ```

---

## Running Locally on Your Computer

If you want to test or make changes locally before pushing:

```bash
# Option 1: Using Python simple server
python3 -m http.server 5000 --directory src

# Option 2: Using the local Python server in scripts
python3 scripts/server.py
```

Then visit `http://localhost:5000` in your browser.

---

## Project Structure

```
Monthly-Expense-Tracker/
├── src/                                  # Web application & PWA source
│   ├── index.html                        # Main interface and spreadsheet
│   ├── styles.css                        # Themes, responsive layout & sticky columns
│   ├── app.js                            # State, calculations, charts & cloud sync
│   ├── supabase-config.js                # Database connection settings
│   ├── manifest.json                     # PWA configuration
│   ├── sw.js                             # Service worker for offline caching
│   └── icons/                            # App icons (PWA & Android launcher)
│
├── android/                              # Native Android project (Capacitor)
│   ├── app/                              # Android app configuration, manifests, & resources
│   └── gradlew                           # Gradle build wrapper
│
├── database/                             # Database SQL scripts
│   ├── supabase_schema.sql               # PostgreSQL tables and RLS security rules
│   └── seed_october_2026.sql             # Historical data migration script
│
├── scripts/                              # Local utilities
│   ├── generate_excel.py                 # Spreadsheet generator
│   ├── generate_seed_sql.py              # Excel to SQL generator script
│   ├── server.py                         # Local Python development server
│   └── Monthly_Expense_October_2026.xlsx # Baseline spreadsheet
│
├── MonthlyExpenseTracker-debug.apk       # Standalone compiled Android APK
├── capacitor.config.json                 # Capacitor app configuration
├── package.json                          # Build scripts and dependencies
├── vercel.json                           # Vercel deployment configuration
├── .gitignore                            # Ignored build caches and dependencies
└── README.md                             # Documentation & tutorial
```

---

## License

This project is open source and available under the MIT License. Feel free to clone it, modify the categories, and adapt it for your own personal budgeting workflow.
