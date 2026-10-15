#!/usr/bin/env python3
"""
Monthly Expense Tracker - Excel (.xlsx) Engine
Handles reading and writing professional Excel workbooks with real dynamic formulas,
currency formatting (₹), freeze panes, and monthly summary calculations.
"""

import sys
import calendar
import datetime
import zipfile
import io
import os
import xml.etree.ElementTree as ET

def parse_excel_workbook(filename):
    """
    Parses an existing Monthly Expense Excel (.xlsx) file and extracts:
    - Monthly budget
    - Daily expenses (Chicken, Eggs, Bananas, Other Food, Other Expenses)
    - Notes
    - File modification timestamp and lock status
    """
    if not os.path.exists(filename):
        return None

    lock_file = os.path.join(os.path.dirname(filename), f".~lock.{os.path.basename(filename)}#")
    is_locked = os.path.exists(lock_file)
    last_modified = os.path.getmtime(filename)

    with zipfile.ZipFile(filename) as z:
        if 'xl/worksheets/sheet1.xml' not in z.namelist():
            return None

        sheet_xml = z.read('xl/worksheets/sheet1.xml')
        root = ET.fromstring(sheet_xml)
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in ss_root.findall('.//ns:si', ns):
                # Text can be in <t> directly or in rich text <r><t>
                text_parts = [t.text for t in si.findall('.//ns:t', ns) if t.text]
                shared_strings.append(''.join(text_parts))

        data = {
            'budget': 5000.0,
            'days': {},
            'lastModified': last_modified,
            'isLocked': is_locked,
            'filename': os.path.basename(filename)
        }

        for row in root.findall('.//ns:row', ns):
            r_idx = int(row.attrib.get('r', '0'))
            cells = {}
            for c in row.findall('.//ns:c', ns):
                col_letter = ''.join(ch for ch in c.attrib.get('r', '') if ch.isalpha())
                t_attr = c.attrib.get('t')
                v_el = c.find('ns:v', ns)
                is_el = c.find('.//ns:is/ns:t', ns)
                val = ''
                if v_el is not None and v_el.text:
                    if t_attr == 's':
                        idx = int(v_el.text)
                        val = shared_strings[idx] if idx < len(shared_strings) else ''
                    else:
                        val = v_el.text
                elif is_el is not None and is_el.text:
                    val = is_el.text
                cells[col_letter] = val

            # Check budget in cell L5
            if r_idx == 5 and 'L' in cells and cells['L']:
                try:
                    data['budget'] = float(cells['L'])
                except (ValueError, TypeError):
                    pass

            # Daily rows (5 to 35 for 31 days)
            if 5 <= r_idx <= 35:
                day_num = r_idx - 4
                def to_float(v):
                    try:
                        return float(v)
                    except (ValueError, TypeError):
                        return 0.0

                data['days'][day_num] = {
                    'chicken': to_float(cells.get('C', 0)),
                    'eggs': to_float(cells.get('D', 0)),
                    'bananas': to_float(cells.get('E', 0)),
                    'otherFood': to_float(cells.get('F', 0)),
                    'otherExp': to_float(cells.get('G', 0)),
                    'notes': cells.get('I', '')
                }

    return data


def create_excel_workbook(year=2026, month=10, budget=5000.0, output_filename=None, days_data=None):
    """
    Creates or updates an Excel (.xlsx) file with real dynamic formulas, styles, and freeze panes.
    """
    if output_filename is None:
        month_name = calendar.month_name[month]
        output_filename = f"Monthly_Expense_{month_name}_{year}.xlsx"

    days_in_month = calendar.monthrange(year, month)[1]
    month_name = calendar.month_name[month]

    content_types_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>'''

    rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

    workbook_rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

    sheet_title = f"{month_name} {year}"
    workbook_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="{sheet_title}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>'''

    styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0.00;(&quot;₹&quot;#,##0.00);&quot;-&quot;"/>
    <numFmt numFmtId="165" formatCode="0.0%"/>
    <numFmt numFmtId="166" formatCode="yyyy-mm-dd"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="10"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10"/><name val="Segoe UI"/><color rgb="FFFFFFFF"/></font>
    <font><b/><sz val="11"/><name val="Segoe UI"/><color rgb="FF0F172A"/></font>
    <font><b/><sz val="14"/><name val="Segoe UI"/><color rgb="FF1E3A8A"/></font>
    <font><b/><sz val="10"/><name val="Segoe UI"/><color rgb="FF1E293B"/></font>
    <font><i/><sz val="9"/><name val="Segoe UI"/><color rgb="FF64748B"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FF94A3B8"/></left>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <top style="thin"><color rgb="FF0F172A"/></top>
      <bottom style="double"><color rgb="FF0F172A"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="2" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="2" fillId="5" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>'''

    start_row = 5
    end_row = start_row + days_in_month - 1
    total_row = end_row + 1

    rows_xml = []

    # Title & Subtitle
    rows_xml.append(f'''    <row r="1" ht="28" customHeight="1">
      <c r="A1" s="9" t="inlineStr"><is><t>MONTHLY PERSONAL EXPENSE TRACKER - {month_name.upper()} {year}</t></is></c>
    </row>''')

    rows_xml.append(f'''    <row r="2" ht="18" customHeight="1">
      <c r="A2" s="0" t="inlineStr"><is><t>Track daily food expenses (Chicken, Eggs, Bananas) and monthly budget</t></is></c>
      <c r="K2" s="0" t="inlineStr"><is><t>Currency: Indian Rupees (₹)</t></is></c>
    </row>''')

    # Header Row
    rows_xml.append(f'''    <row r="4" ht="26" customHeight="1">
      <c r="A4" s="1" t="inlineStr"><is><t>Date</t></is></c>
      <c r="B4" s="1" t="inlineStr"><is><t>Day</t></is></c>
      <c r="C4" s="1" t="inlineStr"><is><t>Chicken (₹)</t></is></c>
      <c r="D4" s="1" t="inlineStr"><is><t>Eggs (₹)</t></is></c>
      <c r="E4" s="1" t="inlineStr"><is><t>Bananas (₹)</t></is></c>
      <c r="F4" s="1" t="inlineStr"><is><t>Other Food (₹)</t></is></c>
      <c r="G4" s="1" t="inlineStr"><is><t>Other Expenses (₹)</t></is></c>
      <c r="H4" s="1" t="inlineStr"><is><t>Daily Total (₹)</t></is></c>
      <c r="I4" s="1" t="inlineStr"><is><t>Notes</t></is></c>
      <c r="K4" s="1" t="inlineStr"><is><t>SUMMARY METRIC</t></is></c>
      <c r="L4" s="1" t="inlineStr"><is><t>AMOUNT (₹)</t></is></c>
    </row>''')

    # Default data mapping
    active_days_data = days_data or {}

    summary_items = [
        ("Monthly Budget", f'<c r="L5" s="11"><v>{budget:.2f}</v></c>'),
        ("Total Monthly Expense", f'<c r="L6" s="11"><f>H{total_row}</f><v>0.00</v></c>'),
        ("Remaining Budget", f'<c r="L7" s="11"><f>L5-L6</f><v>{budget:.2f}</v></c>'),
        ("Average Daily Expense", f'<c r="L8" s="11"><f>AVERAGE(H{start_row}:H{end_row})</f><v>0.00</v></c>'),
        ("Highest Spending Day", f'<c r="L9" s="11"><f>MAX(H{start_row}:H{end_row})</f><v>0.00</v></c>'),
        ("Total Chicken", f'<c r="L10" s="11"><f>C{total_row}</f><v>0.00</v></c>'),
        ("Total Eggs", f'<c r="L11" s="11"><f>D{total_row}</f><v>0.00</v></c>'),
        ("Total Bananas", f'<c r="L12" s="11"><f>E{total_row}</f><v>0.00</v></c>'),
        ("Total Other Food", f'<c r="L13" s="11"><f>F{total_row}</f><v>0.00</v></c>'),
        ("Total Other Expenses", f'<c r="L14" s="11"><f>G{total_row}</f><v>0.00</v></c>')
    ]

    for day in range(1, days_in_month + 1):
        row_idx = start_row + day - 1
        d = datetime.date(year, month, day)
        date_str = d.strftime("%d %b %Y")
        day_str = d.strftime("%A")

        d_entry = active_days_data.get(day, {})
        if isinstance(d_entry, (tuple, list)):
            c_val, e_val, b_val, f_val, o_val, note_str = d_entry
        else:
            c_val = float(d_entry.get('chicken', 0))
            e_val = float(d_entry.get('eggs', 0))
            b_val = float(d_entry.get('bananas', 0))
            f_val = float(d_entry.get('otherFood', 0))
            o_val = float(d_entry.get('otherExp', 0))
            note_str = str(d_entry.get('notes', ''))

        d_tot = c_val + e_val + b_val + f_val + o_val
        note_clean = note_str.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

        summary_idx = day - 1
        summary_cells = ""
        if summary_idx < len(summary_items):
            lbl, val_xml = summary_items[summary_idx]
            summary_cells = f'''
      <c r="K{row_idx}" s="10" t="inlineStr"><is><t>{lbl}</t></is></c>
      {val_xml}'''

        row_content = f'''    <row r="{row_idx}" ht="20">
      <c r="A{row_idx}" s="2" t="inlineStr"><is><t>{date_str}</t></is></c>
      <c r="B{row_idx}" s="2" t="inlineStr"><is><t>{day_str}</t></is></c>
      <c r="C{row_idx}" s="3"><v>{c_val:.2f}</v></c>
      <c r="D{row_idx}" s="3"><v>{e_val:.2f}</v></c>
      <c r="E{row_idx}" s="3"><v>{b_val:.2f}</v></c>
      <c r="F{row_idx}" s="3"><v>{f_val:.2f}</v></c>
      <c r="G{row_idx}" s="3"><v>{o_val:.2f}</v></c>
      <c r="H{row_idx}" s="4"><f>SUM(C{row_idx}:G{row_idx})</f><v>{d_tot:.2f}</v></c>
      <c r="I{row_idx}" s="5" t="inlineStr"><is><t>{note_clean}</t></is></c>{summary_cells}
    </row>'''
        rows_xml.append(row_content)

    # Initial sums
    init_c = sum(float(active_days_data.get(d, {}).get('chicken', 0) if isinstance(active_days_data.get(d, {}), dict) else active_days_data.get(d, (0,0,0,0,0))[0]) for d in range(1, days_in_month + 1))
    init_e = sum(float(active_days_data.get(d, {}).get('eggs', 0) if isinstance(active_days_data.get(d, {}), dict) else active_days_data.get(d, (0,0,0,0,0))[1]) for d in range(1, days_in_month + 1))
    init_b = sum(float(active_days_data.get(d, {}).get('bananas', 0) if isinstance(active_days_data.get(d, {}), dict) else active_days_data.get(d, (0,0,0,0,0))[2]) for d in range(1, days_in_month + 1))
    init_f = sum(float(active_days_data.get(d, {}).get('otherFood', 0) if isinstance(active_days_data.get(d, {}), dict) else active_days_data.get(d, (0,0,0,0,0))[3]) for d in range(1, days_in_month + 1))
    init_o = sum(float(active_days_data.get(d, {}).get('otherExp', 0) if isinstance(active_days_data.get(d, {}), dict) else active_days_data.get(d, (0,0,0,0,0))[4]) for d in range(1, days_in_month + 1))
    init_grand = init_c + init_e + init_b + init_f + init_o

    # TOTAL ROW
    total_row_content = f'''    <row r="{total_row}" ht="24" customHeight="1">
      <c r="A{total_row}" s="6" t="inlineStr"><is><t>TOTAL</t></is></c>
      <c r="B{total_row}" s="6" t="inlineStr"><is><t></t></is></c>
      <c r="C{total_row}" s="7"><f>SUM(C{start_row}:C{end_row})</f><v>{init_c:.2f}</v></c>
      <c r="D{total_row}" s="7"><f>SUM(D{start_row}:D{end_row})</f><v>{init_e:.2f}</v></c>
      <c r="E{total_row}" s="7"><f>SUM(E{start_row}:E{end_row})</f><v>{init_b:.2f}</v></c>
      <c r="F{total_row}" s="7"><f>SUM(F{start_row}:F{end_row})</f><v>{init_f:.2f}</v></c>
      <c r="G{total_row}" s="7"><f>SUM(G{start_row}:G{end_row})</f><v>{init_o:.2f}</v></c>
      <c r="H{total_row}" s="8"><f>SUM(H{start_row}:H{end_row})</f><v>{init_grand:.2f}</v></c>
      <c r="I{total_row}" s="6" t="inlineStr"><is><t></t></is></c>
    </row>'''
    rows_xml.append(total_row_content)

    sheet_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="13" customWidth="1"/>
    <col min="3" max="3" width="14" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="13" customWidth="1"/>
    <col min="6" max="6" width="15" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
    <col min="8" max="8" width="16" customWidth="1"/>
    <col min="9" max="9" width="35" customWidth="1"/>
    <col min="10" max="10" width="4" customWidth="1"/>
    <col min="11" max="11" width="22" customWidth="1"/>
    <col min="12" max="12" width="16" customWidth="1"/>
  </cols>
  <sheetData>
{chr(10).join(rows_xml)}
  </sheetData>
</worksheet>'''

    # Write safely to temporary file first then replace
    temp_filename = f"{output_filename}.tmp"
    with zipfile.ZipFile(temp_filename, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types_xml)
        z.writestr('_rels/.rels', rels_xml)
        z.writestr('xl/_rels/workbook.xml.rels', workbook_rels_xml)
        z.writestr('xl/workbook.xml', workbook_xml)
        z.writestr('xl/styles.xml', styles_xml)
        z.writestr('xl/worksheets/sheet1.xml', sheet_xml)

    os.replace(temp_filename, output_filename)
    return output_filename

if __name__ == '__main__':
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    month = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    budget = float(sys.argv[3]) if len(sys.argv) > 3 else 5000.0
    out = sys.argv[4] if len(sys.argv) > 4 else None
    create_excel_workbook(year, month, budget, out)
