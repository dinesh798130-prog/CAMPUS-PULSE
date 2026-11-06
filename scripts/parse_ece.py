"""
Extractor for University Timetables from the provided official records.
Generates a structured university_timetables.json with:
- Departments
- Groups / Sections
- Rooms
- Faculty
- Timetable Entries
"""
import json
import re

DATA = {
    "departments": [
        {"id": "dept-ece", "code": "ECE", "name": "Department of Electronics and Communication Engineering"},
        {"id": "dept-sash", "code": "SASH", "name": "School of Applied Science & Humanities"},
        {"id": "dept-cse", "code": "CSE", "name": "Department of Computer Science and Engineering"},
        {"id": "dept-acse", "code": "ACSE", "name": "Advanced Computer Science and Engineering"},
        {"id": "dept-bi", "code": "BIOINFO", "name": "Department of Bioinformatics"}
    ],
    "groups": [],
    "rooms": set(),
    "faculty": {},
    "entries": []
}

# 1. Parse ECE 2nd Year from server/data/ece_timetables.txt
with open("server/data/ece_timetables.txt", "r") as f:
    current_sec = None
    current_room = None
    for line in f:
        line = line.strip()
        if not line:
            continue
        sec_match = re.search(r'(SEC-[A-Z0-9]+)\s*\|\s*ROOM NO:\s*([A-Za-z0-9\s-]+)', line)
        if sec_match:
            current_sec = sec_match.group(1).strip()
            current_room = sec_match.group(2).strip().replace(" ", "")
            group_name = f"II ECE {current_sec}"
            DATA["groups"].append({
                "id": f"group-ece-{current_sec.lower()}",
                "name": group_name,
                "year": 2,
                "departmentCode": "ECE",
                "section": current_sec
            })
            DATA["rooms"].add(current_room)
            continue
        
        day_match = re.match(r'^(MON|TUE|WED|THU|FRI|SAT):\s*(.*)$', line)
        if day_match and current_sec:
            day = day_match.group(1)
            slots_str = day_match.group(2)
            # Slot pattern: 08:15-09:05 Subj-Type-Room or Trainer...
            slots = re.findall(r'(\d{2}:\d{2})-(\d{2}:\d{2})\s+([^,]+)', slots_str)
            for start, end, activity in slots:
                activity = activity.strip()
                # Parse room if present in activity e.g. PTSP-L-VTF17 or DE-L-VSF01 or Trainer - 1 VSF19
                room = current_room
                subj = activity
                fac = "ECE Faculty"
                
                # Check if activity ends with room code like VSF01, VTF17, etc.
                rm_match = re.search(r'([A-Z]{2,4}[0-9]{2}|VSF\s*\d+|VTF\s*\d+|VBSF\s*\d+|VBTF\s*\d+|VBFF\s*\d+)', activity)
                if rm_match:
                    r = rm_match.group(1).replace(" ", "")
                    DATA["rooms"].add(r)
                    room = r
                
                DATA["entries"].append({
                    "group": f"II ECE {current_sec}",
                    "day": day,
                    "startTime": start,
                    "endTime": end,
                    "subject": subj,
                    "room": room,
                    "faculty": fac,
                    "entryType": "lab" if ("-P-" in activity or "LAB" in activity.upper()) else "class"
                })

print(f"Extracted ECE: {len(DATA['groups'])} groups, {len(DATA['entries'])} entries")

with open("server/data/parsed_ece.json", "w") as f:
    DATA["rooms"] = list(DATA["rooms"])
    json.dump(DATA, f, indent=2)

