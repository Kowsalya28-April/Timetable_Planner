/**
 * ATRIA INSTITUTE OF TECHNOLOGY - Timetable Planner
 * Core Application Controller & UI Orchestrator
 */

class AppController {
  constructor() {
    this.currentTab = 'data'; // Start faculty in Manage Inputs so they can enter their own data
    this.selectedClassId = null;
    this.timetableData = AppStore.get(STORAGE_KEYS.TIMETABLE, null);
    this.activeAuthTab = 'student'; // 'student' | 'staff'
    
    // No timetable is generated automatically. Faculty enter all inputs first,
    // then explicitly click Generate Timetable.
  }

  init() {
    this.render();
  }

  /**
   * Main Render Dispatcher
   */
  render() {
    const container = document.getElementById('app-container');
    if (!container) return;

    if (!auth.isLoggedIn()) {
      container.innerHTML = this.renderAuthView();
      this.attachAuthListeners();
      return;
    }

    // Role-based state constraints
    if (auth.isStudent()) {
      const studentUser = auth.getCurrentUser();
      this.selectedClassId = studentUser.classId || 'CSE-5A';
      this.currentTab = 'timetable';
    }

    container.innerHTML = `
      ${this.renderTopNavbar()}
      ${!auth.isStudent() ? this.renderSubNavbar() : ''}
      <main class="main-wrapper">
        ${this.renderMainContent()}
      </main>
    `;

    this.attachMainListeners();
  }

  // =========================================================================
  // AUTHENTICATION VIEW & LOGIN TABS
  // =========================================================================

  renderAuthView() {
    const logoSrc = timetableRenderer.getLogo();

    return `
      <div class="auth-wrapper">
        <div class="auth-card-container">
          
          <!-- LEFT BRANDING SIDE -->
          <div class="auth-left-brand">
            <div>
              <div class="auth-brand-logo-wrap">
                <img src="${logoSrc}" alt="Atria Institute Logo" class="auth-brand-logo-img" />
              </div>
              <h1 class="auth-brand-title">ATRIA INSTITUTE OF TECHNOLOGY</h1>
              <p class="auth-brand-subtitle">Autonomous Institution | Approved by AICTE | Affiliated to VTU</p>
              <span class="auth-brand-badge">Constraint-Driven Timetable Planner</span>
            </div>

            <ul class="auth-features-list">
              <li>✓ Role-Based Access: Student & Faculty</li>
              <li>✓ CSP Backtracking Scheduling Engine</li>
              <li>✓ Zero Faculty & Room Overlap Guarantee</li>
              <li>✓ Strictly 1-Page A4 Landscape PDF Export</li>
              <li>✓ Official Atria VTU Header & Signatures</li>
            </ul>

            <div style="font-size: 11px; opacity: 0.8; margin-top: 20px;">
              Anandnagar, Bengaluru - 560 024, Karnataka
            </div>
          </div>

          <!-- RIGHT LOGIN FORM -->
          <div class="auth-right-form">
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Portal Login</h2>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Select your role to access your timetable dashboard</p>

            <!-- Role Selector Tabs -->
            <div class="auth-tabs">
              <button class="auth-tab-btn ${this.activeAuthTab === 'student' ? 'active' : ''}" data-role="student">
                🎓 Student
              </button>
              <button class="auth-tab-btn ${this.activeAuthTab === 'staff' ? 'active' : ''}" data-role="staff">
                👨‍🏫 Faculty / Staff
              </button>
            </div>

            <!-- Login Form -->
            <form id="login-form">
              <div class="form-group">
                <label class="form-label" id="login-id-label">
                  ${this.activeAuthTab === 'student' ? 'Admission Number (USN)' : 'Staff User ID'}
                </label>
                <input 
                  type="text" 
                  id="login-username" 
                  class="form-input" 
                  placeholder="${this.activeAuthTab === 'student' ? 'e.g. 1AT24AI048' : 'e.g. ATRIA_FAC_101'}" 
                  required 
                />
              </div>

              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin-bottom: 0;">Password</label>
                  ${this.activeAuthTab === 'student' ? `
                    <span style="font-size: 11px; color: #0284c7; font-weight: 600;">Default: student123</span>
                  ` : ''}
                </div>
                <input 
                  type="password" 
                  id="login-password" 
                  class="form-input" 
                  placeholder="Enter your password" 
                  required 
                />
              </div>

              ${this.activeAuthTab === 'student' ? `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:-8px; margin-bottom:14px;">
                  <span style="font-size:11px; color:#64748b;">Student account registration</span>
                  <a href="#" id="link-student-register" style="color:var(--atria-red-primary); font-size:11.5px; font-weight:700; text-decoration:underline;">New Student? Register here</a>
                </div>
              ` : `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:-8px; margin-bottom:14px;">
                  <span style="font-size:11px; color:#64748b;">Faculty can register and access the planner directly</span>
                  <a href="#" id="link-staff-register" style="color:var(--atria-red-primary); font-size:11.5px; font-weight:700; text-decoration:underline;">New Faculty? Register here</a>
                </div>
              `}

              <div id="login-error-msg" style="color: #e11d48; font-size: 12px; margin-bottom: 12px; display: none;"></div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 4px;">
                Sign In to Dashboard
              </button>
            </form>

            <!-- Demo Quick-Fill Credentials -->
            <div class="demo-credentials-box">
              <div class="demo-title">⚡ Instant Demo Credentials (Click to Fill):</div>
              <div class="demo-pills-row">
                <button type="button" class="demo-pill-btn" style="background: #fef2f2; border-color: #fca5a5; font-weight: 700; color: #991b1b;" data-role="student" data-user="1AT24AI048" data-pass="student123">
                  🎓 Student (AIML): 1AT24AI048 (Kowsalya G)
                </button>
                <button type="button" class="demo-pill-btn" data-role="student" data-user="1AT21CS042" data-pass="student123">
                  🎓 Student (CSE-5A): 1AT21CS042
                </button>
                <button type="button" class="demo-pill-btn" data-role="student" data-user="1AT21CS088" data-pass="student123">
                  🎓 Student (CSE-5B): 1AT21CS088
                </button>
                <button type="button" class="demo-pill-btn" data-role="staff" data-user="ATRIA_FAC_101" data-pass="staff123">
                  👨‍🏫 Staff: ATRIA_FAC_101 (Dr. RKS)
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;
  }

  attachAuthListeners() {
    // Role tabs
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeAuthTab = e.currentTarget.dataset.role;
        this.render();
      });
    });

    // Demo pills click-to-fill
    document.querySelectorAll('.demo-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const { role, user, pass } = e.currentTarget.dataset;
        this.activeAuthTab = role;
        this.render();
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');
        if (userInput && passInput) {
          userInput.value = user;
          passInput.value = pass;
        }
      });
    });

    // Student and Faculty self-registration links. Admin registration is never public.
    document.getElementById('link-student-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showQuickStudentRegisterModal();
    });
    document.getElementById('link-staff-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showStaffRegisterModal();
    });

    // Form submit
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const result = auth.login(this.activeAuthTab, username, password);

        if (result.success) {
          this.render();
        } else {
          const errBox = document.getElementById('login-error-msg');
          if (errBox) {
            errBox.textContent = result.error;
            errBox.style.display = 'block';
          }
        }
      });
    }
  }

  // =========================================================================
  // NAVBARS & HEADER
  // =========================================================================

  renderTopNavbar() {
    const user = auth.getCurrentUser();
    const logoSrc = timetableRenderer.getLogo();

    let roleBadgeClass = 'role-student';
    let roleText = 'Student';
    if (auth.isStaff()) { roleBadgeClass = 'role-staff'; roleText = 'Faculty / Staff'; }

    return `
      <header class="top-navbar no-print">
        <div class="nav-brand">
          <img src="${logoSrc}" alt="Atria Logo" class="nav-brand-logo" />
          <div class="nav-brand-text">
            <h1>ATRIA INSTITUTE OF TECHNOLOGY</h1>
            <p>Constraint-Driven Academic Timetable Planner</p>
          </div>
        </div>

        <div class="nav-actions">
          ${auth.isStaff() ? `
            <button class="btn btn-primary btn-sm" id="btn-generate-timetable" title="Run Backtracking CSP Solver">
              ⚙️ Generate Timetable
            </button>
          ` : ''}

          <div class="user-badge">
            <span class="user-role-pill ${roleBadgeClass}">${roleText}</span>
            <div class="user-info-text">
              <span class="user-name">${user.name}</span>
              <span class="user-detail">${user.username} ${user.classId ? `(${user.classId})` : ''}</span>
            </div>
          </div>

          <button class="btn btn-secondary btn-sm" id="btn-logout" title="Sign Out">
            🚪 Logout
          </button>
        </div>
      </header>
    `;
  }

  renderSubNavbar() {
    const isAdm = auth.isAdmin();

    return `
      <nav class="sub-navbar no-print">
        <button class="nav-tab-btn ${this.currentTab === 'timetable' ? 'active' : ''}" data-tab="timetable">
          📅 Class Timetables
        </button>
        <button class="nav-tab-btn ${this.currentTab === 'rooms' ? 'active' : ''}" data-tab="rooms">
          🏢 Room Allocations
        </button>
        <button class="nav-tab-btn ${this.currentTab === 'faculty' ? 'active' : ''}" data-tab="faculty">
          👨‍🏫 Faculty Workload
        </button>
        <button class="nav-tab-btn ${this.currentTab === 'constraints' ? 'active' : ''}" data-tab="constraints">
          ⚖️ Active Constraints (Edit)
        </button>
        ${isAdm ? `
          <button class="nav-tab-btn ${this.currentTab === 'data' ? 'active' : ''}" data-tab="data">
            🗃️ Manage Inputs (Classes/Subjects/Rooms)
          </button>
          <button class="nav-tab-btn ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
            ⚙️ Institution & Logo Settings
          </button>
        ` : ''}
      </nav>
    `;
  }

  // =========================================================================
  // MAIN CONTENT ROUTER
  // =========================================================================

  renderMainContent() {
    switch (this.currentTab) {
      case 'timetable':
        return this.renderTimetableView();
      case 'rooms':
        return timetableRenderer.renderRoomAllocationView(this.timetableData);
      case 'faculty':
        return timetableRenderer.renderFacultyWorkloadView(this.timetableData);
      case 'constraints':
        return this.renderConstraintsView();
      case 'data':
        return this.renderDataManagementView();
      case 'settings':
        return this.renderSettingsView();
      default:
        return this.renderTimetableView();
    }
  }

  // =========================================================================
  // TIMETABLE VIEW & SINGLE-PAGE PRINT / EXPORT
  // =========================================================================

  renderTimetableView() {
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const isStudent = auth.isStudent();
    const currentClass = classes.find(c => c.id === this.selectedClassId) || classes[0];
    if (!classes.length) {
      return `
        <div class="section-card" style="max-width:900px;margin:32px auto;text-align:center;padding:36px;">
          <h2 class="card-title">No timetable data entered yet</h2>
          <p class="card-subtitle" style="margin:12px 0 22px;">Start by adding your academic classes, faculty members, rooms / labs and subjects. The planner will generate a timetable only after you enter the required information.</p>
          ${!isStudent ? '<button class="btn btn-primary" id="btn-open-manage-inputs">＋ Start Adding Inputs</button>' : '<p>Please contact your faculty timetable coordinator.</p>'}
        </div>`;
    }
    if (!this.selectedClassId || !classes.some(c => c.id === this.selectedClassId)) this.selectedClassId = classes[0].id;

    return `
      <!-- Control Banner -->
      <div class="control-banner no-print">
        <div class="class-switcher-wrap">
          ${isStudent ? `
            <div>
              <span class="switcher-label">Assigned Student Class:</span>
              <strong style="font-size: 15px; color: #0f172a; margin-left: 6px;">${currentClass.name} (${currentClass.department})</strong>
            </div>
          ` : `
            <label class="switcher-label" for="class-select">Select Section / Class:</label>
            <select id="class-select" class="form-select" style="width: auto; min-width: 240px; font-weight: 600;">
              ${classes.map(c => `
                <option value="${c.id}" ${c.id === this.selectedClassId ? 'selected' : ''}>
                  ${c.name} (${c.department})
                </option>
              `).join('')}
            </select>
          `}
        </div>

        <div class="export-actions-wrap">
          <button class="btn btn-primary" id="btn-download-pdf">
            📄 Download Single-Page PDF
          </button>
          <button class="btn btn-secondary" id="btn-print-timetable">
            🖨️ Print Timetable
          </button>
          ${!isStudent ? `
            <button class="btn btn-secondary" id="btn-batch-export" title="Export All Classes in Single Document">
              📑 Export All Classes (Batch PDF)
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Single-Page Timetable Sheet Container -->
      <div class="sheet-outer-card">
        ${timetableRenderer.renderClassSheet(this.selectedClassId, this.timetableData)}
      </div>
    `;
  }

  // =========================================================================
  // CONSTRAINTS DASHBOARD (CUSTOM PREFERENCES EDITABLE BY FACULTY / STAFF)
  // =========================================================================

  renderConstraintsView() {
    const constraints = AppStore.get(STORAGE_KEYS.CONSTRAINTS, DEFAULT_CONSTRAINTS);
    const isAdm = auth.isAdmin();
    const canManageCustom = auth.isStaff() || isAdm;
    const disabledAttr = !isAdm ? 'disabled' : '';

    return `
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Timetable Constraints Engine</h3>
            <p class="card-subtitle">
              ${canManageCustom ? 'Core rules protect timetable feasibility. Faculty / staff can add optional preferences and unavailable time slots.' : 'View the core scheduling rules and optional timetable preferences.'}
            </p>
          </div>
          ${canManageCustom ? `
            <button class="btn btn-primary btn-sm" id="btn-add-condition">
              ➕ Add Preference / Blocked Slot
            </button>
          ` : ''}
        </div>

        <!-- Hard Constraints Section -->
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Core Hard Constraints (Strict Feasibility)</h4>
        <div class="constraints-grid">
          
          <div class="constraint-toggle-card">
            <div class="constraint-info">
              <h4>Zero Faculty Overlap</h4>
              <p>A faculty cannot be scheduled in two classes simultaneously.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="chk-faculty-overlap" ${constraints.facultyNoOverlap ? 'checked' : ''} ${disabledAttr}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="constraint-toggle-card">
            <div class="constraint-info">
              <h4>Zero Room Overlap</h4>
              <p>A classroom or lab cannot be allocated to multiple classes at once.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="chk-room-overlap" ${constraints.roomNoOverlap ? 'checked' : ''} ${disabledAttr}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="constraint-toggle-card">
            <div class="constraint-info">
              <h4>Continuous Lab Slots</h4>
              <p>Labs must occupy continuous multi-period blocks without crossing breaks.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="chk-consecutive-labs" ${constraints.consecutiveLabs ? 'checked' : ''} ${disabledAttr}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="constraint-toggle-card">
            <div class="constraint-info">
              <h4>Subject Lecture Spread</h4>
              <p>Evenly distribute subject lectures across different weekdays.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="chk-spread-lectures" ${constraints.spreadLectures ? 'checked' : ''} ${disabledAttr}>
              <span class="slider"></span>
            </label>
          </div>

        </div>

        <!-- Numerical Limits -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <label class="form-label">Max Consecutive Classes for Faculty</label>
            <input type="number" id="inp-max-consec" class="form-input" min="1" max="5" value="${constraints.maxConsecutiveClasses || 3}" ${disabledAttr} />
            <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Faculty must have a break after this many consecutive teaching hours.</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <label class="form-label">Max Daily Hours per Faculty</label>
            <input type="number" id="inp-max-daily" class="form-input" min="1" max="8" value="${constraints.maxDailyFacultyHours || 4}" ${disabledAttr} />
            <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Upper ceiling of teaching load a teacher can handle in a single day.</p>
          </div>
        </div>

        <!-- Custom Soft Conditions Section -->
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px; color: #0f172a;">Optional Scheduling Preferences & Unavailable Time Slots</h4>
        <p style="font-size:12px;color:#64748b;margin:0 0 12px;">
          Add a preference when you would like the solver to try to follow a scheduling choice (soft condition), or block a faculty / class time when it is unavailable. These are optional; leave this section empty if there are no special requirements. Core hard constraints remain separate.
        </p>
        <div id="custom-conditions-list">
          ${(constraints.customConditions || []).map(cond => `
            <div class="condition-item ${!cond.active ? 'inactive' : ''}">
              <div>
                <strong>${cond.name}</strong>
                <p style="font-size: 12px; color: #64748b; margin-top: 2px;">${cond.description}</p>
                <div style="margin-top: 4px;">
                  <span class="user-role-pill" style="background: #e2e8f0; color: #334155;">Type: ${cond.type}</span>
                  ${cond.day ? `<span class="user-role-pill" style="background: #fef3c7; color: #92400e;">Day: ${cond.day}</span>` : ''}
                  ${cond.periods ? `<span class="user-role-pill" style="background: #e0f2fe; color: #0369a1;">Periods: ${cond.periods.join(', ')}</span>` : ''}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${canManageCustom ? `
                  <label class="switch" title="Enable or disable this preference">
                    <input type="checkbox" class="toggle-cond-chk" data-id="${cond.id}" ${cond.active ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                  <button class="btn btn-danger btn-sm btn-delete-cond" data-id="${cond.id}">🗑️</button>
                ` : `
                  <span class="user-role-pill ${cond.active ? 'role-staff' : 'role-student'}">${cond.active ? 'ACTIVE' : 'INACTIVE'}</span>
                `}
              </div>
            </div>
          `).join('') || '<div class="empty-state-card" style="padding:16px;">No optional preferences or blocked slots have been added. This is perfectly fine if there are no special scheduling requirements.</div>'}
        </div>

      </div>
    `;
  }

  // =========================================================================
  // DATA MANAGEMENT VIEW
  // =========================================================================

  renderDataManagementView() {
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const subjects = AppStore.get(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    const faculty = AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY);
    const rooms = AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);

    return `
      <!-- Classes Card -->
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Academic Classes & Sections</h3>
            <p class="card-subtitle">Start here. Add classes first, then faculty members and rooms / labs, and finally allocate subjects.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-class">➕ Add Class</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Class ID</th>
              <th>Class / Section Name</th>
              <th>Department</th>
              <th>Semester</th>
              <th>Section</th>
              <th>Default Room</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${classes.length ? classes.map(c => `
              <tr>
                <td><strong>${c.id}</strong></td>
                <td>${c.name}</td>
                <td>${c.department}</td>
                <td>${c.semester}</td>
                <td>${c.section}</td>
                <td>${c.defaultRoom}</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-edit-class" data-id="${c.id}">Edit</button> <button class="btn btn-danger btn-sm btn-del-class" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="7">No classes added yet. Click Add Class to begin.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Subjects Card -->
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Curriculum Subjects & Course Allocation</h3>
            <p class="card-subtitle">Manage theory and lab subjects. For synchronized labs, create one lab subject per batch and use the same group ID for B1, B2, and B3.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-subject">➕ Add Subject</button>
        </div>
        <div class="table-responsive-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject Name</th>
                <th>Class</th>
                <th>Type</th>
                <th>Hrs/Wk</th>
                <th>Assigned Faculty</th>
                <th>Room</th>
                <th>Batch / Lab Group</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.length ? subjects.map(s => {
                const fac = faculty.find(f => f.id === s.facultyId);
                return `
                  <tr>
                    <td><strong>${s.code}</strong></td>
                    <td>${s.name}</td>
                    <td>${s.classId}</td>
                    <td><span class="user-role-pill ${s.type === 'Lab' ? 'role-student' : 'role-staff'}">${s.type}</span></td>
                    <td>${s.hoursPerWeek} hrs</td>
                    <td>${fac ? `${fac.name} [${fac.initials}]` : 'Unassigned'}</td>
                    <td>${s.roomId}</td>
                    <td>${s.type === 'Lab' ? `${s.batch || s.batches || '-'}${s.synchronizedGroupId || s.labGroupId ? ` / ${s.synchronizedGroupId || s.labGroupId}` : ''}` : '-'}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm btn-edit-subject" data-id="${s.id}">Edit</button> <button class="btn btn-danger btn-sm btn-del-subject" data-id="${s.id}">Delete</button>
                    </td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="9">No subjects added yet. Add classes, faculty and rooms first.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Faculty Card -->
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Faculty Directory</h3>
            <p class="card-subtitle">Manage professors, initials, designation, and max teaching load limits.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-faculty">➕ Add Faculty</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Faculty Name</th>
              <th>Initials</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Max Daily</th>
              <th>Max Weekly</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${faculty.length ? faculty.map(f => `
              <tr>
                <td><strong>${f.id}</strong></td>
                <td>${f.name}</td>
                <td class="font-bold">[${f.initials}]</td>
                <td>${f.designation}</td>
                <td>${f.department}</td>
                <td>${f.maxDailyHours} hrs</td>
                <td>${f.maxWeeklyHours} hrs</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-edit-faculty" data-id="${f.id}">Edit</button> <button class="btn btn-danger btn-sm btn-del-faculty" data-id="${f.id}">Delete</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8">No faculty members added yet. Click Add Faculty.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Rooms Card -->
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Classrooms & Laboratories</h3>
            <p class="card-subtitle">Manage campus rooms, capacities, and laboratory resources.</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-room">➕ Add Room</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Room ID</th>
              <th>Room Name</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Block / Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rooms.length ? rooms.map(r => `
              <tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.name}</td>
                <td><span class="user-role-pill ${r.type === 'Lab' ? 'role-student' : 'role-staff'}">${r.type}</span></td>
                <td>${r.capacity} Seats</td>
                <td>${r.block}</td>
                <td>
                  <button class="btn btn-secondary btn-sm btn-edit-room" data-id="${r.id}">Edit</button> <button class="btn btn-danger btn-sm btn-del-room" data-id="${r.id}">Delete</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6">No rooms or labs added yet. Click Add Room.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  // =========================================================================

  renderSettingsView() {
    const meta = AppStore.get(STORAGE_KEYS.METADATA, DEFAULT_METADATA);
    const logoSrc = timetableRenderer.getLogo();

    return `
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Institution Header & Official Logo Configuration</h3>
            <p class="card-subtitle">Customize institution branding, academic terms, and signatory authorities.</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-reset-defaults">
            🔄 Reset All Data to Factory Defaults
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 24px;">
          <!-- Logo Uploader & Preview -->
          <div style="text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; background: #f8fafc;">
            <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">Official Atria Crest Logo</h4>
            <div style="background: #ffffff; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px;">
              <img src="${logoSrc}" alt="Logo Preview" id="logo-preview-img" style="max-height: 120px; max-width: 100%; object-fit: contain;" />
            </div>
            <label class="btn btn-secondary btn-sm btn-block" style="cursor: pointer;">
              📁 Upload New Logo
              <input type="file" id="logo-file-input" accept="image/*" style="display: none;" />
            </label>
            <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Upload official JPG or PNG file. Automatically scaled and embedded for crisp single-page PDF generation.</p>
          </div>

          <!-- Metadata Form -->
          <form id="metadata-form">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Institution Name</label>
                <input type="text" id="meta-inst-name" class="form-input" value="${meta.instituteName}" required />
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Affiliation & Accreditation Line</label>
                <input type="text" id="meta-inst-affil" class="form-input" value="${meta.instituteAffiliation}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Department Title</label>
                <input type="text" id="meta-dept" class="form-input" value="${meta.department}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Academic Year</label>
                <input type="text" id="meta-acad-year" class="form-input" value="${meta.academicYear}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Semester Type</label>
                <input type="text" id="meta-sem-type" class="form-input" value="${meta.semesterType}" required />
              </div>
              <div class="form-group">
                <label class="form-label">W.E.F (Effective Date)</label>
                <input type="text" id="meta-wef-date" class="form-input" value="${meta.wefDate}" required />
              </div>
            </div>

            <h4 style="font-size: 13px; font-weight: 700; margin: 16px 0 8px 0; color: #0f172a;">Signature Spaces on Official Printed Timetable</h4>
            <p style="font-size:12px;color:#64748b;margin:0 0 12px;">
              Four separate signature spaces are printed automatically: Timetable Coordinator, Head of Department (HOD), Dean Academic and Principal. No names need to be entered here.
            </p>

            <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
              💾 Save Institution Settings
            </button>
          </form>
        </div>

      </div>
    `;
  }

  // =========================================================================
  // CSP SOLVER RUNNER & STATS MODAL
  // =========================================================================

  generateTimetable(showModal = true) {
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, []);
    const subjects = AppStore.get(STORAGE_KEYS.SUBJECTS, []);
    const faculty = AppStore.get(STORAGE_KEYS.FACULTY, []);
    const rooms = AppStore.get(STORAGE_KEYS.ROOMS, []);
    const missing = [];
    if (!classes.length) missing.push('Classes / Sections');
    if (!faculty.length) missing.push('Faculty');
    if (!rooms.length) missing.push('Rooms / Labs');
    if (!subjects.length) missing.push('Subjects');
    if (missing.length) {
      const message = `Please add the following inputs before generating a timetable: ${missing.join(', ')}.`;
      if (showModal) alert(message);
      return { success: false, error: message, conflicts: [message], stats: { variablesCount: 0, backtracksCount: 0, elapsedMs: 0 } };
    }
    const config = {
      classes: AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES),
      subjects: AppStore.get(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS),
      faculty: AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY),
      rooms: AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS),
      settings: AppStore.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
      constraints: AppStore.get(STORAGE_KEYS.CONSTRAINTS, DEFAULT_CONSTRAINTS)
    };

    const solver = new CSPSolver(config);
    const result = solver.solve();

    if (result.success) {
      this.timetableData = result;
      AppStore.set(STORAGE_KEYS.TIMETABLE, result);
      this.currentTab = 'timetable';
      if (showModal) this.render();
    }

    if (showModal) {
      this.showSolverResultModal(result);
    }
  }

  showSolverResultModal(result) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">
              ${result.success ? '✅ Timetable Generated Successfully' : '⚠️ Constraint Conflict Detected'}
            </h3>
            <button class="modal-close-btn" id="modal-close-x">&times;</button>
          </div>
          <div class="modal-body">
            ${result.success ? `
              <p style="color: #059669; font-weight: 600;">
                All hard constraints satisfied! Backtracking CSP search successfully mapped all lecture and laboratory sessions.
              </p>
              <div class="solver-stat-grid">
                <div class="solver-stat-box">
                  <div class="solver-stat-value">${result.stats.variablesCount}</div>
                  <div class="solver-stat-label">Events Scheduled</div>
                </div>
                <div class="solver-stat-box">
                  <div class="solver-stat-value">${result.stats.backtracksCount}</div>
                  <div class="solver-stat-label">Backtracks Required</div>
                </div>
                <div class="solver-stat-box">
                  <div class="solver-stat-value">${result.stats.elapsedMs} ms</div>
                  <div class="solver-stat-label">Execution Time</div>
                </div>
              </div>
              <p style="font-size: 12px; color: #64748b;">
                Zero faculty overlaps, zero room clashes, and continuous lab slots strictly preserved across all sections.
              </p>
            ` : `
              <p style="color: #e11d48; font-weight: 600;">
                ${result.error || 'The backtracking solver could not find a valid schedule with current constraints.'}
              </p>
              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; margin: 14px 0;">
                <h5 style="color: #9f1239; font-size: 12px; font-weight: 700; margin-bottom: 6px;">Conflict Diagnostics:</h5>
                <ul style="font-size: 12px; color: #9f1239; padding-left: 20px;">
                  ${(result.conflicts || []).map(c => `<li>${c}</li>`).join('')}
                </ul>
              </div>
              <p style="font-size: 12px; color: #64748b;">
                Tip: Review the Active Constraints tab to check if any faculty has too many blocked periods or exceeds weekly hour limits.
              </p>
            `}
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="modal-close-btn">
              ${result.success ? 'View Generated Timetables' : 'Adjust Constraints'}
            </button>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      modalRoot.innerHTML = '';
      this.render();
    };

    document.getElementById('modal-close-x')?.addEventListener('click', close);
    document.getElementById('modal-close-btn')?.addEventListener('click', close);
  }

  // =========================================================================
  // EVENT LISTENERS & ACTIONS
  // =========================================================================

  attachMainListeners() {
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      auth.logout();
      this.render();
    });

    // Sub-navbar Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentTab = e.currentTarget.dataset.tab;
        this.render();
      });
    });

    document.getElementById('btn-open-manage-inputs')?.addEventListener('click', () => {
      this.currentTab = 'data';
      this.render();
    });

    // Class Switcher
    const classSelect = document.getElementById('class-select');
    if (classSelect) {
      classSelect.addEventListener('change', (e) => {
        this.selectedClassId = e.target.value;
        this.render();
      });
    }

    // Generate Timetable button
    document.getElementById('btn-generate-timetable')?.addEventListener('click', () => {
      this.generateTimetable(true);
    });

    // Download Single-Page PDF & Print Timetable
    document.getElementById('btn-download-pdf')?.addEventListener('click', () => {
      this.triggerSinglePagePrint(this.selectedClassId);
    });

    document.getElementById('btn-print-timetable')?.addEventListener('click', () => {
      this.triggerSinglePagePrint(this.selectedClassId);
    });

    // Batch Export for all classes
    document.getElementById('btn-batch-export')?.addEventListener('click', () => {
      this.triggerBatchExport();
    });

    // Logo upload
    const logoInput = document.getElementById('logo-file-input');
    if (logoInput) {
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            const b64 = re.target.result;
            AppStore.set(STORAGE_KEYS.CUSTOM_LOGO, b64);
            const preview = document.getElementById('logo-preview-img');
            if (preview) preview.src = b64;
            alert('Official Atria Logo successfully updated and saved!');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Metadata Save Form
    const metaForm = document.getElementById('metadata-form');
    if (metaForm) {
      metaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const meta = {
          ...AppStore.get(STORAGE_KEYS.METADATA, DEFAULT_METADATA),
          instituteName: document.getElementById('meta-inst-name').value,
          instituteAffiliation: document.getElementById('meta-inst-affil').value,
          department: document.getElementById('meta-dept').value,
          academicYear: document.getElementById('meta-acad-year').value,
          semesterType: document.getElementById('meta-sem-type').value,
          wefDate: document.getElementById('meta-wef-date').value,
        };
        AppStore.set(STORAGE_KEYS.METADATA, meta);
        alert('Institution & Signature settings saved successfully!');
        this.render();
      });
    }

    // Reset Factory Defaults
    document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
      if (confirm('Reset all timetables, subjects, and constraints to initial Atria factory defaults?')) {
        AppStore.resetToDefaults();
        this.generateTimetable(false);
        this.render();
      }
    });

    // Attach Constraints toggles
    this.attachConstraintListeners();
    // Attach Data Management listeners
    this.attachDataListeners();
    // Attach User Management listeners
    this.attachUserListeners();
  }

  attachConstraintListeners() {
    const isAdm = auth.isAdmin();
    const canManageCustom = auth.isStaff() || isAdm;
    if (!canManageCustom) return;

    const constraints = AppStore.get(STORAGE_KEYS.CONSTRAINTS, DEFAULT_CONSTRAINTS);
    constraints.customConditions = constraints.customConditions || [];

    const saveConstraints = () => {
      AppStore.set(STORAGE_KEYS.CONSTRAINTS, constraints);
    };

    // Only administrators can alter core solver limits. Faculty can manage optional custom rules below.
    if (isAdm) {
      document.getElementById('chk-faculty-overlap')?.addEventListener('change', (e) => {
        constraints.facultyNoOverlap = e.target.checked;
        saveConstraints();
      });

      document.getElementById('chk-room-overlap')?.addEventListener('change', (e) => {
        constraints.roomNoOverlap = e.target.checked;
        saveConstraints();
      });

      document.getElementById('chk-consecutive-labs')?.addEventListener('change', (e) => {
        constraints.consecutiveLabs = e.target.checked;
        saveConstraints();
      });

      document.getElementById('chk-spread-lectures')?.addEventListener('change', (e) => {
        constraints.spreadLectures = e.target.checked;
        saveConstraints();
      });

      document.getElementById('inp-max-consec')?.addEventListener('change', (e) => {
        constraints.maxConsecutiveClasses = parseInt(e.target.value) || 3;
        saveConstraints();
      });

      document.getElementById('inp-max-daily')?.addEventListener('change', (e) => {
        constraints.maxDailyFacultyHours = parseInt(e.target.value) || 4;
        saveConstraints();
      });

    }

    // Custom conditions toggle
    document.querySelectorAll('.toggle-cond-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const condId = e.target.dataset.id;
        const cond = constraints.customConditions.find(c => c.id === condId);
        if (cond) {
          cond.active = e.target.checked;
          saveConstraints();
          this.render();
        }
      });
    });

    // Delete custom condition
    document.querySelectorAll('.btn-delete-cond').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const condId = e.currentTarget.dataset.id;
        constraints.customConditions = constraints.customConditions.filter(c => c.id !== condId);
        saveConstraints();
        this.render();
      });
    });

    // Add Custom Condition modal
    document.getElementById('btn-add-condition')?.addEventListener('click', () => {
      this.showAddConditionModal();
    });
  }

  showAddConditionModal() {
    const faculty = AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY);
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Add Custom Soft Condition / Blocked Slot</h3>
            <button class="modal-close-btn" id="cond-modal-close">&times;</button>
          </div>
          <form id="add-cond-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Condition Name</label>
                <input type="text" id="cond-name" class="form-input" placeholder="e.g. Dr. RKS Morning Meeting" required />
              </div>
              <div class="form-group">
                <label class="form-label">Condition Type</label>
                <select id="cond-type" class="form-select">
                  <option value="block_faculty">Block Specific Faculty Time Slot</option>
                  <option value="block_class">Block Specific Class / Section Time Slot</option>
                  <option value="no_labs_after">No Labs After Period X</option>
                </select>
              </div>
              <div class="form-group" id="group-faculty">
                <label class="form-label">Select Faculty</label>
                <select id="cond-faculty" class="form-select">
                  ${faculty.map(f => `<option value="${f.id}">${f.name} [${f.initials}]</option>`).join('')}
                </select>
              </div>
              <div class="form-group" id="group-class" style="display: none;">
                <label class="form-label">Select Class</label>
                <select id="cond-class" class="form-select">
                  ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Weekday</label>
                <select id="cond-day" class="form-select">
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Period Numbers (comma-separated, e.g. 1, 2)</label>
                <input type="text" id="cond-periods" class="form-input" placeholder="e.g. 1, 2" value="1, 2" required />
              </div>
              <div class="form-group">
                <label class="form-label">Description / Reason</label>
                <input type="text" id="cond-desc" class="form-input" placeholder="e.g. HoD Administrative review" required />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="cond-modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Condition</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const typeSelect = document.getElementById('cond-type');
    typeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      document.getElementById('group-faculty').style.display = (val === 'block_faculty') ? 'block' : 'none';
      document.getElementById('group-class').style.display = (val === 'block_class') ? 'block' : 'none';
    });

    const close = () => { modalRoot.innerHTML = ''; };
    document.getElementById('cond-modal-close').addEventListener('click', close);
    document.getElementById('cond-modal-cancel').addEventListener('click', close);

    document.getElementById('add-cond-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const constraints = AppStore.get(STORAGE_KEYS.CONSTRAINTS, DEFAULT_CONSTRAINTS);
      constraints.customConditions = constraints.customConditions || [];
      const periodsRaw = document.getElementById('cond-periods').value;
      const periods = periodsRaw.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));

      const newCond = {
        id: 'cond-' + Date.now(),
        name: document.getElementById('cond-name').value,
        type: document.getElementById('cond-type').value,
        facultyId: document.getElementById('cond-faculty').value,
        classId: document.getElementById('cond-class').value,
        day: document.getElementById('cond-day').value,
        periods: periods,
        active: true,
        description: document.getElementById('cond-desc').value
      };

      constraints.customConditions.push(newCond);
      AppStore.set(STORAGE_KEYS.CONSTRAINTS, constraints);
      close();
      this.render();
    });
  }

  // =========================================================================
  // DATA MANAGEMENT HELPERS
  // =========================================================================

  attachDataListeners() {
    if (!auth.isAdmin()) return;

    // Edit existing input records
    document.querySelectorAll('.btn-edit-class').forEach(btn => btn.addEventListener('click', () => this.showEditInputModal('class', btn.dataset.id)));
    document.querySelectorAll('.btn-edit-subject').forEach(btn => btn.addEventListener('click', () => this.showEditInputModal('subject', btn.dataset.id)));
    document.querySelectorAll('.btn-edit-faculty').forEach(btn => btn.addEventListener('click', () => this.showEditInputModal('faculty', btn.dataset.id)));
    document.querySelectorAll('.btn-edit-room').forEach(btn => btn.addEventListener('click', () => this.showEditInputModal('room', btn.dataset.id)));

    // Delete Class
    document.querySelectorAll('.btn-del-class').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm(`Delete class ${id}?`)) {
          let classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
          classes = classes.filter(c => c.id !== id);
          AppStore.set(STORAGE_KEYS.CLASSES, classes);
          this.render();
        }
      });
    });

    // Delete Subject
    document.querySelectorAll('.btn-del-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Delete subject?')) {
          let subjects = AppStore.get(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
          subjects = subjects.filter(s => s.id !== id);
          AppStore.set(STORAGE_KEYS.SUBJECTS, subjects);
          this.render();
        }
      });
    });

    // Delete Faculty
    document.querySelectorAll('.btn-del-faculty').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Delete faculty?')) {
          let faculty = AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY);
          faculty = faculty.filter(f => f.id !== id);
          AppStore.set(STORAGE_KEYS.FACULTY, faculty);
          this.render();
        }
      });
    });

    // Delete Room
    document.querySelectorAll('.btn-del-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Delete room?')) {
          let rooms = AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);
          rooms = rooms.filter(r => r.id !== id);
          AppStore.set(STORAGE_KEYS.ROOMS, rooms);
          this.render();
        }
      });
    });

    // Add Subject Modal
    document.getElementById('btn-add-subject')?.addEventListener('click', () => {
      this.showAddSubjectModal();
    });

    // Add Class Modal
    document.getElementById('btn-add-class')?.addEventListener('click', () => {
      this.showAddClassModal();
    });

    // Add Faculty Modal
    document.getElementById('btn-add-faculty')?.addEventListener('click', () => {
      this.showAddFacultyModal();
    });

    // Add Room Modal
    document.getElementById('btn-add-room')?.addEventListener('click', () => {
      this.showAddRoomModal();
    });
  }

  showEditInputModal(type, recordId) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    const keys = { class: STORAGE_KEYS.CLASSES, subject: STORAGE_KEYS.SUBJECTS, faculty: STORAGE_KEYS.FACULTY, room: STORAGE_KEYS.ROOMS };
    const records = AppStore.get(keys[type], []);
    const record = records.find(x => x.id === recordId);
    if (!record) return alert('Record not found. Please refresh and try again.');
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, []);
    const faculty = AppStore.get(STORAGE_KEYS.FACULTY, []);
    const rooms = AppStore.get(STORAGE_KEYS.ROOMS, []);
    const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const input = (id, label, value, type='text', extra='') => `<div class="form-group"><label class="form-label">${label}</label><input class="form-input" id="edit-${id}" type="${type}" value="${esc(value)}" ${extra}></div>`;
    const select = (id, label, items, val, getId, getLabel) => `<div class="form-group"><label class="form-label">${label}</label><select class="form-select" id="edit-${id}">${items.map(x => `<option value="${esc(getId(x))}" ${getId(x)===val?'selected':''}>${esc(getLabel(x))}</option>`).join('')}</select></div>`;
    let fields = '', title = '';
    if (type === 'class') {
      title='Edit Class / Section';
      fields = input('id','Class ID (cannot be changed)',record.id,'text','readonly') + input('name','Class / Section Name',record.name) + input('department','Department',record.department) + input('semester','Semester',record.semester,'number','min="1" max="8" required') + input('section','Section',record.section) + select('room','Default Lecture Hall',rooms,record.defaultRoom,r=>r.id,r=>`${r.name} (${r.type})`);
    } else if (type === 'subject') {
      title='Edit Subject / Course Allocation';
      fields = input('code','Course Code',record.code) + input('short','Short Name',record.shortName) + input('name','Full Subject Name',record.name) + select('class','Class / Section',classes,record.classId,c=>c.id,c=>c.name) + `<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="edit-type"><option ${record.type==='Lecture'?'selected':''}>Lecture</option><option ${record.type==='Lab'?'selected':''}>Lab</option></select></div>` + input('hours','Hours / Week',record.hoursPerWeek,'number','min="1" max="6" required') + input('duration','Lab Block Duration (2 hours)',record.duration || 2,'number','min="2" max="2" required') + select('faculty','Assigned Faculty',faculty,record.facultyId,f=>f.id,f=>`${f.name} [${f.initials}]`) + select('room','Room / Lab',rooms,record.roomId,r=>r.id,r=>`${r.name} (${r.type})`) + input('batch','Assigned Lab Batch (B1, B2, or B3)',record.batch || '','text') + input('lab-group','Synchronized Lab Group ID',record.synchronizedGroupId || record.labGroupId || 'B1-B2-B3','text');
    } else if (type === 'faculty') {
      title='Edit Faculty Member';
      fields = input('id','Faculty ID (cannot be changed)',record.id,'text','readonly') + input('name','Full Name & Title',record.name) + input('initials','Initials',record.initials) + input('designation','Designation',record.designation) + input('department','Department',record.department) + input('daily','Maximum Daily Hours',record.maxDailyHours,'number','min="1" max="6" required') + input('weekly','Maximum Weekly Hours',record.maxWeeklyHours,'number','min="1" max="24" required');
    } else {
      title='Edit Room / Laboratory';
      fields = input('id','Room ID (cannot be changed)',record.id,'text','readonly') + input('name','Room Name',record.name) + `<div class="form-group"><label class="form-label">Room Type</label><select class="form-select" id="edit-type"><option value="Lecture" ${record.type==='Lecture'?'selected':''}>Lecture Hall</option><option value="Lab" ${record.type==='Lab'?'selected':''}>Laboratory</option></select></div>` + input('capacity','Capacity',record.capacity,'number','min="1" required') + input('block','Block / Location',record.block);
    }
    modalRoot.innerHTML = `<div class="modal-overlay"><div class="modal-dialog"><div class="modal-header"><h3 class="modal-title">${title}</h3><button class="modal-close-btn" id="edit-modal-close">&times;</button></div><form id="edit-input-form"><div class="modal-body">${fields}<p class="text-muted" style="font-size:12px">Unique IDs are locked to protect timetable links. Other fields can be edited.</p></div><div class="modal-footer"><button type="button" class="btn btn-secondary" id="edit-modal-cancel">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div></form></div></div>`;
    const close=()=>{modalRoot.innerHTML='';};
    document.getElementById('edit-modal-close').addEventListener('click',close);
    document.getElementById('edit-modal-cancel').addEventListener('click',close);
    document.getElementById('edit-input-form').addEventListener('submit',e=>{
      e.preventDefault();
      const val=id=>document.getElementById(`edit-${id}`).value.trim();
      let updated={...record};
      if(type==='class') updated={...updated,name:val('name'),department:val('department'),semester:Number(val('semester')),section:val('section'),defaultRoom:val('room')};
      if(type==='subject') { const isLab=val('type')==='Lab'; updated={...updated,code:val('code'),shortName:val('short'),name:val('name'),classId:val('class'),type:val('type'),hoursPerWeek:Number(val('hours')),duration:isLab?Number(val('duration')):1,facultyId:val('faculty'),roomId:val('room'),batch:isLab?val('batch'):'',synchronizedGroupId:isLab?val('lab-group'):'',batches:isLab?(val('batch') || record.batches || ''):(record.batches||'')}; }
      if(type==='faculty') updated={...updated,name:val('name'),initials:val('initials').toUpperCase(),designation:val('designation'),department:val('department'),maxDailyHours:Number(val('daily')),maxWeeklyHours:Number(val('weekly'))};
      if(type==='room') updated={...updated,name:val('name'),type:val('type'),capacity:Number(val('capacity')),block:val('block')};
      const index=records.findIndex(x=>x.id===recordId); if(index<0)return;
      records[index]=updated; AppStore.set(keys[type],records); close(); this.render();
    });
  }

  showAddSubjectModal() {
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const faculty = AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY);
    const rooms = AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    if (!classes.length || !faculty.length || !rooms.length) {
      alert('Before adding subjects, please add at least one Class, one Faculty member, and one Room / Lab.');
      return;
    }

    modalRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Add Course / Subject</h3>
            <button class="modal-close-btn" id="sub-modal-close">&times;</button>
          </div>
          <form id="add-sub-form">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Course Code</label>
                  <input type="text" id="sub-code" class="form-input" placeholder="e.g. 21CS55" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Subject Short Name</label>
                  <input type="text" id="sub-short" class="form-input" placeholder="e.g. DAA" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Full Course Title</label>
                <input type="text" id="sub-name" class="form-input" placeholder="e.g. Design & Analysis of Algorithms" required />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Assigned Class / Section</label>
                  <select id="sub-class" class="form-select">
                    ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Type</label>
                  <select id="sub-type" class="form-select">
                    <option value="Lecture">Lecture (Theory)</option>
                    <option value="Lab">Lab (Practical Continuous)</option>
                  </select>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Hours / Week</label>
                  <input type="number" id="sub-hours" class="form-input" min="1" max="6" value="4" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Continuous Block Duration (Labs)</label>
                  <input type="number" id="sub-duration" class="form-input" min="2" max="2" value="2" />
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Assigned Lab Batch (B1, B2, or B3)</label>
                  <input type="text" id="sub-batch" class="form-input" value="B1" placeholder="B1" />
                </div>
                <div class="form-group">
                  <label class="form-label">Synchronized Lab Group ID</label>
                  <input type="text" id="sub-lab-group" class="form-input" value="B1-B2-B3" required />
                </div>
              </div>
              <p class="text-muted" style="font-size:12px;">Add one lab subject for each batch, and use the same group ID for B1, B2, and B3. The solver assigns all three to one shared 2-hour block.</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Assigned Faculty</label>
                  <select id="sub-faculty" class="form-select">
                    ${faculty.map(f => `<option value="${f.id}">${f.name} [${f.initials}]</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Room / Lab Allocated</label>
                  <select id="sub-room" class="form-select">
                    ${rooms.map(r => `<option value="${r.id}">${r.name} (${r.type})</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="sub-modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Course</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalRoot.innerHTML = ''; };
    document.getElementById('sub-modal-close').addEventListener('click', close);
    document.getElementById('sub-modal-cancel').addEventListener('click', close);

    document.getElementById('add-sub-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const subjects = AppStore.get(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
      const isLab = document.getElementById('sub-type').value === 'Lab';

      const newSub = {
        id: 'SUB-' + Date.now(),
        code: document.getElementById('sub-code').value.trim(),
        name: document.getElementById('sub-name').value.trim(),
        shortName: document.getElementById('sub-short').value.trim(),
        classId: document.getElementById('sub-class').value,
        type: document.getElementById('sub-type').value,
        hoursPerWeek: parseInt(document.getElementById('sub-hours').value) || 4,
        duration: isLab ? (parseInt(document.getElementById('sub-duration').value) || 2) : 1,
        facultyId: document.getElementById('sub-faculty').value,
        roomId: document.getElementById('sub-room').value,
        batch: isLab ? document.getElementById('sub-batch').value.trim() : '',
        synchronizedGroupId: isLab ? document.getElementById('sub-lab-group').value.trim() : '',
        batches: isLab ? document.getElementById('sub-batch').value.trim() : ''
      };

      subjects.push(newSub);
      AppStore.set(STORAGE_KEYS.SUBJECTS, subjects);
      close();
      this.render();
    });
  }

  showAddClassModal() {
    const rooms = AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Add Academic Class / Section</h3>
            <button class="modal-close-btn" id="cls-modal-close">&times;</button>
          </div>
          <form id="add-cls-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Class ID (Unique Code)</label>
                <input type="text" id="cls-id" class="form-input" placeholder="e.g. CSE-7A" required />
              </div>
              <div class="form-group">
                <label class="form-label">Display Name</label>
                <input type="text" id="cls-name" class="form-input" placeholder="e.g. 7th Sem - Section A" required />
              </div>
              <div class="form-group">
                <label class="form-label">Department</label>
                <input type="text" id="cls-dept" class="form-input" value="Computer Science & Engineering" required />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Semester</label>
                  <input type="number" id="cls-sem" class="form-input" min="1" max="8" value="7" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Section</label>
                  <input type="text" id="cls-sec" class="form-input" value="A" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Default Lecture Hall</label>
                <select id="cls-room" class="form-select">
                  ${rooms.map(r => `<option value="${r.id}">${r.name} (${r.type})</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="cls-modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Class</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalRoot.innerHTML = ''; };
    document.getElementById('cls-modal-close').addEventListener('click', close);
    document.getElementById('cls-modal-cancel').addEventListener('click', close);

    document.getElementById('add-cls-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
      const newCls = {
        id: document.getElementById('cls-id').value.trim(),
        name: document.getElementById('cls-name').value.trim(),
        department: document.getElementById('cls-dept').value.trim(),
        semester: parseInt(document.getElementById('cls-sem').value),
        section: document.getElementById('cls-sec').value.trim(),
        defaultRoom: document.getElementById('cls-room').value
      };
      classes.push(newCls);
      AppStore.set(STORAGE_KEYS.CLASSES, classes);
      close();
      this.render();
    });
  }

  showAddFacultyModal() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Add Faculty Member</h3>
            <button class="modal-close-btn" id="fac-modal-close">&times;</button>
          </div>
          <form id="add-fac-form">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Faculty ID</label>
                  <input type="text" id="fac-id" class="form-input" placeholder="e.g. FAC-08" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Initials (Official VTU)</label>
                  <input type="text" id="fac-init" class="form-input" placeholder="e.g. MS" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Full Name & Title</label>
                <input type="text" id="fac-name" class="form-input" placeholder="e.g. Dr. Mahesh S" required />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Designation</label>
                  <input type="text" id="fac-desig" class="form-input" value="Assistant Professor" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <input type="text" id="fac-dept" class="form-input" value="CSE" required />
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Max Daily Hours</label>
                  <input type="number" id="fac-daily" class="form-input" min="1" max="6" value="4" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Max Weekly Hours</label>
                  <input type="number" id="fac-weekly" class="form-input" min="5" max="24" value="16" required />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="fac-modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Faculty</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalRoot.innerHTML = ''; };
    document.getElementById('fac-modal-close').addEventListener('click', close);
    document.getElementById('fac-modal-cancel').addEventListener('click', close);

    document.getElementById('add-fac-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const faculty = AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY);
      const newFac = {
        id: document.getElementById('fac-id').value.trim(),
        initials: document.getElementById('fac-init').value.trim().toUpperCase(),
        name: document.getElementById('fac-name').value.trim(),
        designation: document.getElementById('fac-desig').value.trim(),
        department: document.getElementById('fac-dept').value.trim(),
        maxDailyHours: parseInt(document.getElementById('fac-daily').value) || 4,
        maxWeeklyHours: parseInt(document.getElementById('fac-weekly').value) || 16,
        color: '#4338ca'
      };
      faculty.push(newFac);
      AppStore.set(STORAGE_KEYS.FACULTY, faculty);
      close();
      this.render();
    });
  }

  showAddRoomModal() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Add Classroom or Lab</h3>
            <button class="modal-close-btn" id="rm-modal-close">&times;</button>
          </div>
          <form id="add-rm-form">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Room ID</label>
                  <input type="text" id="rm-id" class="form-input" placeholder="e.g. LH-206" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Room Type</label>
                  <select id="rm-type" class="form-select">
                    <option value="Lecture">Lecture Hall</option>
                    <option value="Lab">Laboratory</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Room Name</label>
                <input type="text" id="rm-name" class="form-input" placeholder="e.g. Smart Seminar Room 206" required />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Student Capacity</label>
                  <input type="number" id="rm-cap" class="form-input" value="70" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Block / Location</label>
                  <input type="text" id="rm-block" class="form-input" value="CS Block 2nd Floor" required />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="rm-modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Room</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalRoot.innerHTML = ''; };
    document.getElementById('rm-modal-close').addEventListener('click', close);
    document.getElementById('rm-modal-cancel').addEventListener('click', close);

    document.getElementById('add-rm-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const rooms = AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);
      const newRm = {
        id: document.getElementById('rm-id').value.trim(),
        name: document.getElementById('rm-name').value.trim(),
        type: document.getElementById('rm-type').value,
        capacity: parseInt(document.getElementById('rm-cap').value) || 70,
        block: document.getElementById('rm-block').value.trim()
      };
      rooms.push(newRm);
      AppStore.set(STORAGE_KEYS.ROOMS, rooms);
      close();
      this.render();
    });
  }

  // =========================================================================
  // User-management UI has been removed; this hook remains because the
  // main listener setup calls it for backward compatibility.
  attachUserListeners() {}

  showQuickStudentRegisterModal() {
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay"><div class="modal-dialog" style="max-width:480px;">
        <div class="modal-header"><h3 class="modal-title">🎓 Student Registration</h3><button class="modal-close-btn" id="reg-modal-close">&times;</button></div>
        <form id="student-reg-form"><div class="modal-body">
          <p style="font-size:12px;color:#64748b;margin-bottom:14px;">Create your student account to access your assigned class timetable.</p>
          <div class="form-group"><label class="form-label">Admission Number (USN)</label><input type="text" id="reg-usn" class="form-input" placeholder="e.g. 1AT24AI048" required /></div>
          <div class="form-group"><label class="form-label">Student Full Name</label><input type="text" id="reg-name" class="form-input" placeholder="Enter full name" required /></div>
          <div class="form-group"><label class="form-label">Class & Department</label><select id="reg-class" class="form-select">${classes.map(c => `<option value="${c.id}" ${c.id === 'AIML-3A' ? 'selected' : ''}>${c.name} (${c.department})</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Create Password</label><input type="password" id="reg-pass" class="form-input" minlength="6" placeholder="At least 6 characters" required /></div>
          <div id="student-reg-error" style="color:#e11d48;font-size:12px;"></div>
        </div><div class="modal-footer"><button type="button" class="btn btn-secondary" id="reg-modal-cancel">Cancel</button><button type="submit" class="btn btn-primary">Register & Sign In</button></div></form>
      </div></div>`;

    const close = () => { modalRoot.innerHTML = ''; };
    document.getElementById('reg-modal-close').addEventListener('click', close);
    document.getElementById('reg-modal-cancel').addEventListener('click', close);
    document.getElementById('student-reg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const result = auth.studentRegister({
        username: document.getElementById('reg-usn').value,
        name: document.getElementById('reg-name').value,
        classId: document.getElementById('reg-class').value,
        password: document.getElementById('reg-pass').value
      });
      if (result.success) { close(); this.render(); }
      else document.getElementById('student-reg-error').textContent = result.error;
    });
  }

  showStaffRegisterModal() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    modalRoot.innerHTML = `
      <div class="modal-overlay"><div class="modal-dialog" style="max-width:480px;">
        <div class="modal-header"><h3 class="modal-title">👨‍🏫 Faculty / Staff Registration</h3><button class="modal-close-btn" id="staff-reg-close">&times;</button></div>
        <form id="staff-reg-form"><div class="modal-body">
          <p style="font-size:12px;color:#64748b;margin-bottom:14px;">Create your faculty account and start using the timetable planner immediately.</p>
          <div class="form-group"><label class="form-label">Staff ID</label><input type="text" id="staff-reg-id" class="form-input" placeholder="e.g. ATRIA_FAC_104" required /></div>
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="staff-reg-name" class="form-input" placeholder="Enter full name" required /></div>
          <div class="form-group"><label class="form-label">Department</label><input type="text" id="staff-reg-dept" class="form-input" placeholder="Enter department" required /></div>
          <div class="form-group"><label class="form-label">Create Password</label><input type="password" id="staff-reg-pass" class="form-input" minlength="6" placeholder="At least 6 characters" required /></div>
          <div id="staff-reg-error" style="color:#e11d48;font-size:12px;"></div>
        </div><div class="modal-footer"><button type="button" class="btn btn-secondary" id="staff-reg-cancel">Cancel</button><button type="submit" class="btn btn-primary">Register & Sign In</button></div></form>
      </div></div>`;
    const close = () => { modalRoot.innerHTML = ''; };
    document.getElementById('staff-reg-close').addEventListener('click', close);
    document.getElementById('staff-reg-cancel').addEventListener('click', close);
    document.getElementById('staff-reg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const result = auth.staffRegister({
        username: document.getElementById('staff-reg-id').value,
        name: document.getElementById('staff-reg-name').value,
        department: document.getElementById('staff-reg-dept').value,
        password: document.getElementById('staff-reg-pass').value
      });
      if (result.success) {
        close();
        this.render();
      } else document.getElementById('staff-reg-error').textContent = result.error;
    });
  }

  // =========================================================================
  // PRINT & HIGH-DPI SINGLE-PAGE PDF ROUTINES
  // =========================================================================

  /**
   * Triggers single-page print dialog strictly formatted for 1 A4 Landscape page
   */
  triggerSinglePagePrint(classId) {
    const printContainer = document.getElementById('print-container');
    if (!printContainer) return;

    printContainer.innerHTML = timetableRenderer.renderClassSheet(classId, this.timetableData, true);
    
    // Trigger high-DPI native print dialog
    window.print();
  }

  /**
   * Batch print all classes into a single PDF document with page breaks
   */
  triggerBatchExport() {
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const printContainer = document.getElementById('print-container');
    if (!printContainer) return;

    let html = '';
    classes.forEach(c => {
      html += `<div class="sheet-outer-card">${timetableRenderer.renderClassSheet(c.id, this.timetableData, true)}</div>`;
    });

    printContainer.innerHTML = html;
    window.print();
  }
}

// Global App Instance
const app = new AppController();

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
