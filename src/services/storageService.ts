import {
  Building,
  Floor,
  Room,
  Department,
  AcademicYear,
  Semester,
  Subject,
  Section,
  Faculty,
  Student,
  TimetableEntry,
  TimetableChange,
  UserNotification
} from '../types';

import {
  INITIAL_BUILDINGS,
  INITIAL_FLOORS,
  INITIAL_ROOMS,
  INITIAL_DEPARTMENTS,
  INITIAL_ACADEMIC_YEARS,
  INITIAL_SEMESTERS,
  INITIAL_SECTIONS,
  INITIAL_SUBJECTS,
  INITIAL_FACULTY,
  INITIAL_STUDENTS,
  INITIAL_TIMETABLES,
  INITIAL_CHANGES,
  INITIAL_NOTIFICATIONS
} from '../data/initialData';

const STORAGE_KEYS = {
  BUILDINGS: 'campus_pulse_buildings_v1',
  FLOORS: 'campus_pulse_floors_v1',
  ROOMS: 'campus_pulse_rooms_v1',
  DEPARTMENTS: 'campus_pulse_departments_v1',
  ACADEMIC_YEARS: 'campus_pulse_academic_years_v1',
  SEMESTERS: 'campus_pulse_semesters_v1',
  SECTIONS: 'campus_pulse_sections_v1',
  SUBJECTS: 'campus_pulse_subjects_v1',
  FACULTY: 'campus_pulse_faculty_v1',
  STUDENTS: 'campus_pulse_students_v1',
  TIMETABLES: 'campus_pulse_timetables_v1',
  CHANGES: 'campus_pulse_changes_v1',
  NOTIFICATIONS: 'campus_pulse_notifications_v1',
  INITIALIZED: 'campus_pulse_initialized_v1'
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (err) {
    console.error(`Failed reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('campus_pulse_storage_change'));
  } catch (err) {
    console.error(`Failed writing ${key} to localStorage:`, err);
  }
}

export const storageService = {
  initialize() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.resetAllToDemo();
    }
  },

  resetAllToDemo() {
    setItem(STORAGE_KEYS.BUILDINGS, INITIAL_BUILDINGS);
    setItem(STORAGE_KEYS.FLOORS, INITIAL_FLOORS);
    setItem(STORAGE_KEYS.ROOMS, INITIAL_ROOMS);
    setItem(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    setItem(STORAGE_KEYS.ACADEMIC_YEARS, INITIAL_ACADEMIC_YEARS);
    setItem(STORAGE_KEYS.SEMESTERS, INITIAL_SEMESTERS);
    setItem(STORAGE_KEYS.SECTIONS, INITIAL_SECTIONS);
    setItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    setItem(STORAGE_KEYS.FACULTY, INITIAL_FACULTY);
    setItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    setItem(STORAGE_KEYS.TIMETABLES, INITIAL_TIMETABLES);
    setItem(STORAGE_KEYS.CHANGES, INITIAL_CHANGES);
    setItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  // BUILDINGS
  getBuildings(): Building[] {
    return getItem(STORAGE_KEYS.BUILDINGS, INITIAL_BUILDINGS);
  },
  saveBuildings(buildings: Building[]) {
    setItem(STORAGE_KEYS.BUILDINGS, buildings);
  },
  getBuildingById(id: string): Building | undefined {
    return this.getBuildings().find(b => b.id === id || b.slug === id);
  },

  // FLOORS
  getFloors(): Floor[] {
    return getItem(STORAGE_KEYS.FLOORS, INITIAL_FLOORS);
  },
  saveFloors(floors: Floor[]) {
    setItem(STORAGE_KEYS.FLOORS, floors);
  },
  getFloorsByBuilding(buildingId: string): Floor[] {
    return this.getFloors().filter(f => f.buildingId === buildingId).sort((a, b) => a.floorNumber - b.floorNumber);
  },

  // ROOMS
  getRooms(): Room[] {
    return getItem(STORAGE_KEYS.ROOMS, INITIAL_ROOMS);
  },
  saveRooms(rooms: Room[]) {
    setItem(STORAGE_KEYS.ROOMS, rooms);
  },
  getRoomById(id: string): Room | undefined {
    return this.getRooms().find(r => r.id === id || r.roomNumber.toLowerCase() === id.toLowerCase());
  },
  addRoom(room: Room) {
    const rooms = this.getRooms();
    rooms.push(room);
    this.saveRooms(rooms);

    // Update corresponding floor
    const floors = this.getFloors();
    const flrIndex = floors.findIndex(f => f.id === room.floorId);
    if (flrIndex !== -1) {
      if (!floors[flrIndex].roomIds.includes(room.id)) {
        floors[flrIndex].roomIds.push(room.id);
      }
      // Add blueprint element if coordinates provided
      if (room.blueprintPosition) {
        floors[flrIndex].blueprintElements.push({
          id: `be-${room.id}`,
          roomId: room.id,
          name: room.name,
          type: room.type,
          x: room.blueprintPosition.x,
          y: room.blueprintPosition.y,
          width: room.blueprintPosition.width,
          height: room.blueprintPosition.height,
          label: room.roomNumber
        });
      }
      this.saveFloors(floors);
    }
  },
  updateRoom(room: Room) {
    const rooms = this.getRooms().map(r => r.id === room.id ? room : r);
    this.saveRooms(rooms);

    // Update floor blueprint label
    const floors = this.getFloors();
    floors.forEach(f => {
      f.blueprintElements.forEach(be => {
        if (be.roomId === room.id) {
          be.name = room.name;
          be.label = room.roomNumber;
          be.type = room.type;
        }
      });
    });
    this.saveFloors(floors);
  },
  deleteRoom(roomId: string) {
    const rooms = this.getRooms().filter(r => r.id !== roomId);
    this.saveRooms(rooms);

    const floors = this.getFloors();
    floors.forEach(f => {
      f.roomIds = f.roomIds.filter(id => id !== roomId);
      f.blueprintElements = f.blueprintElements.filter(be => be.roomId !== roomId);
    });
    this.saveFloors(floors);
  },

  // DEPARTMENTS
  getDepartments(): Department[] {
    return getItem(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  },
  saveDepartments(departments: Department[]) {
    setItem(STORAGE_KEYS.DEPARTMENTS, departments);
  },

  // ACADEMIC YEARS
  getAcademicYears(): AcademicYear[] {
    return getItem(STORAGE_KEYS.ACADEMIC_YEARS, INITIAL_ACADEMIC_YEARS);
  },
  saveAcademicYears(years: AcademicYear[]) {
    setItem(STORAGE_KEYS.ACADEMIC_YEARS, years);
  },

  // SEMESTERS
  getSemesters(): Semester[] {
    return getItem(STORAGE_KEYS.SEMESTERS, INITIAL_SEMESTERS);
  },
  saveSemesters(semesters: Semester[]) {
    setItem(STORAGE_KEYS.SEMESTERS, semesters);
  },

  // SECTIONS
  getSections(): Section[] {
    return getItem(STORAGE_KEYS.SECTIONS, INITIAL_SECTIONS);
  },
  saveSections(sections: Section[]) {
    setItem(STORAGE_KEYS.SECTIONS, sections);
  },

  // SUBJECTS
  getSubjects(): Subject[] {
    return getItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  },
  saveSubjects(subjects: Subject[]) {
    setItem(STORAGE_KEYS.SUBJECTS, subjects);
  },

  // FACULTY
  getFaculty(): Faculty[] {
    return getItem(STORAGE_KEYS.FACULTY, INITIAL_FACULTY);
  },
  saveFaculty(facultyList: Faculty[]) {
    setItem(STORAGE_KEYS.FACULTY, facultyList);
  },

  // STUDENTS
  getStudents(): Student[] {
    return getItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  },
  saveStudents(students: Student[]) {
    setItem(STORAGE_KEYS.STUDENTS, students);
  },

  // TIMETABLES
  getTimetables(): TimetableEntry[] {
    return getItem(STORAGE_KEYS.TIMETABLES, INITIAL_TIMETABLES);
  },
  saveTimetables(timetables: TimetableEntry[]) {
    setItem(STORAGE_KEYS.TIMETABLES, timetables);
  },
  addTimetableEntry(entry: TimetableEntry) {
    const list = this.getTimetables();
    list.push(entry);
    this.saveTimetables(list);
  },
  updateTimetableEntry(entry: TimetableEntry) {
    const list = this.getTimetables().map(e => e.id === entry.id ? entry : e);
    this.saveTimetables(list);
  },
  deleteTimetableEntry(id: string) {
    const list = this.getTimetables().filter(e => e.id !== id);
    this.saveTimetables(list);
  },

  // CHANGES
  getChanges(): TimetableChange[] {
    return getItem(STORAGE_KEYS.CHANGES, INITIAL_CHANGES);
  },
  addChange(change: TimetableChange) {
    const changes = this.getChanges();
    changes.unshift(change);
    setItem(STORAGE_KEYS.CHANGES, changes);
  },

  // NOTIFICATIONS
  getNotifications(): UserNotification[] {
    return getItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },
  markNotificationRead(id: string) {
    const notifs = this.getNotifications().map(n => n.id === id ? { ...n, isRead: true } : n);
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }
};

