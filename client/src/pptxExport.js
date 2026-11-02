import PptxGenJS from 'pptxgenjs';
import {
  parseDate, daysBetween, todayUTC,
  effectiveRevisedEnd, effectiveActualFinish, manDaysFor, varianceFor, remainingWorkdaysFor,
  milestoneVariance
} from './dateMath.js';

// -----------------------------------------------------------------------
// Brand constants — colors and fonts extracted from the Motherson Group
// template files (theme1.xml's clrScheme/fontScheme). See the project
// notes for where these came from; they shouldn't need to change unless
// the brand template itself changes.
// -----------------------------------------------------------------------
const MOTHERSON = {
  red: 'DA2128', dk1: '231F20', dk2: '575756', lt2: 'DADADA',
  mint: '8AB48F', purple: '4D2A6C', unplanned: '4D2A6C', orange: 'EB5B36',
  redTint: 'F7DEDC', mintTint: 'E3EDE4',
  fontHead: 'Aptos Light', fontBody: 'Aptos Display'
};

// Motherson wordmark (red, for light backgrounds), extracted from the
// brand master template's media files.
const LOGO_RED_SVG = '<svg viewBox="0 0 141.73 32.14" xmlns="http://www.w3.org/2000/svg"><path d="M0 21.3 3.7 21.3 3.7 23.15C4.28 22.17 5.42 21.3 7.09 21.3 8.52 21.3 9.51 21.89 10.03 23.01 10.96 21.81 12.24 21.3 13.61 21.3 15.66 21.3 17.15 22.56 17.15 25.14L17.15 32.11 13.45 32.11 13.45 25.73C13.45 24.69 12.91 24.18 12.06 24.18 11.07 24.18 10.4 24.79 10.4 25.91L10.4 32.11 6.74 32.11 6.74 25.73C6.74 24.69 6.2 24.18 5.35 24.18 4.36 24.18 3.7 24.79 3.7 25.91L3.7 32.11 0 32.11 0 21.3Z" fill="#DA2128"/><path d="M18.41 26.85 18.41 26.69C18.41 23.38 21 21.29 24.35 21.29 27.7 21.29 30.25 23.32 30.25 26.59L30.25 26.75C30.25 30.1 27.66 32.11 24.33 32.11 21 32.11 18.41 30.18 18.41 26.85M26.48 26.79 26.48 26.63C26.48 24.9 25.76 23.93 24.35 23.93 22.94 23.93 22.2 24.86 22.2 26.59L22.2 26.75C22.2 28.52 22.92 29.49 24.35 29.49 25.78 29.49 26.48 28.5 26.48 26.79" fill="#DA2128"/><path d="M35.59 28.23 35.59 23.98 37.72 23.98 37.72 21.58 35.59 21.58 35.59 18.97 31.89 20.39 31.89 21.58 30.59 21.58 30.59 23.98 31.89 23.98 31.89 28.57C31.89 30.99 33.25 32.12 35.7 32.12 36.57 32.12 37.27 31.94 37.75 31.82L37.75 29.14C37.42 29.26 37.11 29.32 36.69 29.32 35.99 29.32 35.6 28.98 35.6 28.23" fill="#DA2128"/><path d="M46.5 21.3C44.7 21.3 43.52 22.17 42.94 23.23L42.94 18.33 42.94 18.33 42.94 16.18 39.24 17.6 39.24 32.11 42.94 32.11 42.94 26.1C42.94 24.78 43.69 24.15 44.78 24.15 45.87 24.15 46.33 24.72 46.33 25.88L46.33 32.1C46.33 32.1 50.03 32.1 50.03 32.1L50.03 25.17C50.03 22.53 48.58 21.29 46.49 21.29" fill="#DA2128"/><path d="M51.27 26.85 51.27 26.69C51.27 23.38 53.85 21.29 57.12 21.29 60.08 21.29 62.62 22.9 62.62 26.61L62.62 27.53 55.01 27.53C55.11 28.89 55.94 29.68 57.27 29.68 58.49 29.68 59.01 29.15 59.15 28.46L62.63 28.46C62.3 30.78 60.41 32.1 57.15 32.1 53.89 32.1 51.27 30.21 51.27 26.84M59.03 25.55C58.97 24.31 58.33 23.62 57.13 23.62 56.01 23.62 55.25 24.31 55.06 25.55L59.03 25.55Z" fill="#DA2128"/><path d="M64.04 21.3 67.75 21.3 67.75 23.49C68.43 21.95 69.57 21.28 71.24 21.31L71.24 24.6C68.98 24.54 67.74 25.21 67.74 26.87L67.74 32.13 64.04 32.13 64.04 21.32Z" fill="#DA2128"/><path d="M71.83 28.61 75.24 28.61C75.36 29.36 75.72 29.77 76.77 29.77 77.68 29.77 78.09 29.43 78.09 28.92 78.09 28.41 77.57 28.19 76.08 27.99 73.19 27.64 71.96 26.83 71.96 24.68 71.96 22.39 74.09 21.29 76.6 21.29 79.27 21.29 81.13 22.16 81.38 24.62L78.03 24.62C77.89 23.93 77.49 23.59 76.64 23.59 75.79 23.59 75.42 23.93 75.42 24.4 75.42 24.87 75.92 25.09 77.24 25.25 80.24 25.61 81.69 26.35 81.69 28.56 81.69 31 79.79 32.11 76.79 32.11 73.79 32.11 71.91 30.89 71.83 28.6" fill="#DA2128"/><path d="M82.37 26.85 82.37 26.69C82.37 23.38 84.95 21.29 88.31 21.29 91.67 21.29 94.21 23.32 94.21 26.59L94.21 26.75C94.21 30.1 91.62 32.11 88.29 32.11 84.96 32.11 82.37 30.18 82.37 26.85M90.43 26.79 90.43 26.63C90.43 24.9 89.71 23.93 88.3 23.93 86.89 23.93 86.15 24.86 86.15 26.59L86.15 26.75C86.15 28.52 86.87 29.49 88.3 29.49 89.73 29.49 90.43 28.5 90.43 26.79" fill="#DA2128"/><path d="M95.52 21.3 99.2 21.3 99.22 23.23C99.8 22.17 100.98 21.3 102.78 21.3 104.87 21.3 106.32 22.54 106.32 25.18L106.32 32.11 102.61 32.11 102.61 25.89C102.61 24.73 102.14 24.16 101.06 24.16 99.98 24.16 99.22 24.79 99.22 26.11L99.22 32.12 95.52 32.12 95.52 21.31Z" fill="#DA2128"/><path d="M136.11 2.25C134.7 2.86 133.72 4.26 133.7 5.89L133.7 32.14 139.32 32.14C140.65 32.14 141.73 31.06 141.73 29.73L141.73 0 136.11 2.25Z" fill="#DA2128"/><path d="M125.66 10.28C124.25 10.89 123.27 12.29 123.25 13.92L123.25 32.14C123.25 32.14 128.87 32.14 128.87 32.14 130.2 32.14 131.28 31.06 131.28 29.73L131.28 8.03 125.66 10.28Z" fill="#DA2128"/><path d="M115.22 18.32C113.81 18.93 112.83 20.33 112.81 21.96L112.81 32.14C112.81 32.14 118.43 32.14 118.43 32.14 119.76 32.14 120.84 31.06 120.84 29.73L120.84 16.07 115.22 18.32Z" fill="#DA2128"/></svg>';

// White variant (for the red/dark backgrounds used on the title/agenda slides)
const LOGO_WHITE_SVG = LOGO_RED_SVG.replace(/#DA2128/g, '#FFFFFF');

// Stacked icon + wordmark (red), used on the thank-you slide.
const LOGO_STACKED_SVG = '<svg viewBox="0 0 144.93 192.56" xmlns="http://www.w3.org/2000/svg"><path d="M116.75 11.31C109.71 14.4 104.77 21.4 104.67 29.58L104.67 161.5C104.67 161.5 132.85 161.5 132.85 161.5 139.52 161.5 144.93 156.08 144.93 149.39L144.93 0 116.75 11.31Z" fill="#DA2128"/><path d="M64.41 51.68C57.37 54.77 52.43 61.77 52.33 69.95L52.33 161.5C52.33 161.5 80.51 161.5 80.51 161.5 87.18 161.5 92.59 156.08 92.59 149.39L92.59 40.38 64.41 51.69Z" fill="#DA2128"/><path d="M12.08 92.06C5.04 95.14 0.1 102.15 0 110.33L0 161.5C0 161.5 28.18 161.5 28.18 161.5 34.85 161.5 40.26 156.08 40.26 149.39L40.26 80.75 12.08 92.05Z" fill="#DA2128"/><path d="M0 177.77 5.05 177.77 5.05 180.3C5.84 178.95 7.39 177.77 9.68 177.77 11.63 177.77 12.98 178.58 13.69 180.11 14.96 178.47 16.71 177.77 18.57 177.77 21.36 177.77 23.39 179.49 23.39 183.02L23.39 192.54 18.35 192.54 18.35 183.82C18.35 182.39 17.61 181.69 16.46 181.69 15.11 181.69 14.2 182.53 14.2 184.06L14.2 192.54 9.21 192.54 9.21 183.81C9.21 182.38 8.48 181.68 7.32 181.68 5.97 181.68 5.06 182.52 5.06 184.05L5.06 192.53 0 192.53 0 177.74Z" fill="#DA2128"/><path d="M25.1 185.36 25.1 185.15C25.1 180.62 28.63 177.77 33.19 177.77 37.75 177.77 41.23 180.54 41.23 185.01L41.23 185.22C41.23 189.8 37.7 192.55 33.17 192.55 28.64 192.55 25.1 189.91 25.1 185.36M36.1 185.28 36.1 185.07C36.1 182.7 35.11 181.38 33.19 181.38 31.27 181.38 30.26 182.65 30.26 185.02L30.26 185.23C30.26 187.65 31.25 188.97 33.19 188.97 35.13 188.97 36.1 187.62 36.1 185.28" fill="#DA2128"/><path d="M48.51 187.24 48.51 181.42 51.41 181.42 51.41 178.14 48.51 178.14 48.51 174.57 43.46 176.52 43.46 178.14 41.68 178.14 41.68 181.42 43.46 181.42 43.46 187.69C43.46 191 45.32 192.54 48.65 192.54 49.83 192.54 50.79 192.3 51.44 192.14L51.44 188.48C50.99 188.64 50.57 188.72 50 188.72 49.04 188.72 48.51 188.26 48.51 187.24" fill="#DA2128"/><path d="M63.38 177.77C60.93 177.77 59.32 178.95 58.53 180.41L58.53 173.71 58.53 173.71 58.53 170.77 53.48 172.72 53.48 192.56 58.53 192.56 58.53 184.35C58.53 182.55 59.55 181.69 61.04 181.69 62.53 181.69 63.15 182.47 63.15 184.06L63.15 192.57C63.15 192.57 68.2 192.57 68.2 192.57L68.2 183.09C68.2 179.48 66.23 177.78 63.38 177.78" fill="#DA2128"/><path d="M69.9 185.36 69.9 185.15C69.9 180.63 73.42 177.77 77.88 177.77 81.91 177.77 85.38 179.98 85.38 185.04L85.38 186.31 75 186.31C75.14 188.17 76.27 189.25 78.08 189.25 79.74 189.25 80.45 188.52 80.65 187.58L85.39 187.58C84.94 190.76 82.37 192.56 77.92 192.56 73.47 192.56 69.91 189.98 69.91 185.37M80.47 183.59C80.38 181.89 79.51 180.95 77.87 180.95 76.35 180.95 75.3 181.89 75.05 183.59L80.47 183.59Z" fill="#DA2128"/><path d="M87.31 177.77 92.36 177.77 92.36 180.76C93.29 178.66 94.84 177.74 97.12 177.77L97.12 182.27C94.04 182.19 92.35 183.1 92.35 185.37L92.35 192.56 87.3 192.56 87.3 177.77Z" fill="#DA2128"/><path d="M97.91 187.76 102.56 187.76C102.73 188.78 103.21 189.35 104.65 189.35 105.89 189.35 106.45 188.89 106.45 188.19 106.45 187.49 105.74 187.19 103.71 186.92 99.76 186.44 98.1 185.33 98.1 182.4 98.1 179.27 101.01 177.77 104.42 177.77 108.06 177.77 110.59 178.95 110.93 182.32L106.36 182.32C106.16 181.38 105.63 180.92 104.47 180.92 103.31 180.92 102.81 181.38 102.81 182.02 102.81 182.66 103.49 182.96 105.29 183.18 109.38 183.66 111.35 184.69 111.35 187.7 111.35 191.04 108.76 192.55 104.67 192.55 100.58 192.55 98.01 190.88 97.9 187.76" fill="#DA2128"/><path d="M112.28 185.36 112.28 185.15C112.28 180.63 115.8 177.77 120.37 177.77 124.94 177.77 128.41 180.54 128.41 185.02L128.41 185.23C128.41 189.81 124.89 192.56 120.34 192.56 115.79 192.56 112.27 189.92 112.27 185.37M123.28 185.28 123.28 185.07C123.28 182.7 122.29 181.38 120.37 181.38 118.45 181.38 117.44 182.65 117.44 185.02L117.44 185.23C117.44 187.66 118.43 188.98 120.37 188.98 122.31 188.98 123.28 187.63 123.28 185.29" fill="#DA2128"/><path d="M130.21 177.77 135.23 177.77 135.25 180.41C136.04 178.96 137.65 177.77 140.1 177.77 142.95 177.77 144.92 179.47 144.92 183.08L144.92 192.56 139.87 192.56 139.87 184.05C139.87 182.46 139.23 181.68 137.76 181.68 136.29 181.68 135.25 182.54 135.25 184.34L135.25 192.55 130.2 192.55 130.2 177.77Z" fill="#DA2128"/></svg>';

const LOGO_AR = 32.14 / 141.73;   // wordmark height/width
const STACK_AR = 192.56 / 144.93; // stacked logo height/width

// Rasterizes an inline SVG to a PNG data URI via canvas — safer to embed
// in a .pptx than raw SVG, which some PowerPoint versions mishandle.
function svgToPngDataUri(svgText, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Logo image failed to render.'));
    img.src = 'data:image/svg+xml;base64,' + btoa(svgText);
  });
}

// Same date-range calculation used by the on-screen Timeline, just
// returning a fraction (0-1) instead of a percentage — pptxgenjs works
// in inches, so the caller multiplies this fraction by however many
// inches wide the timeline area is.
function computeExportRange(epics, milestones) {
  const today = todayUTC();
  let allDates = [today];

  epics.forEach((it) => {
    allDates.push(parseDate(it.planStart), parseDate(it.planEnd), parseDate(effectiveRevisedEnd(it)), parseDate(it.actualStart));
    const fin = effectiveActualFinish(it);
    allDates.push(fin.date ? parseDate(fin.date) : (fin.ongoing ? today : null));
  });
  milestones.forEach((ms) => {
    allDates.push(parseDate(ms.plannedDate));
    allDates.push(ms.actualDate ? parseDate(ms.actualDate) : null);
  });

  allDates = allDates.filter(Boolean);
  let minDate = new Date(Math.min(...allDates));
  let maxDate = new Date(Math.max(...allDates));

  const rangeDays = Math.max(daysBetween(minDate, maxDate), 14);
  const pad = Math.max(Math.round(rangeDays * 0.04), 3);
  minDate = new Date(minDate.getTime() - pad * 86400000);
  maxDate = new Date(maxDate.getTime() + pad * 86400000);
  const totalDays = daysBetween(minDate, maxDate);

  return { minDate, maxDate, today, frac: (d) => daysBetween(minDate, d) / totalDays };
}

// -----------------------------------------------------------------------
// Builds and downloads the whole deck for one project.
// -----------------------------------------------------------------------
export async function exportProjectToPptx(project) {
  const epics = project.epics;
  const milestones = project.milestones;
  const C = MOTHERSON;
  const range = computeExportRange(epics, milestones);

  const whiteLogo = await svgToPngDataUri(LOGO_WHITE_SVG, 700, 159);
  const stackedLogo = await svgToPngDataUri(LOGO_STACKED_SVG, 460, 610);

  const pres = new PptxGenJS();
  pres.defineLayout({ name: 'MOTHERSON_16x9', width: 10, height: 5.625 });
  pres.layout = 'MOTHERSON_16x9';
  pres.author = 'Motherson Group';
  pres.company = 'Motherson Group';
  pres.title = project.name + ' — Plan vs Actual';

  // ---- Slide 1: Title ----
  const s1 = pres.addSlide();
  s1.background = { color: C.red };
  const lw = 2.3, lh = lw * LOGO_AR;
  s1.addImage({ data: whiteLogo, x: 0.6, y: 0.5, w: lw, h: lh });
  s1.addText(project.name, { x: 0.6, y: 2.15, w: 8.8, h: 1.0, fontFace: C.fontHead, fontSize: 32, bold: true, color: 'FFFFFF' });
  s1.addText('Plan vs. Actual — Roadmap Timeline', { x: 0.6, y: 2.95, w: 8.8, h: 0.5, fontFace: C.fontBody, fontSize: 17, color: 'FFFFFF' });
  s1.addText(
    new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    { x: 0.6, y: 5.0, w: 5, h: 0.35, fontFace: C.fontBody, fontSize: 11, color: 'FFFFFF' }
  );

  // ---- Slide 2: Agenda ----
  const s2 = pres.addSlide();
  s2.background = { color: 'FFFFFF' };
  s2.addShape('rect', { x: 0, y: 0, w: 10, h: 0.85, fill: { color: C.red }, line: { type: 'none' } });
  const alw = 1.4, alh = alw * LOGO_AR;
  s2.addImage({ data: whiteLogo, x: 0.5, y: (0.85 - alh) / 2, w: alw, h: alh });
  s2.addText('Agenda', { x: 0.6, y: 1.15, w: 8.8, h: 0.6, fontFace: C.fontHead, fontSize: 24, bold: true, color: C.dk1 });
  const agendaItems = ['Timeline Overview', 'Epics — Plan vs Actual'];
  if (milestones.length) agendaItems.push('Milestones — Plan vs Actual');
  agendaItems.push('Thank You');
  const agendaRuns = agendaItems.map((text, i) => ({
    text: `${i + 1}.  ${text}`,
    options: { breakLine: true, fontFace: C.fontBody, fontSize: 18, color: C.dk2 }
  }));
  s2.addText(agendaRuns, { x: 0.9, y: 2.0, w: 8, h: 3, lineSpacingMultiple: 1.9 });

  // ---- Shared timeline geometry ----
  const X0 = 1.85, X1 = 9.55, rowH = 0.52, topY = 1.15;
  function xAt(date) { return X0 + (X1 - X0) * range.frac(date); }

  // Places a label to the right of a point normally; once that point is
  // close enough to the right edge that the label would run off the
  // slide, flips it to grow leftward instead.
  const SLIDE_RIGHT_SAFE = 9.65, SLIDE_LEFT_SAFE = 0.3;
  function edgeAwareText(slide, text, anchorX, y, w, opts) {
    const o = { ...opts, y, h: opts.h || 0.18 };
    if (anchorX + w > SLIDE_RIGHT_SAFE) {
      o.x = Math.max(SLIDE_LEFT_SAFE, anchorX - w);
      o.w = w;
      o.align = 'right';
    } else {
      o.x = anchorX;
      o.w = w;
    }
    slide.addText(text, o);
  }

  // --- Milestone lane-packing (Customer / Project rows) ---
  const MS_FONT_PT = 7, MS_CHAR_W_IN = (MS_FONT_PT * 0.62) / 72, MS_LABEL_PAD_IN = 0.10;
  const MS_LANE_GAP_IN = 0.10, MS_LANE_STEP_IN = 0.4;

  function milestoneLabelText(ms, v) {
    if (!v) return ms.name;
    if (v.pending && v.overdue) return `${ms.name} (${v.value}d overdue)`;
    if (v.pending && !v.overdue) return ms.name + (v.daysLeft === 0 ? ' (due today)' : ` (${v.daysLeft}d left)`);
    if (v.value === 0) return `${ms.name} (on time)`;
    return `${ms.name} (${v.value > 0 ? `+${v.value}d late` : `${Math.abs(v.value)}d early`})`;
  }

  function packMilestoneGroup(msList) {
    const items = msList.map((ms) => {
      const planned = parseDate(ms.plannedDate);
      const actual = ms.actualDate ? parseDate(ms.actualDate) : null;
      const v = milestoneVariance(ms);
      const label = milestoneLabelText(ms, v);
      const anchorDate = (actual && planned && actual < planned) ? actual : (planned || actual);
      return {
        ms, planned, actual, v, label,
        x: anchorDate ? xAt(anchorDate) : null,
        w: label.length * MS_CHAR_W_IN + MS_LABEL_PAD_IN
      };
    }).filter((it) => it.x !== null);

    const laneRightEdge = [];
    items.slice().sort((a, b) => a.x - b.x).forEach((it) => {
      let lane = laneRightEdge.findIndex((edge) => edge + MS_LANE_GAP_IN <= it.x);
      if (lane === -1) { lane = laneRightEdge.length; laneRightEdge.push(it.x + it.w); }
      else laneRightEdge[lane] = it.x + it.w;
      it.lane = lane;
    });
    const laneCount = Math.max(laneRightEdge.length, 1);
    return { items, rowH: 0.24 + laneCount * MS_LANE_STEP_IN };
  }

  const customerMsList = milestones.filter((ms) => ms.category === 'customer');
  const projectMsList = milestones.filter((ms) => ms.category !== 'customer');
  const customerGroup = customerMsList.length ? packMilestoneGroup(customerMsList) : null;
  const projectGroup = projectMsList.length ? packMilestoneGroup(projectMsList) : null;
  const msRowH = (customerGroup ? customerGroup.rowH : 0) + (projectGroup ? projectGroup.rowH : 0);

  // --- Timeline pagination: a fixed slide can only hold so many rows ---
  const MAX_ROWS_H = 3.85; // safe vertical budget before the legend/slide edge

  function drawTimelineSlide(epicsChunk, includeMilestones, pageNum, totalPages) {
    const s3 = pres.addSlide();
    s3.background = { color: 'FFFFFF' };
    s3.addShape('rect', { x: 0, y: 0, w: 10, h: 0.62, fill: { color: C.red }, line: { type: 'none' } });
    s3.addText(project.name, { x: 0.4, y: 0.07, w: 7.5, h: 0.32, fontFace: C.fontHead, fontSize: 17, bold: true, color: 'FFFFFF' });
    s3.addText(
      'PLAN VS. ACTUAL — TIMELINE' + (totalPages > 1 ? `  (${pageNum}/${totalPages})` : ''),
      { x: 0.4, y: 0.37, w: 7.5, h: 0.2, fontFace: C.fontBody, fontSize: 9, color: 'FFFFFF', charSpacing: 1 }
    );

    const thisMsRowH = includeMilestones ? msRowH : 0;
    const totalRowsH = thisMsRowH + rowH * epicsChunk.length;
    const panelTop = topY - 0.42, panelBottom = topY + totalRowsH + 0.06;

    s3.addShape('roundRect', { x: 0.25, y: panelTop, w: 9.5, h: panelBottom - panelTop, rectRadius: 0.06, fill: { type: 'none' }, line: { color: C.lt2, width: 1 } });
    s3.addShape('rect', { x: 0.25, y: topY, w: X0 - 0.35, h: totalRowsH, fill: { color: C.lt2, transparency: 78 }, line: { type: 'none' } });

    // Month gridlines — thinned out for long date ranges so labels don't overlap.
    let cursor = new Date(Date.UTC(range.minDate.getUTCFullYear(), range.minDate.getUTCMonth(), 1));
    if (cursor < range.minDate) cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let tickCount = 0;
    const countingCursor = new Date(cursor);
    while (countingCursor <= range.maxDate) { tickCount++; countingCursor.setUTCMonth(countingCursor.getUTCMonth() + 1); }
    const monthStride = Math.max(1, Math.ceil(tickCount / 12));
    let tickIndex = 0;
    while (cursor <= range.maxDate) {
      if (tickIndex % monthStride === 0) {
        const mx = xAt(cursor);
        s3.addText(`${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`, { x: mx, y: topY - 0.30, w: 1.0, h: 0.2, fontFace: C.fontBody, fontSize: 8, bold: true, color: C.dk2 });
        s3.addShape('rect', { x: mx, y: topY, w: 0.008, h: totalRowsH, fill: { color: C.lt2, transparency: 25 }, line: { type: 'none' } });
      }
      cursor = new Date(cursor);
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      tickIndex++;
    }

    let y = topY;
    const dSize = 0.13, half = dSize / 2;

    function drawMilestoneGroupRow(rowLabel, group) {
      s3.addText(rowLabel, { x: 0.4, y, w: X0 - 0.5, h: group.rowH, fontFace: C.fontBody, fontSize: 9, bold: true, color: C.dk1, valign: 'middle', charSpacing: 0.5 });
      group.items.forEach((it) => {
        const { planned, actual, v } = it;
        const laneY = y + 0.24 + it.lane * MS_LANE_STEP_IN;
        const diamondCenterY = laneY + 0.27;

        if (planned && actual) {
          const lo = Math.min(xAt(planned), xAt(actual)), hi = Math.max(xAt(planned), xAt(actual));
          if (hi > lo) s3.addShape('rect', { x: lo, y: diamondCenterY - 0.004, w: hi - lo, h: 0.008, fill: { color: C.dk2, transparency: 40 }, line: { type: 'none' } });
        }

        const overdue = !!(v && v.overdue);
        if (planned) {
          const px = xAt(planned);
          s3.addShape('diamond', { x: px - half, y: diamondCenterY - half, w: dSize, h: dSize, fill: { color: C.lt2 }, line: { color: C.dk2, width: 1.25, dashType: 'dash' } });
        }
        if (actual) {
          const ax = xAt(actual);
          const late = planned ? actual > planned : false;
          s3.addShape('diamond', { x: ax - half, y: diamondCenterY - half, w: dSize, h: dSize, fill: { color: late ? C.red : C.mint }, line: { color: late ? C.red : C.mint, width: 1 } });
        } else if (overdue) {
          const tx = xAt(range.today);
          s3.addShape('diamond', { x: tx - half, y: diamondCenterY - half, w: dSize, h: dSize, fill: { color: C.redTint }, line: { color: C.red, width: 1.25, dashType: 'dash' } });
        }

        edgeAwareText(s3, it.label, it.x + 0.11, laneY, Math.min(it.w, 3.4), { h: 0.15, fontFace: C.fontBody, fontSize: MS_FONT_PT, bold: overdue, color: overdue ? C.red : C.dk1 });
      });
      y += group.rowH;
    }

    if (includeMilestones && customerGroup) drawMilestoneGroupRow('CUSTOMER MILESTONES', customerGroup);
    if (includeMilestones && projectGroup) drawMilestoneGroupRow('PROJECT MILESTONES', projectGroup);

    epicsChunk.forEach((epic, idx) => {
      const ps = parseDate(epic.planStart), re = parseDate(effectiveRevisedEnd(epic));
      const as = parseDate(epic.actualStart);
      const fin = effectiveActualFinish(epic);
      const finishDate = fin.date ? parseDate(fin.date) : (fin.ongoing ? range.today : null);

      if (idx % 2 === 1) {
        s3.addShape('rect', { x: 0.25, y, w: 9.5, h: rowH, fill: { color: C.lt2, transparency: 85 }, line: { type: 'none' } });
      }

      const isUnplanned = !ps;
      const epicLabel = epic.name + (isUnplanned ? ' (unplanned)' : '');
      s3.addText(epicLabel, { x: 0.4, y, w: X0 - 0.5, h: rowH, fontFace: C.fontBody, fontSize: 9, bold: true, color: isUnplanned ? C.unplanned : C.dk1, valign: 'middle' });

      if (ps && re) {
        const bx = xAt(ps), bw = Math.max(xAt(re) - bx, 0.05);
        const plannedManDays = manDaysFor(epic);
        if (plannedManDays !== null) {
          edgeAwareText(s3, `${plannedManDays} md planned`, bx, y + 0.01, 1.1, { fontFace: C.fontBody, fontSize: 6.5, color: C.dk2 });
        }
        s3.addShape('rect', { x: bx, y: y + 0.17, w: bw, h: 0.12, fill: { color: C.lt2 }, line: { color: C.dk2, width: 1.25, dashType: 'dash' } });

        // If the commitment has been revised, mark where the ORIGINAL plan end used to be.
        const originalPlanEnd = parseDate(epic.planEnd);
        if (originalPlanEnd && epic.revisedEnd && epic.revisedEnd !== epic.planEnd) {
          const peX = xAt(originalPlanEnd);
          s3.addShape('rect', { x: peX, y: y + 0.14, w: 0.012, h: 0.18, fill: { color: C.orange }, line: { type: 'none' } });
          // The tick's caption sits in the same vertical band as the "X md
          // planned" label to its left. For a short epic, the two can be
          // close enough to collide — in that case, keep just the tick
          // (still flags the revision via its color) and skip the text.
          const ESTIMATED_LABEL_CLEARANCE = 0.85;
          if (peX - bx > ESTIMATED_LABEL_CLEARANCE) {
            edgeAwareText(s3, 'orig. end', peX + 0.03, y + 0.005, 0.7, { fontFace: C.fontBody, fontSize: 6, color: C.orange });
          }
        }
      }

      if (as && finishDate) {
        const isLate = (!isUnplanned && re) ? finishDate > re : false;
        const ax2 = xAt(as), aw = Math.max(xAt(finishDate) - ax2, 0.05);
        const barColor = isUnplanned ? C.unplanned : (isLate ? C.red : C.mint);
        s3.addShape('roundRect', { x: ax2, y: y + 0.34, w: aw, h: 0.12, rectRadius: 0.02, fill: { color: barColor }, line: { type: 'none' } });

        if (isUnplanned) {
          edgeAwareText(s3, 'Unplanned', ax2 + aw + 0.06, y + 0.29, 0.8, { fontFace: C.fontBody, fontSize: 7.5, bold: true, color: C.unplanned });
        } else {
          const variance = varianceFor(epic);
          if (variance !== null) {
            let label = variance.value === 0 ? 'On plan' : `${variance.value > 0 ? '+' : ''}${variance.value} md`;
            let labelW = 0.8;
            if (fin.ongoing) {
              const remaining = remainingWorkdaysFor(epic);
              if (remaining !== null) {
                label += remaining > 0 ? ` · ${remaining}d left` : remaining === 0 ? ' · due today' : ` · ${Math.abs(remaining)}d overdue`;
                labelW = 1.6;
              }
            }
            edgeAwareText(s3, label, ax2 + aw + 0.06, y + 0.29, labelW, { fontFace: C.fontBody, fontSize: 7.5, bold: true, color: variance.value > 0 ? C.red : C.mint });
          }
        }
      }

      y += rowH;
    });

    const todayX = xAt(range.today);
    s3.addShape('rect', { x: todayX, y: topY, w: 0.015, h: totalRowsH, fill: { color: C.dk1 }, line: { type: 'none' } });
    const todayChipW = 0.62;
    const todayChipX = Math.min(Math.max(todayX - todayChipW / 2, 0.3), 9.65 - todayChipW);
    const todayChipY = panelTop - 0.095; // small gap from both the header band above and the month-label row below
    s3.addShape('roundRect', { x: todayChipX, y: todayChipY, w: todayChipW, h: 0.2, rectRadius: 0.03, fill: { color: C.dk1 }, line: { type: 'none' } });
    s3.addText('TODAY', { x: todayChipX, y: todayChipY, w: todayChipW, h: 0.2, align: 'center', valign: 'middle', fontFace: C.fontBody, fontSize: 7.5, bold: true, color: 'FFFFFF', charSpacing: 0.5 });

    // Color legend, wrapping to a second row if there isn't room for all 7 items.
    const legendY = Math.min(Math.max(panelBottom + 0.18, 5.05), 5.15);
    const legendItems = [
      { shape: 'rect', color: C.lt2, line: C.dk2, dash: true, label: 'Planned' },
      { shape: 'rect', color: C.mint, line: C.mint, label: 'Actual — on/ahead of plan' },
      { shape: 'rect', color: C.red, line: C.red, label: 'Actual — behind plan' },
      { shape: 'rect', color: C.unplanned, line: C.unplanned, label: 'Unplanned work' },
      { shape: 'rect', color: C.orange, line: C.orange, label: 'Original plan end (if revised)' },
      { shape: 'diamond', color: C.lt2, line: C.dk2, dash: true, label: 'Planned milestone' },
      { shape: 'diamond', color: C.mint, line: C.mint, label: 'Actual milestone' }
    ];
    let legendX = 0.4, legendRowY = legendY;
    const ITEM_W = 1.48;
    legendItems.forEach((item) => {
      if (legendX + ITEM_W > 9.7) { legendX = 0.4; legendRowY += 0.22; }
      const sw = item.shape === 'diamond' ? 0.09 : 0.16, sh = 0.09;
      s3.addShape(item.shape, {
        x: legendX, y: legendRowY + (0.09 - sh) / 2, w: sw, h: sh,
        fill: { color: item.color }, line: { color: item.line, width: 1, dashType: item.dash ? 'dash' : 'solid' }
      });
      legendX += sw + 0.05;
      s3.addText(item.label, { x: legendX, y: legendRowY - 0.06, w: 1.38, h: 0.2, fontFace: C.fontBody, fontSize: 7, color: C.dk2 });
      legendX += ITEM_W;
    });
  }

  // Paginate: the first slide carries the milestone rows (if any), so it
  // has less room left for epics; continuation slides are epics-only and
  // get the full budget. Every page shares the same date axis.
  const firstPageBudget = MAX_ROWS_H - msRowH;
  const epicsPerFirstPage = Math.max(0, Math.floor(firstPageBudget / rowH));
  const epicsPerContinuation = Math.max(1, Math.floor(MAX_ROWS_H / rowH));

  let epicPages = [epics.slice(0, epicsPerFirstPage)];
  let rest = epics.slice(epicsPerFirstPage);
  while (rest.length > 0) {
    epicPages.push(rest.slice(0, epicsPerContinuation));
    rest = rest.slice(epicsPerContinuation);
  }
  if (epicPages.length > 1 && epicPages[0].length === 0 && epics.length === 0) epicPages = [[]];

  epicPages.forEach((chunk, i) => drawTimelineSlide(chunk, i === 0, i + 1, epicPages.length));

  // ---- Paginated tables (Epics, then Milestones) ----
  function addPaginatedTableSlides(titleText, headerLabels, bodyRows, colW, aligns, rowsPerSlide) {
    const CELL_BORDER = { type: 'solid', pt: 0.75, color: C.lt2 };
    const CELL_MARGIN = [4, 6, 4, 6];

    const headerRow = headerLabels.map((label, cIdx) => ({
      text: label.toUpperCase(),
      options: {
        fill: { color: C.red }, color: 'FFFFFF', bold: true, fontFace: C.fontBody, fontSize: 9,
        align: aligns[cIdx], valign: 'middle', charSpacing: 0.5, margin: CELL_MARGIN,
        border: { type: 'solid', pt: 0.75, color: C.red }
      }
    }));

    const pages = [];
    for (let i = 0; i < bodyRows.length; i += rowsPerSlide) pages.push(bodyRows.slice(i, i + rowsPerSlide));
    if (pages.length === 0) pages.push([]);

    pages.forEach((chunk, idx) => {
      const s = pres.addSlide();
      s.background = { color: 'FFFFFF' };
      s.addShape('rect', { x: 0, y: 0, w: 10, h: 0.6, fill: { color: C.red }, line: { type: 'none' } });
      const suffix = pages.length > 1 ? `  (${idx + 1}/${pages.length})` : '';
      s.addText(titleText + suffix, { x: 0.4, y: 0.09, w: 9, h: 0.42, fontFace: C.fontHead, fontSize: 18, bold: true, color: 'FFFFFF' });

      const styledChunk = chunk.map((row, rIdx) => {
        const zebra = rIdx % 2 === 1;
        return row.map((cell, cIdx) => ({
          text: cell.text,
          options: {
            ...cell.options,
            align: aligns[cIdx], valign: 'middle', margin: CELL_MARGIN, border: CELL_BORDER,
            fill: { color: zebra ? C.lt2 : 'FFFFFF', transparency: zebra ? 72 : 0 }
          }
        }));
      });

      s.addTable([headerRow, ...styledChunk], { x: 0.3, y: 0.85, w: 9.4, colW, border: CELL_BORDER });
    });
  }

  const ROWS_PER_SLIDE = 9; // conservative — a long epic name at 1.6in can wrap to 2+ lines
  const MS_ROWS_PER_SLIDE = 8; // milestones' Description column is wider and even more likely to wrap

  const epicHeaderLabels = ['Epic', 'Plan Start', 'Plan End', 'Revised End', 'Actual Start', 'Actual End', 'Actual Complete', 'Man-days', 'Variance'];
  const epicAligns = ['left', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center'];
  const epicBodyRows = epics.map((epic) => {
    const md = manDaysFor(epic), v = varianceFor(epic);
    const vColor = v ? (v.value > 0 ? C.red : (v.value < 0 ? C.mint : C.dk2)) : C.dk2;
    return [
      { text: epic.name, options: { fontFace: C.fontBody, fontSize: 9, bold: true, color: C.dk1 } },
      { text: epic.planStart || '—', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
      { text: epic.planEnd || '—', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
      { text: effectiveRevisedEnd(epic) || '—', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
      { text: epic.actualStart || '—', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
      { text: epic.actualEnd || '—', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
      { text: epic.actualComplete || (epic.actualStart ? 'In progress' : '—'), options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
      { text: md === null ? '—' : `${md} md`, options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
      { text: v === null ? '—' : `${v.value > 0 ? '+' : ''}${v.value} md${v.ongoing ? ' (so far)' : ''}`, options: { fontFace: C.fontBody, fontSize: 9, bold: true, color: vColor } }
    ];
  });
  addPaginatedTableSlides(
    'Epics — Plan vs Actual', epicHeaderLabels, epicBodyRows,
    [1.6, 0.85, 0.85, 0.95, 0.85, 0.85, 0.95, 0.75, 0.95], epicAligns, ROWS_PER_SLIDE
  );

  if (milestones.length) {
    const msHeaderLabels = ['Milestone', 'Type', 'Description', 'Planned', 'Actual', 'Variance', 'Time left'];
    const msAligns = ['left', 'center', 'left', 'center', 'center', 'center', 'center'];
    const msBodyRows = milestones.map((ms) => {
      const v = milestoneVariance(ms);
      let varText = '—', leftText = '—', varColor = C.dk2;
      if (v) {
        if (v.pending && !v.overdue) {
          varText = 'Not yet reached';
          leftText = v.daysLeft === 0 ? 'Due today' : `${v.daysLeft}d left`;
        } else if (v.pending && v.overdue) {
          varText = `${v.value}d overdue`;
          leftText = `${v.value}d overdue`;
          varColor = C.red;
        } else {
          varText = v.value === 0 ? 'On time' : `${v.value > 0 ? '+' : ''}${v.value}d`;
          leftText = 'Reached';
          varColor = v.value > 0 ? C.red : (v.value < 0 ? C.mint : C.dk2);
        }
      }
      return [
        { text: ms.name, options: { fontFace: C.fontBody, fontSize: 9, bold: true, color: C.dk1 } },
        { text: ms.category === 'customer' ? 'Customer' : 'Project', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
        { text: ms.description || '—', options: { fontFace: C.fontBody, fontSize: 8, color: C.dk2 } },
        { text: ms.plannedDate || '—', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
        { text: ms.actualDate || '—', options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } },
        { text: varText, options: { fontFace: C.fontBody, fontSize: 9, bold: true, color: varColor } },
        { text: leftText, options: { fontFace: C.fontBody, fontSize: 9, color: C.dk2 } }
      ];
    });
    addPaginatedTableSlides(
      'Milestones — Plan vs Actual', msHeaderLabels, msBodyRows,
      [1.3, 0.8, 2.6, 1.0, 1.0, 1.1, 1.2], msAligns, MS_ROWS_PER_SLIDE
    );
  }

  // ---- Final slide: Thank you ----
  const sEnd = pres.addSlide();
  sEnd.background = { color: 'FFFFFF' };
  const slw = 1.15, slh = slw * STACK_AR;
  sEnd.addImage({ data: stackedLogo, x: (10 - slw) / 2, y: 1.1, w: slw, h: slh });
  sEnd.addText('Thank You', { x: 0, y: 1.1 + slh + 0.3, w: 10, h: 0.6, align: 'center', fontFace: C.fontHead, fontSize: 28, bold: true, color: C.red });

  const fileName = `${project.name.replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'roadmap'}.pptx`;
  await pres.writeFile({ fileName });
}
