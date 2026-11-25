# Atria Institute of Technology - University Timetable Planner

A constraint-driven, responsive University Timetable Planner web application custom-built for **Atria Institute of Technology**, adhering to official VTU/Atria timetable layouts, Role-Based Access Control (RBAC), Constraint Satisfaction Problem (CSP) backtracking, and strictly **single-page A4 Landscape** PDF/print generation.

---

## 🌟 Key Features

### 1. Authentication & Role-Based Access Control (RBAC)
- **Three Dedicated Login Roles**:
  - **Student Login**: Authenticates via `Admission Number` (USN) & `Password`.
    - *Permissions*: Strictly read-only. Displays **only** the timetable assigned to that student's specific class/section (e.g. `CSE-5A`) along with the "Download Single-Page PDF" and "Print" buttons. Editing tools, room allocations, faculty workloads, and other classes are completely hidden.
  - **Staff Login**: Authenticates via `Staff User ID` & `Password`.
    - *Permissions*: Full visibility across the system. Can view all class timetables (with a quick class switcher), room occupancy allocations, faculty workload summaries, active constraints (read-only), and download single or batch PDFs.
  - **Admin Login**: Authenticates via `Admin ID` & `Password`.
    - *Permissions*: Full system control. Can add/edit/delete classes, subjects (lecture/lab hours, assigned faculty, room), faculty members (initials, max daily/weekly hours), rooms/labs, configure working days & break timings, toggle hard constraints, create custom soft conditions/blocked periods, regenerate timetables with CSP solver, manage accounts, and upload custom official logos.

### 2. Instant Demo Credentials (Available on Login Screen)
| Role | Identifier / Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Student (CSE-5A)** | `1AT21CS042` | `student123` | Kavya Shree M (5th Sem A) |
| **Student (CSE-5B)** | `1AT21CS088` | `student123` | Rahul Verma (5th Sem B) |
| **Student (CSE-3A)** | `1AT22CS015` | `student123` | Sneha Kulkarni (3rd Sem A) |
| **Staff (HOD / Prof)** | `ATRIA_FAC_101` | `staff123` | Dr. R. K. Sharma (Prof & HOD, CSE) |
| **Staff (Assoc. Prof)**| `ATRIA_FAC_102` | `staff123` | Prof. Ananya Patel |
| **Staff (Asst. Prof)** | `ATRIA_FAC_103` | `staff123` | Prof. Vikram Mehra |
| **Admin** | `ADMIN01` | `admin123` | Academic Dean / Timetable Officer |

*1-Click demo buttons on the login portal automatically fill and switch roles for immediate testing.*

---

### 3. Constraint Satisfaction Problem (CSP) & Backtracking Solver
The scheduling engine models timetable construction as a formal CSP:
- **Variables**: Discrete teaching events for each section.
  - $k$-hour Lectures $\rightarrow k$ distinct single-period variables.
  - Multi-period Labs $\rightarrow$ Atomic blocks of continuous duration (e.g., 2 periods).
- **Synchronized batch labs**: create one lab subject allocation per batch (B1, B2, and B3) and assign the same Synchronized Lab Group ID. The solver creates one CSP variable for the group, so all three batches receive the same day and two-hour start/end while keeping separate subjects, faculty, and laboratories.
- **Domains**: Cartesian product of $(\text{Day}, \text{Period}, \text{Room})$.
  - Boundary filters ensure lab blocks never span the **Tea Break (10:30–10:45)** or **Lunch Break (12:45–13:30)**.
- **Hard Constraints**:
  1. **Zero Faculty Overlap**: A teacher cannot be scheduled in two classes at the same period.
  2. **Zero Room Overlap**: A classroom or lab cannot be occupied by two classes simultaneously.
  3. **Zero Class Double-Booking**: A section cannot have more than one subject at the same slot.
  4. **Synchronized Lab Allocation**: B1, B2, and B3 in a synchronized group start and finish together; independent batch time slots are rejected.
  5. **Continuous Lab Allocation**: Labs are strictly continuous two-hour sessions.
  6. **Max Consecutive Classes**: Faculty cannot teach $> 3$ consecutive periods without a break.
  7. **Max Daily Faculty Workload**: Caps faculty daily teaching load (e.g. 4 hrs/day).
- **Soft Constraints & Custom Conditions**:
  - Block specific faculty times (e.g. Dr. RKS Monday P1-P2 administrative council).
  - Block specific class times (e.g. Friday P7 Technical Forum / Seminar).
  - Subject lecture spread across weekdays (max 1 lecture/day per subject).
- **Search Heuristics & Forward Checking**:
  - **MRV (Minimum Remaining Values)**: Schedules the most constrained variables first.
  - **Degree Heuristic**: Prioritizes variables sharing classes, faculty, or rooms.
  - **Forward Checking**: Dynamically prunes invalid domains of unassigned variables and triggers immediate backtracking if domain wipeout occurs.
  - **Conflict Diagnostics**: Detailed feedback pinpointing the exact conflicting subject, faculty, or constraint on infeasible inputs.

---

### 4. Official Atria Timetable Layout & Strictly Single-Page PDF Export
Adheres to the official Atria Institute of Technology format:
- **Header**: Official Atria crest logo (embedded as high-fidelity asset, with Admin upload support), Institution title ("ATRIA INSTITUTE OF TECHNOLOGY"), Autonomous & VTU affiliation subheaders, Department title, and Academic metadata grid (Academic Year, Semester & Section, Room No, W.E.F Date, Revision).
- **Grid**: Days (Monday – Saturday) vs Periods (P1 to P7) with dedicated vertical break columns for **TEA BREAK (10:30–10:45)** and **LUNCH BREAK (12:45–13:30)**. The seven periods cover 08:30–16:30.
- **Course & Faculty Legend**: Standard compact table listing Sl No, Course Code, Course Title, Faculty In-charge, Faculty Initials, Hours/Week, and Allocated Room.
- **Signatures Footer**:
  - Left: Timetable Coordinator
  - Center: Head of Department (HOD)
  - Right: Principal / Dean Academic
- **Strict Single-Page A4 Landscape Guarantee**:
  - Styled with CSS `@page { size: A4 landscape; margin: 6mm; }`.
  - Fits on **one single A4 Landscape page** without overflowing onto a second page.
  - Strips away sidebars, headers, action buttons, and navigation elements during export.
  - Supports both single-class export and batch multi-class export with clean page breaks.

---

## 🚀 How to Run the Application

### Option A: Open Directly in Any Web Browser
Simply double-click or open `index.html` in your favorite web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).

### Option B: Run via Built-in Lightweight Node.js Server
```bash
# Start server on http://localhost:3000
node server.js
```
Open `http://localhost:3000` in your web browser.

---

## 📁 File Structure
```
Timetable_planner/
├── index.html                  # Main SPA entry point
├── server.js                   # Zero-dependency Node.js HTTP server
├── README.md                   # Documentation and user manual
├── css/
│   └── styles.css              # Modern UI & strict @media print A4 landscape rules
├── js/
│   ├── logoData.js             # Base64 encoded official Atria crest logo
│   ├── data.js                 # Initial seed data, defaults, LocalStorage store
│   ├── cspSolver.js            # Backtracking CSP engine with MRV & forward checking
│   ├── auth.js                 # Role-Based Access Control (Student/Staff/Admin)
│   ├── timetableRenderer.js    # Official Atria sheet renderer & room/workload views
│   └── app.js                  # Application controller, modal forms, event handlers
└── public/
    └── assets/
        ├── atria_logo.jpg      # Official Atria Institute of Technology Logo
        └── logo_base64.txt     # Logo base64 data string
```
