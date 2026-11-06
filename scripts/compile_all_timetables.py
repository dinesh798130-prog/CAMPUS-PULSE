import json
import csv
import re

all_data = {
    "departments": [
        {"id": "dept-acse", "code": "ACSE", "name": "Department of Advanced Computer Science and Engineering"},
        {"id": "dept-ece", "code": "ECE", "name": "Department of Electronics and Communication Engineering"},
        {"id": "dept-cse", "code": "CSE", "name": "Department of Computer Science and Engineering"},
        {"id": "dept-sash", "code": "SASH", "name": "School of Applied Science & Humanities"},
        {"id": "dept-bi", "code": "BIOINFO", "name": "Department of Bioinformatics"}
    ],
    "groups": [],
    "rooms": set(),
    "entries": []
}

# 1. ACSE (Parsed from official ACSE workbook)
try:
    with open("server/data/parsed_acse.json", "r") as f:
        acse_data = json.load(f)
        for g in acse_data["groups"]:
            # avoid duplicate group ids if any
            if not any(existing["name"] == g["name"] for existing in all_data["groups"]):
                all_data["groups"].append(g)
        all_data["rooms"].update(acse_data["rooms"])
        all_data["entries"].extend(acse_data["entries"])
        print(f"Loaded ACSE: {len(acse_data['groups'])} groups, {len(acse_data['entries'])} entries")
except Exception as e:
    print("Error loading ACSE:", e)

# 2. ECE 2nd Year
try:
    with open("server/data/parsed_ece.json", "r") as f:
        ece_data = json.load(f)
        for g in ece_data["groups"]:
            if not any(existing["name"] == g["name"] for existing in all_data["groups"]):
                all_data["groups"].append(g)
        all_data["rooms"].update(ece_data["rooms"])
        all_data["entries"].extend(ece_data["entries"])
        print(f"Loaded ECE: {len(ece_data['groups'])} groups, {len(ece_data['entries'])} entries")
except Exception as e:
    print("Error loading ECE:", e)

# 3. CSE 3rd Year (22 Sections)
period_times = [
    ("08:15", "09:05"),
    ("09:05", "09:55"),
    ("09:55", "10:45"),
    ("11:00", "11:50"),
    ("11:50", "12:40"),
    ("13:30", "14:20"),
    ("14:20", "15:10")
]
days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]

try:
    with open("server/data/cse_3rd_year.csv", "r") as f:
        reader = csv.reader(f)
        header = next(reader)
        cse_entries_count = 0
        for row in reader:
            if not row or len(row) < 44:
                continue
            sec_name = row[0].strip() # e.g. "Section 1"
            room = row[1].strip()     # e.g. "N-407"
            group_name = f"III CSE-{sec_name.replace('Section ', 'Sec ')}"
            sec_id = f"group-cse3-{sec_name.lower().replace(' ', '')}"
            if not any(existing["name"] == group_name for existing in all_data["groups"]):
                all_data["groups"].append({
                    "id": sec_id,
                    "name": group_name,
                    "year": 3,
                    "departmentCode": "CSE",
                    "section": sec_name
                })
            all_data["rooms"].add(room)
            
            col_idx = 2
            for d_idx, day in enumerate(days):
                for p_idx in range(7):
                    if col_idx < len(row):
                        subj = row[col_idx].strip()
                        if subj and subj.upper() != "BREAK" and subj.upper() != "LUNCH":
                            start, end = period_times[p_idx]
                            all_data["entries"].append({
                                "group": group_name,
                                "day": day,
                                "startTime": start,
                                "endTime": end,
                                "subject": subj,
                                "room": room,
                                "faculty": f"CSE Faculty ({subj})",
                                "entryType": "lab" if "LAB" in subj.upper() else "training" if "TRAIN" in subj.upper() else "class"
                            })
                            cse_entries_count += 1
                    col_idx += 1
        print(f"Loaded CSE: 22 groups, {cse_entries_count} entries")
except Exception as e:
    print("Error parsing CSE 3rd year:", e)

# 4. SASH 1st Year (from sash_raw.txt)
sash_period_times = [
    ("08:15", "09:05"),
    ("09:05", "09:55"),
    ("10:10", "11:00"),
    ("11:00", "11:50"),
    ("11:50", "12:40"),
    ("13:30", "14:20"),
    ("14:20", "15:10"),
    ("15:10", "16:00")
]

try:
    with open("server/data/sash_raw.txt", "r") as f:
        current_sec = None
        current_room = "MOBILE"
        sash_entries_count = 0
        for line in f:
            line = line.strip()
            if not line:
                continue
            sec_m = re.search(r'(SEC-\d+[A-Z0-9\s()+-]*)\s+ROOM NO:\s*([A-Za-z0-9\s-]+)', line)
            if sec_m:
                current_sec = sec_m.group(1).strip()
                current_room = sec_m.group(2).strip()
                group_name = f"I SASH {current_sec}"
                if not any(existing["name"] == group_name for existing in all_data["groups"]):
                    all_data["groups"].append({
                        "id": f"group-sash-{len(all_data['groups'])}",
                        "name": group_name,
                        "year": 1,
                        "departmentCode": "SASH",
                        "section": current_sec
                    })
                if current_room != "MOBILE":
                    all_data["rooms"].add(current_room)
                continue
            
            day_m = re.match(r'^(MON|TUE|WED|THU|FRI|SAT),(.*)$', line)
            if day_m and current_sec:
                day = day_m.group(1)
                items = [x.strip(' "') for x in day_m.group(2).split(',')]
                slot_idx = 0
                for item in items:
                    if not item or item in ["BREAK", "LUNCH"]:
                        continue
                    if slot_idx < len(sash_period_times):
                        start, end = sash_period_times[slot_idx]
                        rm = current_room
                        rm_m = re.search(r'(VBFFTF-\d+|VBFTF-\d+|VBTF-\d+|VBSF-\d+|VBFF-\d+|VSF-\d+|VGF-\d+|VPTF-\d+|VPSF-\d+|NB-?\d+)', item)
                        if rm_m:
                            rm = rm_m.group(1)
                            all_data["rooms"].add(rm)
                        
                        all_data["entries"].append({
                            "group": f"I SASH {current_sec}",
                            "day": day,
                            "startTime": start,
                            "endTime": end,
                            "subject": item,
                            "room": rm if rm != "MOBILE" else None,
                            "faculty": "SASH Faculty",
                            "entryType": "lab" if "LAB" in item.upper() else "class"
                        })
                        sash_entries_count += 1
                    slot_idx += 1
        print(f"Loaded SASH: {sash_entries_count} entries")
except Exception as e:
    print("Error parsing SASH:", e)

# 5. Bioinformatics (4 sections)
bio_sections = [
    ("II BI", 2, "ASF-08", [
        ("MON", "08:15", "09:05", "Microbiology & Metagenomics (M&M)"),
        ("MON", "09:05", "09:55", "Biological Databases & Management (BD&M)"),
        ("MON", "10:10", "11:00", "Biostatistics & Design of Experiments (B&DE)"),
        ("TUE", "08:15", "09:05", "BD&M"),
        ("TUE", "10:10", "11:50", "Biochemistry & Enzymology (B&E) Lab"),
        ("WED", "08:15", "09:05", "B&DE"),
        ("WED", "09:05", "09:55", "Cell & Molecular Biology (C&MB)"),
        ("THU", "08:15", "09:55", "Data Structures Lab"),
        ("FRI", "08:15", "09:55", "Agentic AI Tools Lab")
    ]),
    ("III BI", 3, "ASF-06", [
        ("MON", "08:15", "09:05", "Immunology & Immunoinformatics (I&I)"),
        ("TUE", "08:15", "09:05", "Biopharmaceutical Technology (BPT)"),
        ("TUE", "09:05", "09:55", "Genomics & Proteomics (G&P)"),
        ("WED", "10:10", "11:50", "G&P Lab"),
        ("THU", "08:15", "09:55", "I&I Lab (AFF-06)"),
        ("FRI", "08:15", "09:05", "AI Driven Data Engineering & Visualization (AIDE&V)")
    ]),
    ("IV BI-A", 4, "AFF-07", [
        ("MON", "08:15", "09:05", "Systems Biology (SB)"),
        ("MON", "09:05", "09:55", "Next Generation Sequencing (NGS)"),
        ("TUE", "08:15", "09:05", "Expression Data & Image Analysis (ED&IA)"),
        ("WED", "08:15", "09:05", "NGS"),
        ("THU", "08:15", "09:05", "AI/ML in Biology"),
        ("FRI", "08:15", "09:05", "Ethics & IPR")
    ]),
    ("IV BI-B", 4, "ASF-04", [
        ("MON", "08:15", "09:05", "Ethics & IPR"),
        ("MON", "09:05", "09:55", "DE-7"),
        ("TUE", "08:15", "09:05", "DE-5"),
        ("TUE", "09:05", "09:55", "NGS"),
        ("WED", "08:15", "09:05", "AI/ML in Biology"),
        ("FRI", "08:15", "09:05", "DE-5 (ASF-06)")
    ])
]

for sec_name, yr, rm, sample_entries in bio_sections:
    if not any(existing["name"] == sec_name for existing in all_data["groups"]):
        all_data["groups"].append({
            "id": f"group-bio-{sec_name.lower().replace(' ', '-')}",
            "name": sec_name,
            "year": yr,
            "departmentCode": "BIOINFO",
            "section": sec_name
        })
    all_data["rooms"].add(rm)
    for d, s, e, subj in sample_entries:
        all_data["entries"].append({
            "group": sec_name,
            "day": d,
            "startTime": s,
            "endTime": e,
            "subject": subj,
            "room": rm,
            "faculty": "Bioinformatics Faculty",
            "entryType": "lab" if "LAB" in subj.upper() else "class"
        })

# Clean rooms
cleaned_rooms = set()
for r in all_data["rooms"]:
    if r and isinstance(r, str):
        cr = r.strip()
        if cr and cr != "MOBILE" and len(cr) < 30:
            cleaned_rooms.add(cr)
all_data["rooms"] = sorted(list(cleaned_rooms))

print(f"Total Departments: {len(all_data['departments'])}")
print(f"Total Groups: {len(all_data['groups'])}")
print(f"Total Rooms: {len(all_data['rooms'])}")
print(f"Total Entries: {len(all_data['entries'])}")

with open("server/data/all_compiled_timetables.json", "w") as out:
    json.dump(all_data, out, indent=2)
