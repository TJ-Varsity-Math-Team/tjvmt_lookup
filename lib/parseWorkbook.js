import { google } from "googleapis";
import { loadDecryptedServiceAccount } from "./decryptServiceAccount.js"; // adjust path if needed

// Configure which sheets/columns to expose
const EXCEL_VIEW_CONFIG = [
  { sheetName: "Numbering", columns: ["Rank", "Total", "Volunteering", "Self-Org Comps", "Lecturing", "Thursday Practices", "8th Periods", "Problem Proposals", "Other (SARML)"] },
  { sheetName: "PUMaC Rankings", columns: ["Rank", "Overall Index"] },
  { sheetName: "NT TST", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "COMBO TST", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "GEO TST", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "ALG TST", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "Proof", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "Duke 1", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "Duke 2", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "Duke 3", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] },
  { sheetName: "Duke 4", columns: ["Index", "P1", "P2", "P3", "P4", "P5", "P6"] }
];

// Column used for user filtering
const ION_ID_COLUMN = "Ion ID";

// Turn 2D array from Sheets API into array of objects keyed by header
function valuesToObjects(values, headerRowIndex = 0) {
  if (!values || values.length === 0) return { headers: [], rows: [] };
  const headerRow = values[headerRowIndex] || [];
  const headers = headerRow.map((h) => String(h || "").trim());
  const rows = values.slice(headerRowIndex + 1).map((rowArr) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = rowArr[i] ?? "";
    });
    return obj;
  });
  return { headers, rows };
}

function pickColumns(row, desiredColumns) {
  return Object.fromEntries(desiredColumns.map((col) => [col, row[col] ?? ""]));
}

async function getSheetsClient() {
  const sa = loadDecryptedServiceAccount();
  const jwt = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  await jwt.authorize();
  return google.sheets({ version: "v4", auth: jwt });
}

/**
 * Fetch configured sheets from Google Sheets and return rows
 * filtered by Ion ID for the given user.
 *
 * Env vars required:
 *   - SPREADSHEET_ID = the Google Sheet ID (from the sheet URL)
 */
export async function parseWorkbookForUser(ion_username) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing SPREADSHEET_ID env var (Google Sheet ID).");
  }

  if (!ion_username) {
    return EXCEL_VIEW_CONFIG.map((cfg) => ({
      sheetName: cfg.sheetName,
      headers: cfg.columns,
      data: [],
      missing: false,
    }));
  }

  const sheets = await getSheetsClient();
  const results = [];

  for (const cfg of EXCEL_VIEW_CONFIG) {
    try {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: cfg.sheetName, // request the whole sheet by tab name
      });

      const { values } = resp.data;
      const headerRowIndex = cfg.sheetName === "PUMaC Rankings" ? 1 : 0;
      const { headers, rows } = valuesToObjects(values, headerRowIndex);

      const filtered = rows
        .filter((r) => String(r[ION_ID_COLUMN] ?? "").trim() === String(ion_username).trim())
        .map((r) => pickColumns(r, cfg.columns));

      results.push({
        sheetName: cfg.sheetName,
        headers: cfg.columns,
        data: filtered,
        missing: false,
      });
    } catch (err) {
      results.push({
        sheetName: cfg.sheetName,
        headers: cfg.columns,
        data: [],
        missing: true,
      });
    }
  }

  return results;
}
