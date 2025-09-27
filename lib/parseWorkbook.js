import path from "path";
import XLSX from "xlsx";

const EXCEL_FILE = path.join(process.cwd(), "data.xlsx");

// Configure which sheets/columns to expose
const EXCEL_VIEW_CONFIG = [
  { sheetName: "Duke 1", columns: ["P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "Duke 2", columns: ["P1", "P2", "P3", "P4", "P5", "P6"] },
  {sheetName: "Duke 3", columns: ["P1", "P2", "P3", "P4", "P5", "P6"]},
  {sheetName: "Duke 4", columns: ["P1", "P2", "P3", "P4", "P5", "P6"]},
  {sheetName: "Proof", columns: ["P1", "P2", "P3", "P4", "P5", "P6"]}
];

// Column used for user filtering
const ION_ID_COLUMN = "Ion ID";

// --- Helpers ---

// Trim + normalize header names once (optional robustness).
function normalizeHeader(h) {
  return String(h || "").trim();
}

// Keep only desired columns (missing columns become "").
function pickColumns(row, desiredColumns) {
  return Object.fromEntries(
    desiredColumns.map((col) => [col, row[col] ?? ""])
  );
}

// Convert a worksheet to array of row objects using first row as header.
function sheetToRows(ws) {
  // defval: "" ensures missing cells are empty strings rather than undefined
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

// --- Public API ---

/**
 * Parse workbook and return ONLY rows matching the given ion_username.
 * Nothing else (unfiltered rows / columns) leaves this function.
 *
 * @param {string} ion_username  The logged-in user's username to match against "Ion ID".
 * @returns {Array<{sheetName:string, headers:string[], data:Array<object>, missing:boolean}>}
 */
export function parseWorkbookForUser(ion_username) {
  if (!ion_username) {
    // Return empty data if we weren't given a username
    return EXCEL_VIEW_CONFIG.map((cfg) => ({
      sheetName: cfg.sheetName,
      headers: cfg.columns,
      data: [],
      missing: false
    }));
  }

  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const results = [];

  for (const cfg of EXCEL_VIEW_CONFIG) {
    const ws = wb.Sheets[cfg.sheetName];
    if (!ws) {
      results.push({
        sheetName: cfg.sheetName,
        headers: cfg.columns,
        data: [],
        missing: true
      });
      continue;
    }

    // Read all rows from this sheet
    const rows = sheetToRows(ws);

    // Ensure we’re reading the same header keys the caller expects (by exact text).
    // If header spelling/case differs, align here (optional).
    // For strictness we assume exact matches to cfg.columns, including "Ion ID".
    const filtered = rows
      .filter((r) => String(r[ION_ID_COLUMN] ?? "").trim() === String(ion_username).trim())
      .map((r) => pickColumns(r, cfg.columns));

    results.push({
      sheetName: cfg.sheetName,
      headers: cfg.columns,
      data: filtered,
      missing: false
    });
  }

  return results;
}
