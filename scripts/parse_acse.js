import xlsx from 'xlsx';
import fs from 'fs';

const filePath = 'C:/Users/vyraj/.gemini/antigravity/brain/1dcbb8cd-4246-4256-86aa-ec17744321f9/.user_uploaded/media_1793956601903_2bdcebff.xlsx';
const wb = xlsx.readFile(filePath);

const periodSlots = [
  { p: 1, start: '08:15', end: '09:05', col: 1 },
  { p: 2, start: '09:05', end: '09:55', col: 2 },
  { p: 3, start: '10:10', end: '11:00', col: 4 },
  { p: 4, start: '11:00', end: '11:50', col: 5 },
  { p: 5, start: '11:50', end: '12:40', col: 6 },
  { p: 6, start: '13:40', end: '14:30', col: 8 },
  { p: 7, start: '14:30', end: '15:20', col: 9 },
  { p: 8, start: '15:20', end: '16:05', col: 10 }
];

const acseGroups = [];
const acseRooms = new Set();
const acseEntries = [];

for (const sheetName of wb.SheetNames) {
  if (['MINORHONORS', 'LIBRARY SLOTS'].includes(sheetName)) continue;
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0] || typeof r[0] !== 'string') continue;
    let title = r[0].trim();
    if (/^(II|III|IV|I|M\.TECH|MSC|BS)\s+[A-Z0-9-()]+/i.test(title)) {
      if (title.includes('DEPARTMENT') || title.includes('Academic') || title.includes('COUNCELORS') || title.includes('FACULTY')) continue;
      
      let monRowIdx = -1;
      for (let j = 1; j <= 4 && i + j < rows.length; j++) {
        const nextR = rows[i + j];
        if (nextR && nextR[0] && String(nextR[0]).toUpperCase().includes('MON')) {
          monRowIdx = i + j;
          break;
        }
      }
      if (monRowIdx === -1) continue;

      // Clean section name: e.g. "II CS-A (53)" -> "II CS-A"
      const cleanSectionName = title.replace(/\s*\(\d+\)\s*$/, '').trim();
      let year = 2;
      if (cleanSectionName.startsWith('I ') || cleanSectionName.startsWith('I-')) year = 1;
      else if (cleanSectionName.startsWith('II ') || cleanSectionName.startsWith('II-')) year = 2;
      else if (cleanSectionName.startsWith('III ') || cleanSectionName.startsWith('III-')) year = 3;
      else if (cleanSectionName.startsWith('IV ') || cleanSectionName.startsWith('IV-')) year = 4;

      acseGroups.push({
        id: `group-acse-${cleanSectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: cleanSectionName,
        year: year,
        departmentCode: 'ACSE',
        section: cleanSectionName
      });

      const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      for (let d = 0; d < 6 && monRowIdx + d < rows.length; d++) {
        const dayRow = rows[monRowIdx + d];
        if (!dayRow || !dayRow[0]) continue;
        const dayStr = String(dayRow[0]).trim().toUpperCase().substring(0, 3);
        if (!dayNames.includes(dayStr)) continue;

        for (const slot of periodSlots) {
          const cellVal = dayRow[slot.col];
          if (!cellVal || typeof cellVal !== 'string') continue;
          const clean = cellVal.trim();
          if (!clean || clean.toUpperCase() === 'BREAK' || clean.toUpperCase() === 'LUNCH' || clean === 'null') continue;

          const lines = clean.split('\n').map(s => s.trim()).filter(Boolean);
          const subj = lines[0];
          let room = lines.length > 1 ? lines[1] : null;

          if (room) {
            room = room.replace(/^[-\s]+/, '').replace(/room no:?/i, '').trim();
            if (room) acseRooms.add(room);
          }

          acseEntries.push({
            group: cleanSectionName,
            day: dayStr,
            startTime: slot.start,
            endTime: slot.end,
            subject: subj,
            room: room,
            faculty: `ACSE Faculty (${subj})`,
            entryType: (subj.includes('(P)') || subj.includes('LAB')) ? 'lab' : 'class'
          });
        }
      }
    }
  }
}

console.log(`Parsed ${acseGroups.length} ACSE sections, ${acseRooms.size} rooms, and ${acseEntries.length} entries.`);

fs.writeFileSync('server/data/parsed_acse.json', JSON.stringify({
  groups: acseGroups,
  rooms: Array.from(acseRooms),
  entries: acseEntries
}, null, 2));

