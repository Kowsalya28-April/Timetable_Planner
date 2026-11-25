const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { performance } = require('perf_hooks');

const storage = {
  atria_classes: JSON.stringify([{ id: 'SAVED-CLASS' }]),
  atria_subjects: JSON.stringify([{ id: 'SAVED-SUBJECT' }])
};

global.localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: key => { delete storage[key]; }
};
global.performance = performance;
global.window = { addEventListener: () => {}, print: () => {} };
global.document = {
  getElementById: () => ({ innerHTML: '', value: '', style: {}, addEventListener: () => {} }),
  querySelectorAll: () => []
};

for (const file of ['js/logoData.js', 'js/data.js', 'js/cspSolver.js', 'js/timetableRenderer.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}

assert.deepStrictEqual(JSON.parse(storage.atria_classes), [{ id: 'SAVED-CLASS' }], 'AppStore.init must preserve saved class inputs');
assert.deepStrictEqual(JSON.parse(storage.atria_subjects), [{ id: 'SAVED-SUBJECT' }], 'AppStore.init must preserve saved subject inputs');
assert.strictEqual(DEFAULT_SETTINGS.periodTimes[0].start, '08:30');
assert.strictEqual(DEFAULT_SETTINGS.periodTimes[6].end, '16:30');
assert.deepStrictEqual(DEFAULT_SETTINGS.breaks.map(item => [item.start, item.end]), [
  ['10:30', '10:45'],
  ['12:45', '13:30']
]);

function fixture(options = {}) {
  const classes = [{
    id: 'SECTION-A',
    name: 'Section A',
    department: 'CSE',
    semester: 5,
    section: 'A',
    defaultRoom: 'ROOM-LECTURE'
  }];
  const faculty = [
    { id: 'FAC-B1', name: 'Faculty B1', initials: 'F1', maxDailyHours: 6, maxWeeklyHours: 18 },
    { id: 'FAC-B2', name: 'Faculty B2', initials: 'F2', maxDailyHours: 6, maxWeeklyHours: 18 },
    { id: 'FAC-B3', name: 'Faculty B3', initials: 'F3', maxDailyHours: 6, maxWeeklyHours: 18 },
    { id: 'FAC-LEC', name: 'Faculty Lecture', initials: 'FL', maxDailyHours: 6, maxWeeklyHours: 18 }
  ];
  const rooms = [
    { id: 'LAB-B1', name: 'Lab B1', type: 'Lab', capacity: 30 },
    { id: 'LAB-B2', name: 'Lab B2', type: 'Lab', capacity: 30 },
    { id: 'LAB-B3', name: 'Lab B3', type: 'Lab', capacity: 30 },
    { id: 'ROOM-LECTURE', name: 'Lecture Room', type: 'Lecture', capacity: 90 }
  ];
  if (options.sharedFaculty) faculty[1].id = faculty[0].id;
  if (options.sharedRoom) rooms[1].id = rooms[0].id;

  const subjects = [
    { id: 'SUB-AGL', code: 'AGL-CODE', name: 'AGL Lab', classId: 'SECTION-A', type: 'Lab', hoursPerWeek: 2, duration: 2, facultyId: 'FAC-B1', roomId: 'LAB-B1', batch: 'B1', synchronizedGroupId: 'ROTATION-A' },
    { id: 'SUB-CN', code: 'CN-CODE', name: 'CN Lab', classId: 'SECTION-A', type: 'Lab', hoursPerWeek: 2, duration: 2, facultyId: options.sharedFaculty ? 'FAC-B1' : 'FAC-B2', roomId: options.sharedRoom ? 'LAB-B1' : 'LAB-B2', batch: 'B2', synchronizedGroupId: 'ROTATION-A' },
    { id: 'SUB-AI', code: 'AI-CODE', name: 'AI Lab', classId: 'SECTION-A', type: 'Lab', hoursPerWeek: 2, duration: 2, facultyId: 'FAC-B3', roomId: 'LAB-B3', batch: 'B3', synchronizedGroupId: 'ROTATION-A' }
  ];
  if (options.includeLecture) {
    subjects.push({
      id: 'SUB-LEC', code: 'LECT-CODE', name: 'Lecture Subject', classId: 'SECTION-A',
      type: 'Lecture', hoursPerWeek: 2, facultyId: 'FAC-LEC', roomId: 'ROOM-LECTURE'
    });
  }
  if (options.missingBatch) subjects.pop();
  return { classes, faculty, rooms, subjects, settings: DEFAULT_SETTINGS, constraints: DEFAULT_CONSTRAINTS };
}

function findStarts(result, subjectId) {
  const schedule = result.classTimetables['SECTION-A'].schedule;
  const starts = [];
  schedule.forEach((day, dayIndex) => day.forEach((cell, period) => {
    const entries = Array.isArray(cell) ? cell : (cell ? [cell] : []);
    for (const entry of entries) {
      if (entry.subjectId === subjectId && entry.isSpanStart) starts.push({ day: dayIndex, period, entry });
    }
  }));
  return starts;
}

const complete = fixture({ includeLecture: true });
const firstResult = new CSPSolver(complete).solve();
assert.strictEqual(firstResult.success, true, firstResult.conflicts.join('\n'));

const structuralSolver = new CSPSolver(fixture());
const groupVariables = structuralSolver.buildVariables().filter(variable => variable.synchronized);
assert.strictEqual(groupVariables.length, 1, 'A synchronized lab group must be one atomic CSP variable');
assert.deepStrictEqual(groupVariables[0].allocations.map(allocation => allocation.batch), ['B1', 'B2', 'B3']);
assert(structuralSolver.generateInitialDomain(groupVariables[0]).every(slot =>
  Number.isInteger(slot.day) && Number.isInteger(slot.period)
), 'The group receives one shared day/period domain, not separate per-batch domains');

const batchStarts = ['SUB-AGL', 'SUB-CN', 'SUB-AI'].map(id => findStarts(firstResult, id)[0]);
assert(batchStarts.every(Boolean), 'All three batch labs must be scheduled');
assert(batchStarts.every(start => start.day === batchStarts[0].day && start.period === batchStarts[0].period),
  'B1, B2, and B3 lab allocations must have the exact same start time');
assert(batchStarts.every(start => start.entry.duration === 2), 'Every lab must be one continuous 2-hour block');

const validLabWindows = new Set(['08:30-10:30', '10:45-12:45', '13:30-15:30', '14:30-16:30']);
for (const start of batchStarts) {
  const end = DEFAULT_SETTINGS.periodTimes[start.period].end;
  const key = `${DEFAULT_SETTINGS.periodTimes[start.period - 1].start}-${end}`;
  assert(validLabWindows.has(key), `Lab must occupy an allowed two-hour window, received ${key}`);
}

for (const subject of complete.subjects) {
  const scheduledHours = findStarts(firstResult, subject.id).reduce((sum, item) => sum + item.entry.duration, 0);
  assert.strictEqual(scheduledHours, subject.hoursPerWeek, `${subject.code} weekly hours must be fulfilled`);
}

const lecture = complete.subjects.find(subject => subject.id === 'SUB-LEC');
const labSlots = new Set(batchStarts.map(item => `${item.day}:${item.period}`));
for (const start of findStarts(firstResult, lecture.id)) {
  for (const labStart of batchStarts) {
    assert(start.day !== labStart.day || start.period >= labStart.period + 2 || start.period + 1 < labStart.period,
      'A section lecture must not overlap a batch lab');
  }
}

assert.strictEqual(firstResult.facultyWorkload['FAC-B1'].totalHours, 2, 'Faculty workload must count lab hours');
assert.strictEqual(firstResult.roomTimetables['LAB-B1'].schedule[batchStarts[0].day][batchStarts[0].period].subjectId, 'SUB-AGL');

AppStore.set(STORAGE_KEYS.CLASSES, complete.classes);
AppStore.set(STORAGE_KEYS.FACULTY, complete.faculty);
AppStore.set(STORAGE_KEYS.ROOMS, complete.rooms);
const rendered = timetableRenderer.renderClassSheet('SECTION-A', firstResult);
for (const code of ['AGL-CODE', 'CN-CODE', 'AI-CODE', '(B1)', '(B2)', '(B3)']) {
  assert(rendered.includes(code), `Class timetable renderer must display ${code}`);
}

const sharedFacultyResult = new CSPSolver(fixture({ sharedFaculty: true })).solve();
assert.strictEqual(sharedFacultyResult.success, false, 'A faculty member cannot teach two batches simultaneously');
assert(sharedFacultyResult.conflicts.some(message => message.includes('faculty')), 'Faculty conflict must be reported');
assert(sharedFacultyResult.conflicts.some(message => /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{2}:\d{2}-\d{2}:\d{2}/.test(message)),
  'Faculty conflict must include the affected day and exact time');

const sharedRoomResult = new CSPSolver(fixture({ sharedRoom: true })).solve();
assert.strictEqual(sharedRoomResult.success, false, 'A laboratory cannot host two batch labs simultaneously');
assert(sharedRoomResult.conflicts.some(message => message.includes('room/lab')), 'Room conflict must be reported');
assert(sharedRoomResult.conflicts.some(message => /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{2}:\d{2}-\d{2}:\d{2}/.test(message)),
  'Room conflict must include the affected day and exact time');

const missingBatchResult = new CSPSolver(fixture({ missingBatch: true })).solve();
assert.strictEqual(missingBatchResult.success, false, 'A synchronized group missing one of B1/B2/B3 must be rejected');
assert(missingBatchResult.conflicts.some(message => message.includes('missing: B3')), 'Missing synchronized batch must be identified');

const weeklyLimit = fixture();
weeklyLimit.faculty[0].maxWeeklyHours = 1;
const weeklyLimitResult = new CSPSolver(weeklyLimit).solve();
assert.strictEqual(weeklyLimitResult.success, false, 'Faculty weekly workload limits must be enforced');
assert(weeklyLimitResult.conflicts.some(message => message.includes('weekly limit')), 'Weekly workload failure must be explained');

const labWindows = new Set();
for (let run = 0; run < 8; run++) {
  const result = new CSPSolver(fixture()).solve();
  assert.strictEqual(result.success, true, result.conflicts.join('\n'));
  const starts = ['SUB-AGL', 'SUB-CN', 'SUB-AI'].map(id => findStarts(result, id)[0]);
  assert(starts.every(item => item.day === starts[0].day && item.period === starts[0].period),
    'Repeated generations must preserve synchronization');
  labWindows.add(`${starts[0].day}:${starts[0].period}`);
}
assert(labWindows.size > 1, 'Repeated generations must distribute labs across days and time windows');

console.log('Timetable solver tests passed: synchronized labs, faculty/room conflicts, incomplete groups, breaks, weekly hours, rendering, workload, lectures, and generation distribution.');
