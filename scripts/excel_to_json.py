#!/usr/bin/env python3
"""
Convert a KEMET clearing & forwarding status workbook (e.g. "Mowara Status Update SEPT 8.xlsx")
into prisma/data/*.json, consumed by `npm run db:import`.

Sheets:
  * "Sheet1" (or any sheet not named offloaded) -> active shipments
  * "offloaded"                                 -> delivered / offloaded shipments
Columns (header names are matched case-insensitively, so column order may change):
  File Number | Client Name | Container No. | Bill of Lading/ Chassis Number | Shipping line/ Airline |
  Container Type | Copy Docs Received | Eta Mba/ Nairobi | Discharge date | Truck Number | Loaded out |
  ETA Malaba | ETA Lira | Pending Docs | Remarks
Usage: python3 scripts/excel_to_json.py <file.xlsx> [out.json]
"""
import json, re, sys
from datetime import date
import openpyxl

NA = {'', 'TBA', 'N/A', 'NA', '-', 'NONE'}
HEADER_KEYS = {
    'file number': 'fileNumber', 'client name': 'client', 'container no.': 'container',
    'bill of lading/ chassis number': 'bl', 'shipping line/ airline': 'line', 'shipping line': 'line',
    'container type': 'unitType', 'copy docs received': 'docsReceived', 'eta mba/ nairobi': 'etaPort',
    'eta mba': 'etaPort', 'discharge date': 'discharge', 'truck number': 'truck', 'loaded out': 'loadedOut',
    'eta malaba': 'etaBorder', 'eta lira': 'etaDestination', 'pending docs': 'pendingDocs', 'remarks': 'remarks',
}
DATE_RE = re.compile(r'^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$')
MONTHS = {m: i for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], 1)}
_MON = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*'
_DATE_TOKEN = r'(?:\d{1,2}\.\d{1,2}\.\d{2,4}|\d{1,2}\s+' + _MON + r'\s+\d{4})'
EVENT_SPLIT = re.compile(r'(?:^|\s+|\n)(?=' + _DATE_TOKEN + r'\b)')
EVENT_RE = re.compile(r'^(' + _DATE_TOKEN + r')\s*(.*)$', re.S)
LONG_DATE_RE = re.compile(r'^(\d{1,2})\s+(' + _MON + r')\s+(\d{4})$', re.I)
AWB_RE = re.compile(r'^\d{3}-\s*\d{6,}$')
AIRLINE_HINTS = ('airway', 'airline', 'qatar', 'quatar', 'emirates', 'ethiopian', 'turkish', 'dhl', 'kenya air')


def clean(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        v = str(int(v)) if float(v).is_integer() else str(v)
    if hasattr(v, 'strftime'):
        return v.strftime('%Y-%m-%d')
    s = re.sub(r'[ \t]+', ' ', str(v)).strip()
    return None if s.upper() in NA else s


def parse_date(v):
    if v is None:
        return None
    if hasattr(v, 'strftime'):
        return v.strftime('%Y-%m-%d')
    s = clean(v)
    if not s:
        return None
    lm = LONG_DATE_RE.match(s.strip())
    if lm:
        try:
            return date(int(lm.group(3)), MONTHS[lm.group(2)[:3].lower()], int(lm.group(1))).isoformat()
        except (ValueError, KeyError):
            return None
    m = DATE_RE.match(s.strip().rstrip('.'))
    if not m:
        return None
    d, mth, y = (int(x) for x in m.groups())
    y = 2000 + y if y < 100 else y
    try:
        return date(y, mth, d).isoformat()
    except ValueError:
        return None


def parse_events(text):
    """Split the free-text remarks log into dated events [{date, text}]."""
    if not text:
        return []
    out = []
    for chunk in EVENT_SPLIT.split(str(text)):
        chunk = re.sub(r'\s+', ' ', chunk).strip()
        if not chunk:
            continue
        m = EVENT_RE.match(chunk)
        if m and parse_date(m.group(1)):
            body = m.group(2).strip(' ,')
            if body:
                out.append({'date': parse_date(m.group(1)), 'text': body})
            elif out:
                continue
        elif out:
            out[-1]['text'] += ' ' + chunk
        else:
            out.append({'date': None, 'text': chunk})
    return out


def detect_mode(line, bl, container, unit):
    l = (line or '').lower()
    if any(h in l for h in AIRLINE_HINTS) or (bl and AWB_RE.match(bl)):
        return 'AIR'
    return 'SEA'


def map_headers(row):
    cols = {}
    for i, h in enumerate(row):
        key = HEADER_KEYS.get(re.sub(r'\s+', ' ', str(h or '')).strip().lower())
        if key and key not in cols:
            cols[key] = i
    return cols


def convert(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    units = []
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue
        offloaded = 'offload' in ws.title.lower()
        cols = map_headers(rows[0])
        for idx, r in enumerate(rows[1:], start=2):
            r = list(r) + [None] * 20
            g = lambda k: r[cols[k]] if k in cols else None
            file_no = clean(g('fileNumber'))
            if not file_no:
                continue
            # The "offloaded" sheet mixes two layouts: older rows have Remarks in col L,
            # newer rows carry ETA Malaba (L), ETA Lira (M) and Remarks (N).
            eta_border, eta_dest, remarks = g('etaBorder'), g('etaDestination'), g('remarks')
            if offloaded and 'etaBorder' not in cols:
                l, m, n = r[11], r[12], r[13]
                if n not in (None, ''):
                    eta_border, eta_dest, remarks = l, m, n
                else:
                    remarks = l
            container_raw = clean(g('container'))
            container_no, note = None, None
            if container_raw:
                mm = re.match(r'^([A-Z]{4})\s?(\d{7})\b\s*(.*)$', container_raw)
                if mm:
                    container_no, note = mm.group(1) + mm.group(2), (mm.group(3).strip(' ,') or None)
                else:
                    container_no = container_raw  # chassis / unit / package reference
            bl = clean(g('bl'))
            line = clean(g('line'))
            unit = clean(g('unitType'))
            units.append({
                'sheet': ws.title, 'row': idx, 'offloaded': offloaded,
                'fileNumber': file_no.replace(' ', ''),
                'client': re.sub(r'\s*/\s*', ' / ', clean(g('client')) or 'Unknown'),
                'containerNumber': container_no, 'containerNote': note,
                'billOfLading': bl, 'line': line, 'unitType': unit,
                'mode': detect_mode(line, bl, container_no, unit),
                'docsReceived': parse_date(g('docsReceived')), 'etaPort': parse_date(g('etaPort')),
                'discharge': parse_date(g('discharge')), 'truck': clean(g('truck')),
                'loadedOut': parse_date(g('loadedOut')), 'etaBorder': parse_date(eta_border),
                'etaDestination': parse_date(eta_dest), 'pendingDocs': clean(g('pendingDocs')),
                'remarks': (str(remarks).strip() if remarks else None),
                'events': parse_events(remarks),
            })
    return units


if __name__ == '__main__':
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else 'prisma/data/shipments.json'
    data = {'source': src.rsplit('/', 1)[-1], 'units': convert(src)}
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    files = {u['fileNumber'] for u in data['units']}
    print(f"✓ {len(data['units'])} units / {len(files)} files -> {out}")
