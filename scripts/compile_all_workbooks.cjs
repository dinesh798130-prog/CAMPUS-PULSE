const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const rawDir = path.join(__dirname, '../server/data/raw_workbooks');
const dataDir = path.join(__dirname, '../server/data');

const allData = {
  departments: [
    { id: 'dept-acse', code: 'ACSE', name: 'Department of Advanced Computer Science and Engineering' },
    { id: 'dept-ece', code: 'ECE', name: 'Department of Electronics and Communication Engineering' },
    { id: 'dept-cse', code: 'CSE', name: 'Department of Computer Science and Engineering' },
    { id: 'dept-sash', code: 'SASH', name: 'School of Applied Science & Humanities' },
    { id: 'dept-bi', code: 'BIOINFO', name: 'Department of Bioinformatics' },
    { id: 'dept-bt', code: 'BT', name: 'Department of Biotechnology' }
  ],
  groups: [],
  rooms: new Set(),
  entries: []
};

function addGroup(id, name, year, departmentCode, section) {
  if (!allData.groups.some(g => g.name === name)) {
    allData.groups.push({ id, name, year, departmentCode, section, size: 60 });
  }
}

// 1. Authoritative Rooms from master_rooms_and_timetables.xlsx
try {
  const masterWb = XLSX.readFile(path.join(rawDir, 'master_rooms_and_timetables.xlsx'));
  const roomsSheet = masterWb.Sheets['Rooms'];
  const roomsRows = XLSX.utils.sheet_to_json(roomsSheet);
  for (const r of roomsRows) {
    const rawCodes = r['Room code(s) in timetables'] || '';
    const codes = rawCodes.split('|').map(c => c.trim().toUpperCase()).filter(Boolean);
    for (const code of codes) {
      if (code && code !== 'MOBILE' && code.length < 30) {
        allData.rooms.add(code);
      }
    }
  }
  console.log(`Loaded ${roomsRows.length} room definitions from master workbook.`);
} catch (e) {
  console.error('Error loading master rooms:', e.message);
}

// 2. ACSE Timetables
try {
  const acsePath = path.join(dataDir, 'parsed_acse.json');
  if (fs.existsSync(acsePath)) {
    const acseData = JSON.parse(fs.readFileSync(acsePath, 'utf-8'));
    for (const g of acseData.groups) {
      addGroup(g.id, g.name, g.year, 'ACSE', g.section);
    }
    for (const r of acseData.rooms) {
      if (r && r !== 'MOBILE') allData.rooms.add(r.trim().toUpperCase());
    }
    allData.entries.push(...acseData.entries);
    console.log(`Loaded ACSE: ${acseData.groups.length} groups, ${acseData.entries.length} entries.`);
  }
} catch (e) {
  console.error('Error loading ACSE:', e.message);
}

// 3. ECE Timetables
try {
  const ecePath = path.join(dataDir, 'parsed_ece.json');
  if (fs.existsSync(ecePath)) {
    const eceData = JSON.parse(fs.readFileSync(ecePath, 'utf-8'));
    for (const g of eceData.groups) {
      addGroup(g.id, g.name, g.year, 'ECE', g.section);
    }
    for (const r of eceData.rooms) {
      if (r && r !== 'MOBILE') allData.rooms.add(r.trim().toUpperCase());
    }
    allData.entries.push(...eceData.entries);
    console.log(`Loaded ECE: ${eceData.groups.length} groups, ${eceData.entries.length} entries.`);
  }
} catch (e) {
  console.error('Error loading ECE:', e.message);
}

// 4. CSE 3rd Year (22 Sections with Faculty names from revised workbook)
try {
  const revisedPath = path.join(rawDir, 'cse_3rd_year_revised.xlsx');
  const legacyPath = path.join(rawDir, 'cse_3rd_year.xlsx');
  const cseWb = fs.existsSync(revisedPath) ? XLSX.readFile(revisedPath) : XLSX.readFile(legacyPath);
  let cseCount = 0;

  const secSheets = cseWb.SheetNames.filter(s => s.startsWith('Sec '));
  if (secSheets.length > 0) {
    // Revised detailed sheets with faculty names
    const periodTimes = [
      ['08:15', '09:05'],
      ['09:05', '09:55'],
      ['09:55', '10:45'],
      ['11:00', '11:50'],
      ['11:50', '12:40'],
      ['13:30', '14:20'],
      ['14:20', '15:10']
    ];
    // Map column index in sheet (cols 1,2,3, 5,6, 8,9) to period index (0..6)
    const colToPeriod = {
      1: 0, 2: 1, 3: 2,
      5: 3, 6: 4,
      8: 5, 9: 6
    };
    const dayMap = {
      'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED',
      'THU': 'THU', 'FRI': 'FRI', 'SAT': 'SAT'
    };

    for (const sheetName of secSheets) {
      const ws = cseWb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!rows || rows.length < 12) continue;

      const title = rows[0] ? rows[0][0] : '';
      const rMatch = title.match(/\[([A-Z0-9-]+)\]/i);
      const room = rMatch ? rMatch[1].toUpperCase() : 'N-407';
      allData.rooms.add(room);

      const secNum = sheetName.replace('Sec ', '');
      const groupName = `III CSE-Sec ${secNum}`;
      addGroup(`group-cse3-sec${secNum}`, groupName, 3, 'CSE', `Sec ${secNum}`);

      // Rows 3 to 11 contain dates and days
      for (let r = 3; r <= 11; r++) {
        const row = rows[r];
        if (!row || !row[0] || String(row[0]).includes('Sun')) continue;
        const dayStr = String(row[0]).split(',')[0].trim().toUpperCase();
        const day = dayMap[dayStr];
        if (!day) continue;

        for (const [colStr, pIdx] of Object.entries(colToPeriod)) {
          const col = parseInt(colStr, 10);
          const cellVal = String(row[col] || '').trim();
          if (!cellVal || ['BREAK', 'LUNCH', 'HOLIDAY', ''].includes(cellVal.toUpperCase())) continue;

          const lines = cellVal.split('\n').map(l => l.trim()).filter(Boolean);
          const subj = lines[0] || cellVal;
          let faculty = lines.length > 1 ? lines[1].replace(/^\(|\)$/g, '').trim() : null;
          if (!faculty || faculty.toUpperCase() === 'TRAINING') faculty = `CSE Faculty (${subj})`;

          const [startTime, endTime] = periodTimes[pIdx];
          const entryType = subj.toUpperCase().includes('LAB') ? 'lab' : subj.toUpperCase().includes('TRAINING') ? 'training' : 'class';

          allData.entries.push({
            group: groupName,
            day,
            startTime,
            endTime,
            subject: subj,
            room,
            faculty,
            entryType
          });
          cseCount++;
        }
      }
    }
    console.log(`Loaded CSE 3rd Year Revised: ${secSheets.length} sections, ${cseCount} entries.`);
  } else {
    // Fallback to legacy parser
    const sheet = cseWb.Sheets['All Sections'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const periodTimes = [
      ['08:15', '09:05'],
      ['09:05', '09:55'],
      ['09:55', '10:45'],
      ['11:00', '11:50'],
      ['11:50', '12:40'],
      ['13:30', '14:20'],
      ['14:20', '15:10']
    ];

    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0] || !row[0].toString().startsWith('Section')) continue;
      const secName = row[0].toString().trim();
      const room = row[1] ? row[1].toString().trim().toUpperCase() : 'N-407';
      const groupName = `III CSE-${secName.replace('Section ', 'Sec ')}`;
      addGroup(`group-cse3-${secName.toLowerCase().replace(/\s+/g, '')}`, groupName, 3, 'CSE', secName);
      allData.rooms.add(room);

      let col = 2;
      for (let d = 0; d < days.length; d++) {
        const day = days[d];
        for (let p = 0; p < 7; p++) {
          if (col < row.length && row[col]) {
            const subj = row[col].toString().trim();
            if (subj && !['BREAK', 'LUNCH', 'HOLIDAY'].includes(subj.toUpperCase())) {
              const [start, end] = periodTimes[p];
              allData.entries.push({
                group: groupName,
                day,
                startTime: start,
                endTime: end,
                subject: subj,
                room,
                faculty: `CSE Faculty (${subj})`,
                entryType: subj.toUpperCase().includes('LAB') ? 'lab' : subj.toUpperCase().includes('TRAINING') ? 'training' : 'class'
              });
              cseCount++;
            }
          }
          col++;
        }
      }
    }
    console.log(`Loaded CSE 3rd Year: 22 sections, ${cseCount} entries.`);
  }
} catch (e) {
  console.error('Error loading CSE 3rd Year:', e.message);
}

// 5. SASH Division 4 (Sheets: New 29, 30, 31, 43, 44, 45, 46, 47, 48, 49, 50, 54, 55, 56, 57)
try {
  const sashWb = XLSX.readFile(path.join(rawDir, 'sash_division_4.xlsx'));
  let sashCount = 0;
  const dayMap = {
    'MONDAY': 'MON', 'TUESDAY': 'TUE', 'WEDNESDAY': 'WED',
    'THURSDAY': 'THU', 'FRIDAY': 'FRI', 'SATURDAY': 'SAT'
  };

  for (const sheetName of sashWb.SheetNames) {
    const sheet = sashWb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length < 5) continue;

    const groupName = `I SASH SEC-${sheetName.replace('New ', '')}`;
    addGroup(`group-sash-${sheetName.toLowerCase().replace(/\s+/g, '-')}`, groupName, 1, 'SASH', `SEC-${sheetName.replace('New ', '')}`);

    // Find time header row
    let headerRowIdx = -1;
    for (let r = 0; r < 5; r++) {
      if (rows[r] && rows[r].some(c => c && c.toString().includes('8.15') || (c && c.toString().includes('10.05')))) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) continue;

    const timeHeaders = rows[headerRowIdx];
    // Map column index to time range
    const colTimes = {};
    for (let c = 1; c < timeHeaders.length; c++) {
      const th = timeHeaders[c] ? timeHeaders[c].toString().trim() : '';
      const tm = th.match(/(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/);
      if (tm) {
        let sh = parseInt(tm[1], 10);
        const sm = tm[2];
        let eh = parseInt(tm[3], 10);
        const em = tm[4];
        if (sh < 8) sh += 12;
        if (eh < 8 || eh < sh) eh += 12;
        const start = `${String(sh).padStart(2, '0')}:${sm}`;
        const end = `${String(eh).padStart(2, '0')}:${em}`;
        colTimes[c] = [start, end];
      }
    }

    // Process Monday - Saturday rows
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[0] && !row[1]) continue;
      const firstCell = (row[0] || row[1] || '').toString().trim().toUpperCase();
      const day = dayMap[firstCell];
      if (!day) continue;

      for (let c = 1; c < row.length; c++) {
        if (!colTimes[c] || !row[c]) continue;
        const cellText = row[c].toString().trim();
        if (!cellText || ['BREAK', 'LUNCH', 'LUNCH BREAK'].includes(cellText.toUpperCase())) continue;

        const [start, end] = colTimes[c];
        // Extract room from cell text
        let room = null;
        const rMatch = cellText.match(/(VBFFTF-?\d+|VBFTTF-?\d+|VBFTF-?\d+|VBTF-?\d+|VBT-?\d+|VBSF-?\d+|VBFF-?\d+|VSF-?\d+|VGF-?\d+|VPTF-?\d+|VPSF-?\d+|NB-?\d+|AFF-?\d+|107)/i);
        if (rMatch) {
          room = rMatch[1].trim().toUpperCase().replace(/\s+/g, '');
          if (room === '107') room = 'N-107';
          allData.rooms.add(room);
        }

        allData.entries.push({
          group: groupName,
          day,
          startTime: start,
          endTime: end,
          subject: cellText.replace(/\n/g, ' '),
          room,
          faculty: 'SASH Faculty',
          entryType: cellText.toUpperCase().includes('(P)') || cellText.toUpperCase().includes('LAB') ? 'lab' : 'class'
        });
        sashCount++;
      }
    }
  }
  console.log(`Loaded SASH Division 4: ${sashCount} entries.`);
} catch (e) {
  console.error('Error loading SASH Division 4:', e.message);
}

// 6. Biotechnology (BT)
try {
  const btWb = XLSX.readFile(path.join(rawDir, 'biotechnology.xlsx'));
  let btCount = 0;
  const dayMap = { 'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED', 'THU': 'THU', 'FRI': 'FRI', 'SAT': 'SAT' };
  const btSlots = [
    ['08:15', '09:05'],
    ['09:05', '09:55'],
    ['10:10', '11:00'],
    ['11:00', '11:50'],
    ['11:50', '12:40'],
    ['13:30', '14:20'],
    ['14:20', '15:10'],
    ['15:10', '16:00'],
    ['16:00', '16:45']
  ];

  for (const sheetName of btWb.SheetNames) {
    if (!sheetName.includes('BT') && !sheetName.includes('M.Tech')) continue;
    const sheet = btWb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length < 7) continue;

    let defaultRoom = 'ASF-07';
    let year = 2;
    if (sheetName.includes('III')) year = 3;
    else if (sheetName.includes('IV')) year = 4;
    else if (sheetName.includes('M.Tech')) year = 1;

    // Check for room in header
    for (let r = 0; r < 5; r++) {
      if (rows[r]) {
        for (const cell of rows[r]) {
          const rmMatch = cell && cell.toString().match(/Room No:\s*([A-Za-z0-9\s-]+)/i);
          if (rmMatch) {
            defaultRoom = rmMatch[1].trim().toUpperCase().replace(/\s+/g, '-');
            if (defaultRoom !== 'MOBILE') allData.rooms.add(defaultRoom);
          }
        }
      }
    }

    const groupName = sheetName.trim();
    addGroup(`group-bt-${groupName.toLowerCase().replace(/[\s.]+/g, '-')}`, groupName, year, 'BT', groupName);

    for (let r = 5; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[0]) continue;
      const day = dayMap[row[0].toString().trim().toUpperCase()];
      if (!day) continue;

      let slotIdx = 0;
      for (let c = 1; c < row.length; c++) {
        const val = row[c] ? row[c].toString().trim() : '';
        if (!val || ['BREAK', 'LUNCH', 'ACTIVITIES'].includes(val.toUpperCase())) continue;
        if (slotIdx < btSlots.length) {
          const [start, end] = btSlots[slotIdx];
          allData.entries.push({
            group: groupName,
            day,
            startTime: start,
            endTime: end,
            subject: val,
            room: defaultRoom !== 'MOBILE' ? defaultRoom : null,
            faculty: 'BT Faculty',
            entryType: val.toUpperCase().includes('(P)') ? 'lab' : 'class'
          });
          btCount++;
        }
        slotIdx++;
      }
    }
  }
  console.log(`Loaded Biotechnology: ${btCount} entries.`);
} catch (e) {
  console.error('Error loading Biotechnology:', e.message);
}

// 7. Bioinformatics (BI)
try {
  const biWb = XLSX.readFile(path.join(rawDir, 'bioinformatics.xlsx'));
  let biCount = 0;
  const dayMap = { 'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED', 'THU': 'THU', 'FRI': 'FRI', 'SAT': 'SAT' };
  const biSlots = [
    ['08:15', '09:05'],
    ['09:05', '09:55'],
    ['10:10', '11:00'],
    ['11:00', '11:50'],
    ['11:50', '12:40'],
    ['13:30', '14:20'],
    ['14:20', '15:10'],
    ['15:10', '16:00'],
    ['16:00', '16:45']
  ];

  for (const sheetName of ['II BI', 'III BI', 'IV BI A', 'IV BI B']) {
    const sheet = biWb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length < 10) continue;

    let defaultRoom = 'ASF-06';
    let year = sheetName.startsWith('II') ? 2 : sheetName.startsWith('III') ? 3 : 4;
    for (let r = 0; r < 10; r++) {
      if (rows[r]) {
        for (const cell of rows[r]) {
          const rmMatch = cell && cell.toString().match(/Room No[.:\s]*([A-Za-z0-9\s-]+)/i);
          if (rmMatch) {
            defaultRoom = rmMatch[1].trim().toUpperCase().replace(/\s+/g, '-');
            if (defaultRoom !== 'MOBILE') allData.rooms.add(defaultRoom);
          }
        }
      }
    }

    const groupName = sheetName.trim();
    addGroup(`group-bi-${groupName.toLowerCase().replace(/[\s.]+/g, '-')}`, groupName, year, 'BIOINFO', groupName);

    for (let r = 8; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const dayCell = (row[0] || row[1] || '').toString().trim().toUpperCase();
      const day = dayMap[dayCell];
      if (!day) continue;

      let slotIdx = 0;
      for (let c = 1; c < row.length; c++) {
        const val = row[c] ? row[c].toString().trim() : '';
        if (!val || ['BREAK', 'LUNCH', 'ACTIVITIES', 'LIFE SKILLS'].includes(val.toUpperCase()) || val.length > 80) continue;
        if (slotIdx < biSlots.length) {
          const [start, end] = biSlots[slotIdx];
          allData.entries.push({
            group: groupName,
            day,
            startTime: start,
            endTime: end,
            subject: val,
            room: defaultRoom !== 'MOBILE' ? defaultRoom : null,
            faculty: 'Bioinformatics Faculty',
            entryType: val.toUpperCase().includes('(P)') ? 'lab' : 'class'
          });
          biCount++;
        }
        slotIdx++;
      }
    }
  }
  console.log(`Loaded Bioinformatics: ${biCount} entries.`);
} catch (e) {
  console.error('Error loading Bioinformatics:', e.message);
}

// 8. CSE 4th Year (19 Sections - 22CS4xx subjects: NLP, BDA, MLOps, CC, PID, AAI, CE, AI)
try {
  const cse4Wb = XLSX.readFile(path.join(rawDir, '4th_year_timetable.xlsx'));
  let cse4Count = 0;
  const dayMap4 = {
    'MONDAY': 'MON', 'TUESDAY': 'TUE', 'WEDNESDAY': 'WED',
    'THURSDAY': 'THU', 'FRIDAY': 'FRI', 'SATURDAY': 'SAT'
  };
  // Abbrev → full subject name
  const subj4Map = {
    'NLP': 'Natural Language Processing', 'BDA': 'Big Data Analytics',
    'MLOPS': 'MLOps', 'CC': 'Cloud Computing', 'PID': 'Privacy Preserving & Intrusion Detection',
    'AAI': 'Agentic AI', 'CE': 'Computing Ethics', 'AI': 'Artificial Intelligence',
    'MINOR': 'Minor Elective'
  };

  for (const sheetName of cse4Wb.SheetNames) {
    const sheet = cse4Wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length < 3) continue;

    // Find the section header row (contains "SECTION-N")
    let headerRowIdx = -1;
    let sectionNum = null;
    for (let r = 0; r < 5; r++) {
      for (const cell of (rows[r] || [])) {
        const m = cell && cell.toString().match(/SECTION[- ](\d+)/i);
        if (m) { sectionNum = m[1]; headerRowIdx = r; break; }
      }
      if (headerRowIdx !== -1) break;
    }
    if (!sectionNum) { sectionNum = sheetName.replace('sec', ''); headerRowIdx = 0; }

    // Find the Day/time header row (contains "Day")
    let timeRowIdx = -1;
    for (let r = headerRowIdx; r < headerRowIdx + 4; r++) {
      if (rows[r] && rows[r].some(c => c && c.toString().trim().toUpperCase() === 'DAY')) {
        timeRowIdx = r; break;
      }
    }
    if (timeRowIdx === -1) continue;

    const timeRow = rows[timeRowIdx];
    // Map col index → [startTime, endTime, defaultRoom]
    const colTimes = {};
    for (let c = 0; c < timeRow.length; c++) {
      const cell = timeRow[c] ? timeRow[c].toString().trim() : '';
      // Parse times like "8.30-10.30", "10.50.-11.40 (N-301)", "12.45-1.35"
      const tm = cell.match(/(\d{1,2})[.:]+(\d{2})\s*[-–]\s*(\d{1,2})[.:]+(\d{2})/);
      if (tm) {
        let sh = parseInt(tm[1], 10), sm = tm[2];
        let eh = parseInt(tm[3], 10), em = tm[4];
        if (sh < 8) sh += 12;
        if (eh < 8 || eh < sh) eh += 12;
        // Extract room from time header cell if present like "(N-301)"
        const rMatch = cell.match(/\(([A-Z]+-\d+[A-Z]?)\)/i);
        colTimes[c] = {
          start: `${String(sh).padStart(2,'0')}:${sm}`,
          end: `${String(eh).padStart(2,'0')}:${em}`,
          headerRoom: rMatch ? rMatch[1].toUpperCase() : null
        };
      }
    }

    const groupName = `IV CSE-SEC${sectionNum}`;
    addGroup(`group-cse4-sec${sectionNum}`, groupName, 4, 'CSE', `SEC${sectionNum}`);

    // Process day rows
    for (let r = timeRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      // Day cell can be in col 0 or 1 depending on indent
      const dayCell = (row[0] || row[1] || '').toString().trim().toUpperCase();
      const day = dayMap4[dayCell];
      if (!day) continue;

      // Build subject legend from rows below (class teacher / subject rows)
      // For now parse subject cells from the day row
      for (let c = 0; c < row.length; c++) {
        if (!colTimes[c]) continue;
        const cell = row[c] ? row[c].toString().trim() : '';
        if (!cell || ['BREAK', 'LUNCH', '', 'LUNCH BREAK'].includes(cell.toUpperCase())) continue;

        // Extract subject abbrev and room from cell like "NLP [L]", "BDA [P][N-315]", "AI(N-313)"
        const roomMatch = cell.match(/[(\[]([A-Z]+-\d+[A-Z]?)[)\]]/i);
        let room = roomMatch ? roomMatch[1].toUpperCase() : (colTimes[c].headerRoom || null);

        // Parse lab/theory indicator
        let entryType = 'class';
        if (/\[P\]/i.test(cell)) entryType = 'lab';
        else if (/\[L\]/i.test(cell)) entryType = 'lab';
        else if (/\[T\]/i.test(cell)) entryType = 'class';
        // 8.30–10.30 slot = 2hr lab
        const { start, end } = colTimes[c];
        if (start === '08:30' && end === '10:30') entryType = 'lab';

        // Clean subject name: strip room, brackets
        let subj = cell.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
        // Resolve abbreviation
        const subjKey = subj.toUpperCase().replace(/[^A-Z]/g, '');
        const fullSubj = Object.entries(subj4Map).find(([k]) => subjKey.startsWith(k));
        if (fullSubj) subj = fullSubj[1];
        if (!subj) continue;

        if (room) allData.rooms.add(room);
        allData.entries.push({
          group: groupName, day,
          startTime: start, endTime: end,
          subject: subj, room: room || null,
          faculty: null,
          entryType
        });
        cse4Count++;
      }
    }
  }
  console.log(`Loaded CSE 4th Year: 19 sections, ${cse4Count} entries.`);
} catch (e) {
  console.error('Error loading CSE 4th Year:', e.message);
}

// 9. CSE 2nd Year (19 Sections - 25CS2xx subjects: DS, DMS, DBMS, OOPS, DLD, AI, DW)
try {
  const cse2Wb = XLSX.readFile(path.join(rawDir, '2nd_year_timetable.xlsx'));
  let cse2Count = 0;
  const dayMap2 = {
    'MONDAY': 'MON', 'TUESDAY': 'TUE', 'WEDNESDAY': 'WED',
    'THURSDAY': 'THU', 'FRIDAY': 'FRI', 'SATURDAY': 'SAT'
  };
  const subj2Map = {
    'DS': 'Data Structures', 'DMS': 'Discrete Mathematical Structures',
    'DBMS': 'Database Management Systems', 'OOPS': 'Object Oriented Programming (Java)',
    'DLD': 'Digital Logic Design', 'AI': 'Artificial Intelligence',
    'DW': 'Data Wrangling and Visualization', 'COUN': 'Counselling',
    'SELFL': 'Self Learning', 'SELF': 'Self Learning / Experiential Learning'
  };
  // Standard 2nd year time slots
  const slots2 = [
    ['08:15', '09:05'], ['09:05', '09:55'], ['09:55', '10:45'],
    ['11:00', '11:50'], ['11:50', '12:30'], ['12:30', '13:20'],
    ['13:20', '14:10'], ['14:10', '14:20'],
    ['14:20', '15:10'], ['15:10', '16:00']
  ];

  for (const sheetName of cse2Wb.SheetNames) {
    const sheet = cse2Wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length < 3) continue;

    // Find section header: "SECTION-N-ROOM" or "SECTION-N(ROOM)"
    let sectionNum = sheetName.replace('sec', '');
    let defaultRoom = null;

    // Scan first 8 rows for section header
    let timeRowIdx = -1;
    for (let r = 0; r < 10; r++) {
      const rr = rows[r] || [];
      for (const cell of rr) {
        const secMatch = cell && cell.toString().match(/SECTION[- ](\d+)[-(]?([A-Z]-?\d+[A-Z]?)?/i);
        if (secMatch) {
          sectionNum = secMatch[1];
          if (secMatch[2]) { defaultRoom = secMatch[2].toUpperCase(); allData.rooms.add(defaultRoom); }
        }
      }
      // Check if this is the time header row (has 8.15 or 9.05)
      if (rr.some(c => c && c.toString().includes('8.15'))) {
        timeRowIdx = r; break;
      }
    }
    if (timeRowIdx === -1) continue;

    const timeRow = rows[timeRowIdx];
    // Build column → slot mapping
    const colTimes2 = {};
    let slotIdx = 0;
    for (let c = 0; c < timeRow.length; c++) {
      const cell = timeRow[c] ? timeRow[c].toString().trim() : '';
      const tm = cell.match(/(\d{1,2})[.:]+(\d{2})\s*[-–.]+\s*(\d{1,2})[.:]+(\d{2})/);
      if (tm && slotIdx < slots2.length) {
        colTimes2[c] = slots2[slotIdx];
        slotIdx++;
      }
    }

    const groupName = `II CSE-SEC${sectionNum}`;
    addGroup(`group-cse2-sec${sectionNum}`, groupName, 2, 'CSE', `SEC${sectionNum}`);

    // Process day rows
    for (let r = timeRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const dayCell = (row[0] || '').toString().trim().toUpperCase();
      const day = dayMap2[dayCell];
      if (!day) continue;

      for (let c = 0; c < row.length; c++) {
        if (!colTimes2[c]) continue;
        const cell = row[c] ? row[c].toString().trim() : '';
        if (!cell) continue;

        // Skip breaks, self-learning, counselling filler
        const upper = cell.toUpperCase();
        if (['BREAK', 'LUNCH', '', 'LUNCH BREAK'].includes(upper)) continue;
        if (upper.includes('SELF LEARNING') || upper.includes('EXPERIENTIAL')) continue;

        // Extract room from cell like "[N-419]", "(N-407)"
        const roomMatch = cell.match(/[(\[]([A-Z]+-\d+[A-Z]?)[)\]]/i);
        let room = roomMatch ? roomMatch[1].toUpperCase() : defaultRoom;

        // Determine entry type
        let entryType = 'class';
        if (/\[P\]/i.test(cell)) entryType = 'lab';

        // Parse subject abbreviation: "DS    [L][N-419]" → "DS"
        let subj = cell.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
        // Resolve abbreviation
        const subjKey = subj.toUpperCase().trim();
        const resolved = subj2Map[subjKey] || subj2Map[subjKey.split(/\s+/)[0]];
        if (resolved) subj = resolved;
        if (!subj || subj.length > 100) continue;
        // Skip counselling slots from entries
        if (upper.startsWith('COUN')) continue;

        if (room) allData.rooms.add(room);
        allData.entries.push({
          group: groupName, day,
          startTime: colTimes2[c][0], endTime: colTimes2[c][1],
          subject: subj, room: room || null,
          faculty: null,
          entryType
        });
        cse2Count++;
      }
    }
  }
  console.log(`Loaded CSE 2nd Year: 19 sections, ${cse2Count} entries.`);
} catch (e) {
  console.error('Error loading CSE 2nd Year:', e.message);
}

// 10. SASH Full Coverage (X-Stream & Y-Stream: Sec 1 to 55)
function parseSashStreamWorkbook(filePath, streamName) {
  if (!fs.existsSync(filePath)) return;
  const wb = XLSX.readFile(filePath);
  const dayMap = { 'MON': 'MON', 'TUE': 'TUE', 'WED': 'WED', 'THU': 'THU', 'FRI': 'FRI', 'SAT': 'SAT' };
  let count = 0;

  for (const sheetName of wb.SheetNames) {
    if (sheetName.toLowerCase().includes('sheet')) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rows || rows.length < 12) continue;

    // Row 4 has the Section Title e.g. "SECTION - 26 (AIML-H)" or "SEC-01( CSE-H)"
    const title = rows[4] ? rows[4].find(c => String(c).trim()) : '';
    let secMatch = title ? title.match(/SEC(?:TION)?\s*[-–]\s*(\d+)/i) : null;
    let secNum = secMatch ? parseInt(secMatch[1], 10) : parseInt(sheetName.replace(/\D/g, ''), 10);
    if (!secNum) continue;

    // Detect section branch from title
    let branch = 'GEN';
    if (/AIML/i.test(title)) branch = 'AIML';
    else if (/CSE/i.test(title)) branch = 'CSE';
    else if (/ECE/i.test(title)) branch = 'ECE';
    else if (/VLSI/i.test(title)) branch = 'VLSI';
    else if (/MECH/i.test(title)) branch = 'MECH';
    else if (/CIVIL/i.test(title)) branch = 'CIVIL';
    else if (/BT/i.test(title)) branch = 'BT';
    else if (/BI/i.test(title)) branch = 'BI';
    else if (/RA/i.test(title)) branch = 'RA';
    else if (/FT/i.test(title)) branch = 'FT';
    else if (/IT/i.test(title)) branch = 'IT';

    const groupName = `I SASH SEC-${secNum} (${branch})`;
    addGroup(`group-sash-sec${secNum}`, groupName, 1, 'SASH', `SEC-${secNum}`);

    // Map column times from Row 5
    const timeRow = rows[5];
    if (!timeRow) continue;
    const colTimes = {};
    for (let c = 1; c < timeRow.length; c++) {
      const headerStr = String(timeRow[c]).trim();
      const match = headerStr.match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/);
      if (match) {
        let sh = parseInt(match[1], 10), sm = match[2];
        let eh = parseInt(match[3], 10), em = match[4];
        if (sh < 8) sh += 12;
        if (eh < 8 || eh < sh) eh += 12;
        colTimes[c] = [sh.toString().padStart(2, '0') + ':' + sm, eh.toString().padStart(2, '0') + ':' + em];
      }
    }

    // Rows 6 to 11 are MON-SAT
    for (let r = 6; r <= 11; r++) {
      const row = rows[r];
      if (!row || !row[0]) continue;
      const dayStr = String(row[0]).trim().toUpperCase();
      const day = dayMap[dayStr];
      if (!day) continue;

      for (let c = 1; c < row.length; c++) {
        if (!colTimes[c]) continue;
        const cell = String(row[c]).trim();
        if (!cell || ['BREAK', 'LUNCH', 'SPORTS', 'ACTIVITIES', ''].includes(cell.toUpperCase())) continue;

        // Extract Room from cell
        let room = null;
        const rMatch = cell.match(/(VBFFTF-?\d+|VBFTTF-?\d+|VBFTF-?\d+|VBTF-?\d+|VBT-?\d+|VBSF-?\d+|VBFF-?\d+|VSF-?\d+|VGF-?\d+|VPTF-?\d+|VPSF-?\d+|NB-?\d+|AFF-?\d+|VFF-?\d+)/i);
        if (rMatch) {
          room = rMatch[1].trim().toUpperCase().replace(/\s+/g, '');
          if (room.startsWith('NB') && !room.includes('-')) {
            room = room.replace('NB', 'NB-');
          }
          allData.rooms.add(room);
        }

        const lines = cell.split('\n').map(l => l.trim()).filter(Boolean);
        const subj = lines[0] || cell;
        const isLab = cell.toUpperCase().includes('LAB') || cell.toUpperCase().includes('(P)');
        const entryType = isLab ? 'lab' : 'class';

        allData.entries.push({
          group: groupName,
          day,
          startTime: colTimes[c][0],
          endTime: colTimes[c][1],
          subject: subj,
          room,
          faculty: 'SASH Faculty',
          entryType
        });
        count++;
      }
    }
  }
  console.log(`Loaded SASH ${streamName}: ${count} entries.`);
}

try {
  parseSashStreamWorkbook(path.join(rawDir, 'sash_y_stream.xlsx'), 'Y-Stream (Sec 26-55)');
  parseSashStreamWorkbook(path.join(rawDir, 'sash_x_stream.xlsx'), 'X-Stream (Sec 1-25, 51-53)');
} catch (e) {
  console.error('Error loading SASH streams:', e.message);
}

// Clean and sort rooms
const cleanRooms = Array.from(allData.rooms)
  .map(r => r.trim().toUpperCase())
  .filter(r => r && r !== 'MOBILE' && r.length < 30);
allData.rooms = Array.from(new Set(cleanRooms)).sort();

console.log('--- COMPILE SUMMARY ---');
console.log('Total Departments:', allData.departments.length);
console.log('Total Groups:', allData.groups.length);
console.log('Total Rooms:', allData.rooms.length);
console.log('Total Timetable Entries:', allData.entries.length);

const outputPath = path.join(dataDir, 'all_compiled_timetables.json');
fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2), 'utf-8');
console.log(`Saved compiled data to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
