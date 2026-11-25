/**
 * ATRIA INSTITUTE OF TECHNOLOGY - Timetable Planner
 * Official Timetable Renderer, Print & Single-Page PDF Engine
 */

class TimetableRenderer {
  constructor() {
    this.logoBase64 = AppStore.get(STORAGE_KEYS.CUSTOM_LOGO, typeof ATRIA_LOGO_BASE64 !== 'undefined' ? ATRIA_LOGO_BASE64 : '');
  }

  getLogo() {
    return AppStore.get(STORAGE_KEYS.CUSTOM_LOGO, typeof ATRIA_LOGO_BASE64 !== 'undefined' ? ATRIA_LOGO_BASE64 : 'public/assets/atria_logo.jpg');
  }

  /**
   * Render Official Atria Single-Page Timetable HTML
   * @param {string} classId
   * @param {object} timetableData
   * @param {boolean} isPrintWrapper
   */
  renderClassSheet(classId, timetableData, isPrintWrapper = false) {
    const metadata = AppStore.get(STORAGE_KEYS.METADATA, DEFAULT_METADATA);
    const settings = AppStore.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const classes = AppStore.get(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
    const facultyList = AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY);
    const roomsList = AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);

    const classInfo = classes.find(c => c.id === classId) || {
      id: classId,
      name: classId,
      department: metadata.department,
      semester: 5,
      section: "A",
      defaultRoom: "LH-204"
    };

    const classTables = timetableData ? (timetableData.classTimetables || timetableData.timetable) : null;
    const classSchedule = classTables && classTables[classId]
      ? classTables[classId].schedule
      : null;

    const legendItems = classTables && classTables[classId]
      ? classTables[classId].legend
      : [];

    const logoSrc = this.getLogo();
    const semSuffix = classInfo.semester === 1 ? 'st' : (classInfo.semester === 2 ? 'nd' : (classInfo.semester === 3 ? 'rd' : 'th'));
    const workingDays = settings.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const periodTimes = settings.periodTimes || [];
    const breaks = settings.breaks || [];

    // Build Time Slot Header columns
    // We will build columns: Day | P1 | P2 | [TEA BREAK] | P3 | P4 | [LUNCH BREAK] | P5 | P6 | P7
    let headerPeriodsHtml = `<th class="day-col-header">DAY / TIME</th>`;
    
    periodTimes.forEach(pt => {
      headerPeriodsHtml += `
        <th class="period-col-header">
          <div class="period-num">PERIOD ${pt.period}</div>
          <div class="period-time">${pt.start} - ${pt.end}</div>
        </th>
      `;

      // Check if break occurs after this period
      const breakItem = breaks.find(b => b.afterPeriod === pt.period);
      if (breakItem) {
        headerPeriodsHtml += `
          <th class="break-col-header">
            <div class="break-title">${breakItem.name}</div>
            <div class="break-time">${breakItem.start} - ${breakItem.end}</div>
          </th>
        `;
      }
    });

    // Build Table Body Rows
    let tableBodyHtml = '';
    workingDays.forEach((dayName, dayIdx) => {
      let rowHtml = `<tr class="timetable-row"><td class="day-cell-name"><strong>${dayName.toUpperCase()}</strong></td>`;

      let skipPeriods = 0;
      periodTimes.forEach(pt => {
        if (skipPeriods > 0) {
          skipPeriods--;
          return;
        }

        const p = pt.period;
        const cellData = classSchedule ? classSchedule[dayIdx][p] : null;

        if (cellData) {
          const cellEntries = Array.isArray(cellData) ? cellData : [cellData];
          const primaryEntry = cellEntries[0];
          if (primaryEntry.duration > 1 && primaryEntry.isSpanStart) {
            // Lab multi-period span (usually 2 periods)
            // Notice: check if it spans across break; solver guarantees it does not
            const colSpan = primaryEntry.duration;
            skipPeriods = primaryEntry.duration - 1;
            const labAllocations = cellEntries.filter(entry => entry.isSpanStart);

            rowHtml += `
              <td colspan="${colSpan}" class="slot-cell lab-slot">
                ${labAllocations.map(entry => {
                  const fac = facultyList.find(f => f.id === entry.facultyId);
                  const facInitials = entry.facultyInitials || (fac ? fac.initials : '');
                  const batch = entry.batch || entry.batches;
                  const batchesText = batch ? `<span class="lab-batch">(${batch})</span>` : '';
                  return `
                    <div class="slot-content">
                      <div class="slot-code">${entry.subjectCode} <span class="badge-lab">LAB</span></div>
                      <div class="slot-title">${entry.subjectName} ${batchesText}</div>
                      <div class="slot-meta">
                        <span class="slot-faculty">Faculty: <strong>[${facInitials}]</strong> ${entry.facultyName}</span>
                        <span class="slot-room">Lab: <strong>${entry.roomName || entry.roomId}</strong></span>
                      </div>
                    </div>
                  `;
                }).join('<hr class="sync-lab-divider" />')}
              </td>
            `;
          } else if (!primaryEntry.isSpanStart && primaryEntry.duration > 1) {
            // Handled by colSpan above
          } else {
            // Standard single-period lecture
            rowHtml += `
              <td class="slot-cell lecture-slot">
                ${cellEntries.map(entry => {
                  const fac = facultyList.find(f => f.id === entry.facultyId);
                  const facInitials = entry.facultyInitials || (fac ? fac.initials : '');
                  return `
                    <div class="slot-content">
                      <div class="slot-code">${entry.subjectCode}</div>
                      <div class="slot-title">${entry.shortName || entry.subjectName} ${entry.batch ? `<span class="lab-batch">(${entry.batch})</span>` : ''}</div>
                      <div class="slot-meta">
                        <span class="slot-faculty">[${facInitials}]</span>
                        <span class="slot-room">${entry.roomName || classInfo.defaultRoom}</span>
                      </div>
                    </div>
                  `;
                }).join('<hr class="sync-lab-divider" />')}
              </td>
            `;
          }
        } else {
          rowHtml += `<td class="slot-cell empty-slot"><span class="empty-dash">-</span></td>`;
        }

        // Insert break column for this row
        const breakItem = breaks.find(b => b.afterPeriod === pt.period);
        if (breakItem) {
          if (dayIdx === 0) {
            // Spans all rows in the day
            rowHtml += `
              <td rowspan="${workingDays.length}" class="break-vertical-cell ${breakItem.id}-cell">
                <div class="break-vertical-text">
                  <span class="break-name">${breakItem.name}</span>
                  <span class="break-duration">(${breakItem.duration})</span>
                </div>
              </td>
            `;
          }
        }
      });

      rowHtml += `</tr>`;
      tableBodyHtml += rowHtml;
    });

    // Build Legend Table Rows (Compact VTU standard format)
    let legendRowsHtml = '';
    if (legendItems && legendItems.length > 0) {
      legendItems.forEach(item => {
        legendRowsHtml += `
          <tr>
            <td class="text-center">${item.slNo}</td>
            <td class="font-bold">${item.code}</td>
            <td>${item.name}${item.batches && item.batches !== "-" ? ` (${item.batches})` : ""}</td>
            <td>${item.facultyName}</td>
            <td class="text-center font-bold">[${item.facultyInitials}]</td>
            <td class="text-center">${item.hoursPerWeek} hrs</td>
            <td>${item.roomName}</td>
          </tr>
        `;
      });
    } else {
      legendRowsHtml = `<tr><td colspan="7" class="text-center text-muted">No subjects registered for this class.</td></tr>`;
    }

    // Outer sheet container - STRICT SINGLE PAGE A4 LANDSCAPE FORMAT
    return `
      <div class="atria-timetable-sheet ${isPrintWrapper ? 'print-mode-sheet' : ''}" id="timetable-sheet-${classId}">
        
        <!-- HEADER BLOCK -->
        <header class="atria-sheet-header">
          <div class="header-logo-container">
            <img src="${logoSrc}" alt="Atria Institute of Technology Logo" class="atria-header-logo" onerror="this.src='public/assets/atria_logo.jpg'" />
          </div>
          <div class="header-text-container">
            <h1 class="institute-name">${metadata.instituteName}</h1>
            <p class="institute-affiliation">${metadata.instituteAffiliation}</p>
            <p class="institute-address">${metadata.instituteAddress}</p>
            <h2 class="department-title">${classInfo.department || metadata.department}</h2>
          </div>
        </header>

        <!-- METADATA INFORMATION BAR -->
        <div class="timetable-meta-grid">
          <div class="meta-item">
            <span class="meta-label">Academic Year:</span>
            <span class="meta-value">${metadata.academicYear} (${metadata.semesterType})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Semester & Section:</span>
            <span class="meta-value"><strong>${classInfo.semester}th Sem - Section ${classInfo.section}</strong></span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Class Room No:</span>
            <span class="meta-value"><strong>${classInfo.defaultRoom}</strong></span>
          </div>
          <div class="meta-item">
            <span class="meta-label">W.E.F (Effective Date):</span>
            <span class="meta-value">${metadata.wefDate}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Revision:</span>
            <span class="meta-value">${metadata.revision}</span>
          </div>
        </div>

        <!-- MAIN TIMETABLE GRID -->
        <div class="table-responsive-container">
          <table class="official-timetable-grid">
            <thead>
              <tr>${headerPeriodsHtml}</tr>
            </thead>
            <tbody>
              ${tableBodyHtml}
            </tbody>
          </table>
        </div>

        <!-- SUBJECT & FACULTY LEGEND (COMPACT VTU/ATRIA TABLE) -->
        <div class="legend-section">
          <div class="legend-header-title">COURSE ALLOCATION & FACULTY DETAILS</div>
          <table class="official-legend-grid">
            <thead>
              <tr>
                <th style="width: 40px;">Sl. No</th>
                <th style="width: 90px;">Course Code</th>
                <th>Course Title</th>
                <th>Faculty In-Charge</th>
                <th style="width: 70px;">Initials</th>
                <th style="width: 80px;">Hrs / Week</th>
                <th style="width: 130px;">Room / Lab Allocated</th>
              </tr>
            </thead>
            <tbody>
              ${legendRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- FOOTER SIGNATURES BLOCK -->
        <footer class="atria-sheet-footer" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px;align-items:end;">
          <div class="signature-block" style="text-align:center;">
            <div class="sign-line"></div>
            <div class="sign-role">Timetable Coordinator</div>
          </div>
          <div class="signature-block" style="text-align:center;">
            <div class="sign-line"></div>
            <div class="sign-role">Head of Department (HOD)</div>
          </div>
          <div class="signature-block" style="text-align:center;">
            <div class="sign-line"></div>
            <div class="sign-role">Dean Academic</div>
          </div>
          <div class="signature-block" style="text-align:center;">
            <div class="sign-line"></div>
            <div class="sign-role">Principal</div>
          </div>
        </footer>

      </div>
    `;
  }

  /**
   * Render Room Allocation Grid
   */
  renderRoomAllocationView(timetableData) {
    const rooms = AppStore.get(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);
    const settings = AppStore.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const periodTimes = settings.periodTimes || [];
    const workingDays = settings.workingDays || [];

    if (!timetableData || !timetableData.roomTimetables) {
      return `<div class="empty-state-card"><p>No timetable generated yet. Click "Generate Timetable" to populate room allocations.</p></div>`;
    }

    let html = `
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Campus Classrooms & Lab Allocation Grid</h3>
            <p class="card-subtitle">Real-time room occupancy matrix confirming zero room overlap.</p>
          </div>
        </div>
        <div class="room-tables-container">
    `;

    rooms.forEach(room => {
      const roomSchedule = timetableData.roomTimetables[room.id] ? timetableData.roomTimetables[room.id].schedule : null;

      let roomTableHtml = `
        <div class="room-block-card">
          <div class="room-block-header">
            <h4>${room.name} (${room.id})</h4>
            <span class="room-tag ${room.type === 'Lab' ? 'tag-lab' : 'tag-lec'}">${room.type} (Cap: ${room.capacity})</span>
            <span class="room-location text-muted">${room.block}</span>
          </div>
          <table class="matrix-grid-table">
            <thead>
              <tr>
                <th>Day</th>
                ${periodTimes.map(pt => `<th>P${pt.period}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
      `;

      workingDays.forEach((dayName, dayIdx) => {
        roomTableHtml += `<tr><td><strong>${dayName.substring(0, 3).toUpperCase()}</strong></td>`;
        periodTimes.forEach(pt => {
          const entry = roomSchedule ? roomSchedule[dayIdx][pt.period] : null;
          if (entry) {
            roomTableHtml += `
              <td class="room-busy-cell" title="${entry.subjectCode} - ${entry.className} (${entry.facultyInitials})">
                <span class="room-sub">${entry.shortName || entry.subjectCode}</span>
                <span class="room-cls">${entry.className.split(' - ')[0]}</span>
              </td>
            `;
          } else {
            roomTableHtml += `<td class="room-free-cell">-</td>`;
          }
        });
        roomTableHtml += `</tr>`;
      });

      roomTableHtml += `
            </tbody>
          </table>
        </div>
      `;

      html += roomTableHtml;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render Faculty Workload Summary
   */
  renderFacultyWorkloadView(timetableData) {
    const facultyList = AppStore.get(STORAGE_KEYS.FACULTY, DEFAULT_FACULTY);
    const settings = AppStore.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const workingDays = settings.workingDays || [];

    if (!timetableData || !timetableData.facultyWorkload) {
      return `<div class="empty-state-card"><p>No timetable generated yet. Click "Generate Timetable" to view faculty workloads.</p></div>`;
    }

    let rowsHtml = '';
    facultyList.forEach(fac => {
      const workload = timetableData.facultyWorkload[fac.id] || {
        totalHours: 0,
        subjects: [],
        classes: [],
        dailyHours: Array(workingDays.length).fill(0)
      };

      const maxWeekly = fac.maxWeeklyHours || 18;
      const pct = Math.min(100, Math.round((workload.totalHours / maxWeekly) * 100));
      const badgeClass = pct > 90 ? 'badge-danger' : (pct >= 60 ? 'badge-success' : 'badge-warning');

      rowsHtml += `
        <tr>
          <td>
            <strong>${fac.name}</strong>
            <div class="text-muted text-xs">${fac.designation} (${fac.department})</div>
          </td>
          <td class="text-center font-bold">[${fac.initials}]</td>
          <td>${workload.subjects.join(', ') || '-'}</td>
          <td>${workload.classes.join(', ') || '-'}</td>
          <td class="text-center">${fac.maxDailyHours || 4} hrs</td>
          <td class="text-center font-bold">${workload.totalHours} / ${maxWeekly} hrs</td>
          <td>
            <div class="progress-bar-container">
              <div class="progress-fill ${badgeClass}" style="width: ${pct}%;"></div>
            </div>
            <span class="text-xs text-muted">${pct}% Load</span>
          </td>
        </tr>
      `;
    });

    return `
      <div class="section-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Faculty Workload & Teaching Hours Summary</h3>
            <p class="card-subtitle">Detailed breakdown of weekly hours, subject distribution, and workload saturation.</p>
          </div>
        </div>
        <div class="table-responsive-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Initials</th>
                <th>Subjects Handled</th>
                <th>Classes Assigned</th>
                <th>Max Daily</th>
                <th>Total Weekly Hours</th>
                <th>Workload Utilization</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

// Global Renderer Instance
const timetableRenderer = new TimetableRenderer();
