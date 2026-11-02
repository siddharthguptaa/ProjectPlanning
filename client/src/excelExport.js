import * as XLSX from 'xlsx';
import { effectiveRevisedEnd, manDaysFor, varianceFor } from './dateMath.js';

// Builds a .xlsx file with two sheets (Epics, Milestones) for the given
// project, and triggers a browser download. `XLSX.utils.aoa_to_sheet`
// just means "array of arrays to sheet" — each inner array is one row.
export function exportProjectToExcel(project) {
  const epicRows = [
    ['Epic', 'Description', 'Plan Start', 'Plan End', 'Revised End', 'Actual Start', 'Actual End', 'Actual Complete', 'Man-days', 'Variance']
  ];
  project.epics.forEach((epic) => {
    const plannedManDays = manDaysFor(epic);
    const variance = varianceFor(epic);
    epicRows.push([
      epic.name || '',
      epic.description || '',
      epic.planStart || '',
      epic.planEnd || '',
      effectiveRevisedEnd(epic) || '',
      epic.actualStart || '',
      epic.actualEnd || '',
      epic.actualComplete || '',
      plannedManDays === null ? '' : plannedManDays,
      variance === null ? '' : variance.value
    ]);
  });

  const milestoneRows = [['Milestone', 'Type', 'Description', 'Planned Date', 'Actual Date']];
  project.milestones.forEach((milestone) => {
    milestoneRows.push([
      milestone.name || '',
      milestone.category === 'customer' ? 'Customer' : 'Project',
      milestone.description || '',
      milestone.plannedDate || '',
      milestone.actualDate || ''
    ]);
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(epicRows), 'Epics');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(milestoneRows), 'Milestones');

  const safeFileName = project.name.replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'roadmap';
  XLSX.writeFile(workbook, safeFileName + '.xlsx');
}
