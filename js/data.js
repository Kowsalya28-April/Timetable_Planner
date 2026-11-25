/**
 * ATRIA INSTITUTE OF TECHNOLOGY - Timetable Planner
 * Initial Seed Data & LocalStorage State Management
 */

const STORAGE_KEYS = {
  CLASSES: 'atria_classes',
  SUBJECTS: 'atria_subjects',
  FACULTY: 'atria_faculty',
  ROOMS: 'atria_rooms',
  CONSTRAINTS: 'atria_constraints',
  SETTINGS: 'atria_settings',
  METADATA: 'atria_metadata',
  USERS: 'atria_users',
  TIMETABLE: 'atria_generated_timetable',
  CUSTOM_LOGO: 'atria_custom_logo',
  ACTIVE_USER: 'atria_active_user'
};

const DEFAULT_METADATA = {
  instituteName: "ATRIA INSTITUTE OF TECHNOLOGY",
  instituteAffiliation: "An Autonomous Institution Affiliated to VTU, Belagavi | Approved by AICTE, New Delhi",
  instituteAddress: "Anandnagar, Bengaluru - 560 024, Karnataka, India",
  department: "DEPARTMENT OF ARTIFICIAL INTELLIGENCE & COMPUTER SCIENCE",
  academicYear: "2024 - 2025",
  semesterType: "Odd Semester",
  wefDate: "01-08-2024",
  revision: "Rev 2.2",
  coordinatorSignLabel: "Timetable Coordinator",
  coordinatorName: "Prof. H. R. Naveen",
  hodSignLabel: "Head of Department (HOD)",
  hodName: "Dr. R. K. Sharma",
  principalSignLabel: "Principal / Dean Academic",
  principalName: "Dr. T. N. Sreenivasa"
};

const DEFAULT_SETTINGS = {
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  periodsPerDay: 7,
  periodTimes: [
    { period: 1, start: "08:30", end: "09:30", label: "Period 1 (08:30 - 09:30)" },
    { period: 2, start: "09:30", end: "10:30", label: "Period 2 (09:30 - 10:30)" },
    { period: 3, start: "10:45", end: "11:45", label: "Period 3 (10:45 - 11:45)" },
    { period: 4, start: "11:45", end: "12:45", label: "Period 4 (11:45 - 12:45)" },
    { period: 5, start: "13:30", end: "14:30", label: "Period 5 (13:30 - 14:30)" },
    { period: 6, start: "14:30", end: "15:30", label: "Period 6 (14:30 - 15:30)" },
    { period: 7, start: "15:30", end: "16:30", label: "Period 7 (15:30 - 16:30)" }
  ],
  breaks: [
    { id: "tea", name: "TEA BREAK", afterPeriod: 2, start: "10:30", end: "10:45", duration: "15 Min" },
    { id: "lunch", name: "LUNCH BREAK", afterPeriod: 4, start: "12:45", end: "13:30", duration: "45 Min" }
  ]
};

const DEFAULT_CONSTRAINTS = {
  facultyNoOverlap: true,      // Zero faculty overlap
  roomNoOverlap: true,         // Zero room overlap
  consecutiveLabs: true,       // Labs scheduled continuously (2 periods)
  maxConsecutiveClasses: 3,    // Max consecutive classes for faculty
  maxDailyFacultyHours: 4,     // Max hours per faculty per day
  spreadLectures: true,        // Spread lectures across days
  
  customConditions: []
};

const DEFAULT_CLASSES = [];

const DEFAULT_FACULTY = [];

const DEFAULT_ROOMS = [];

const DEFAULT_SUBJECTS = [];

const DEFAULT_USERS = [
  {
    id: "USER-F1",
    username: "ATRIA_FAC_101",
    password: "staff123",
    name: "Faculty Demo Account",
    role: "staff",
    department: "Atria Institute of Technology",
    designation: "Faculty / Timetable Coordinator",
    status: "active"
  }
];

/**
 * Storage Layer with Auto-Fallback & Version-Safe Schema Migration
 */
const AppStore = {
  get(key, defaultValue) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn(`LocalStorage read error for ${key}:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`LocalStorage write error for ${key}:`, e);
    }
  },

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.METADATA)) this.set(STORAGE_KEYS.METADATA, DEFAULT_METADATA);
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!localStorage.getItem(STORAGE_KEYS.CONSTRAINTS)) this.set(STORAGE_KEYS.CONSTRAINTS, DEFAULT_CONSTRAINTS);
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) this.set(STORAGE_KEYS.USERS, DEFAULT_USERS);

    // Enforce the college's current timing configuration without changing inputs.
    const savedSettings = this.get(STORAGE_KEYS.SETTINGS, {});
    this.set(STORAGE_KEYS.SETTINGS, {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
      periodsPerDay: 7,
      periodTimes: DEFAULT_SETTINGS.periodTimes,
      breaks: DEFAULT_SETTINGS.breaks
    });

    if (!localStorage.getItem(STORAGE_KEYS.CUSTOM_LOGO) && typeof ATRIA_LOGO_BASE64 !== 'undefined') {
      this.set(STORAGE_KEYS.CUSTOM_LOGO, ATRIA_LOGO_BASE64);
    }
  },

  resetToDefaults() {
    // Reset means a clean, empty data-entry workspace (not demo timetable data).
    this.set(STORAGE_KEYS.METADATA, DEFAULT_METADATA);
    this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.set(STORAGE_KEYS.CONSTRAINTS, DEFAULT_CONSTRAINTS);
    this.set(STORAGE_KEYS.CLASSES, []);
    this.set(STORAGE_KEYS.FACULTY, []);
    this.set(STORAGE_KEYS.ROOMS, []);
    this.set(STORAGE_KEYS.SUBJECTS, []);
    this.set(STORAGE_KEYS.USERS, DEFAULT_USERS);
    localStorage.setItem("atria_blank_inputs_v1", "done");
    if (typeof ATRIA_LOGO_BASE64 !== 'undefined') this.set(STORAGE_KEYS.CUSTOM_LOGO, ATRIA_LOGO_BASE64);
    localStorage.removeItem(STORAGE_KEYS.TIMETABLE);
  }
};

// Initialize store on script load
AppStore.init();
    