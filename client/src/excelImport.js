import * as XLSX from 'xlsx';

// Accepts "YYYY-MM-DD" text, or a JS Date/number that the spreadsheet
// library may hand back for cells Excel auto-formatted as dates, and
// normalizes everything to a plain "YYYY-MM-DD" string (or null).
function normalizeDateCell(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const text = value.toString().trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null; // couldn't make sense of it
}

function sheetToRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

// Same column order as excelExport.js writes:
// Epic, Description, Plan Start, Plan End, Revised End, Actual Start, Actual End, Actual Complete, Man-days, Variance
function parseEpicRows(workbook) {
  const rows = sheetToRows(workbook, 'Epics');
  const added = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    if (index === 0) return; // header row

    const name = (row[0] || '').toString().trim();
    const planStart = normalizeDateCell(row[2]);
    const planEnd = normalizeDateCell(row[3]);
    const actualStart = normalizeDateCell(row[5]);

    // Same rules as the Add Epic form: name is required, plan dates are
    // either both present or both absent, and there must be SOMETHING
    // (a plan, or at least an actual start) to put on the timeline.
    if (!name) { skipped++; return; }
    if ((planStart || planEnd) && !(planStart && planEnd)) { skipped++; return; }
    if (!planStart && !actualStart) { skipped++; return; }

    added.push({
      name,
      description: (row[1] || '').toString(),
      planStart: planStart || null,
      planEnd: planEnd || null,
      revisedEnd: planStart ? (normalizeDateCell(row[4]) || planEnd) : null,
      actualStart: actualStart || null,
      actualEnd: normalizeDateCell(row[6]) || null,
      actualComplete: normalizeDateCell(row[7]) || null
    });
  });

  return { added, skipped };
}

// Same column order as excelExport.js: Milestone, Type, Description, Planned Date, Actual Date
function parseMilestoneRows(workbook) {
  const rows = sheetToRows(workbook, 'Milestones');
  const added = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    if (index === 0) return;

    const name = (row[0] || '').toString().trim();
    const typeText = (row[1] || '').toString().trim().toLowerCase();
    const plannedDate = normalizeDateCell(row[3]);

    if (!name || !plannedDate) { skipped++; return; }

    added.push({
      name,
      category: typeText === 'customer' ? 'customer' : 'project',
      description: (row[2] || '').toString(),
      plannedDate,
      actualDate: normalizeDateCell(row[4]) || null
    });
  });

  return { added, skipped };
}

// Reads an uploaded .xlsx File and returns
// { epics: { added, skipped }, milestones: { added, skipped } }.
// `added` items have no `id` yet — the caller assigns those when merging
// them into a project, since only the caller knows the next free id.
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bytes = new Uint8Array(event.target.result);
        const workbook = XLSX.read(bytes, { type: 'array' });
        resolve({
          epics: parseEpicRows(workbook),
          milestones: parseMilestoneRows(workbook)
        });
      } catch (err) {
        reject(new Error('Could not read that file — make sure it\'s a .xlsx exported from this tool.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsArrayBuffer(file);
  });
}
