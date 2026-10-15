#!/usr/bin/env python3
"""
Generates seed SQL for October 2026 expenses and budget from Monthly_Expense_October_2026.xlsx.
Matches the schema in supabase_schema.sql.
"""

import os
import generate_excel

def generate_seed():
    excel_file = "Monthly_Expense_October_2026.xlsx"
    if not os.path.exists(excel_file):
        print(f"File {excel_file} not found.")
        return

    data = generate_excel.parse_excel_workbook(excel_file)
    budget = data.get("budget", 12510.0)
    days = data.get("days", {})

    sql_lines = []
    sql_lines.append("-- ============================================================================")
    sql_lines.append("-- Seed SQL: October 2026 Data Migration from Excel")
    sql_lines.append("-- Run this in Supabase SQL Editor AFTER you have signed up your account.")
    sql_lines.append("-- Replace 'YOUR_USER_ID_HERE' with your actual Supabase auth user UUID,")
    sql_lines.append("-- OR this script automatically fetches the first user ID from auth.users.")
    sql_lines.append("-- ============================================================================\n")
    sql_lines.append("DO $$")
    sql_lines.append("DECLARE")
    sql_lines.append("    target_user_id UUID;")
    sql_lines.append("BEGIN")
    sql_lines.append("    -- Automatically selects your user ID if you are the only user in auth.users")
    sql_lines.append("    SELECT id INTO target_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;")
    sql_lines.append("    IF target_user_id IS NULL THEN")
    sql_lines.append("        RAISE NOTICE 'No user found in auth.users! Sign up in your app first, then run this seed.';")
    sql_lines.append("        RETURN;")
    sql_lines.append("    END IF;\n")

    # Insert Budget
    sql_lines.append("    -- Insert October 2026 Budget")
    sql_lines.append(f"    INSERT INTO public.monthly_budgets (user_id, year, month, budget)")
    sql_lines.append(f"    VALUES (target_user_id, 2026, 10, {budget})")
    sql_lines.append(f"    ON CONFLICT (user_id, year, month) DO UPDATE SET budget = EXCLUDED.budget;\n")

    # Insert Expenses
    sql_lines.append("    -- Insert October 2026 Daily Expenses")
    for day_str, vals in sorted(days.items(), key=lambda x: int(x[0])):
        d = int(day_str)
        date_str = f"2026-10-{d:02d}"
        c = vals.get('chicken', 0.0)
        e = vals.get('eggs', 0.0)
        b = vals.get('bananas', 0.0)
        f = vals.get('otherFood', 0.0)
        o = vals.get('otherExp', 0.0)
        notes = vals.get('notes', '').replace("'", "''")

        # Even if 0, keep consistency or insert all days
        sql_lines.append(
            f"    INSERT INTO public.expenses (user_id, expense_date, chicken, eggs, bananas, other_food, other_exp, notes) "
            f"VALUES (target_user_id, '{date_str}', {c}, {e}, {b}, {f}, {o}, '{notes}') "
            f"ON CONFLICT (user_id, expense_date) DO UPDATE SET "
            f"chicken = EXCLUDED.chicken, eggs = EXCLUDED.eggs, bananas = EXCLUDED.bananas, "
            f"other_food = EXCLUDED.other_food, other_exp = EXCLUDED.other_exp, notes = EXCLUDED.notes;"
        )

    sql_lines.append("\n    RAISE NOTICE 'Successfully seeded October 2026 budget (₹%) and % days of expenses!', " + f"{budget}, {len(days)};")
    sql_lines.append("END $$;\n")

    output_file = "seed_october_2026.sql"
    with open(output_file, "w") as out:
        out.write("\n".join(sql_lines))

    print(f"Generated {output_file} successfully!")

if __name__ == '__main__':
    generate_seed()
