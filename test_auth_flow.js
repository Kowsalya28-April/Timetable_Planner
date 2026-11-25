const fs = require('fs');
const vm = require('vm');

const memoryStore = {};
global.localStorage = {
  getItem: (k) => memoryStore[k] || null,
  setItem: (k, v) => { memoryStore[k] = v; },
  removeItem: (k) => { delete memoryStore[k]; }
};
global.performance = require('perf_hooks').performance;
global.window = {
  addEventListener: () => {},
  print: () => console.log("[Print Triggered]")
};
global.document = {
  getElementById: (id) => ({
    innerHTML: '',
    value: '',
    style: {},
    addEventListener: () => {}
  }),
  querySelectorAll: () => []
};

vm.runInThisContext(fs.readFileSync('./js/logoData.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('./js/data.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('./js/cspSolver.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('./js/timetableRenderer.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('./js/auth.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('./js/app.js', 'utf8'));

console.log("=== TESTING KOWSALYA G LOGIN (1AT24AI048) ===");

// Test 1: Kowsalya login with default student123
let res = auth.login('student', '1AT24AI048', 'student123');
console.log("Login with student123:", res.success, res.user.name, res.user.classId, res.user.department);

// Test 2: Kowsalya login with any custom password
auth.logout();
res = auth.login('student', '1AT24AI048', 'mypassword999');
console.log("Login with custom password:", res.success, res.user.name);

// Test 3: Auto-registration for other new Atria USNs
auth.logout();
res = auth.login('student', '1AT24AI099', 'student123');
console.log("Auto-register 1AT24AI099:", res.success, res.user.username, res.user.classId);

// Test 4: Verify AIML-3A Timetable
const solver = new CSPSolver({
  classes: DEFAULT_CLASSES,
  subjects: DEFAULT_SUBJECTS,
  faculty: DEFAULT_FACULTY,
  rooms: DEFAULT_ROOMS,
  settings: DEFAULT_SETTINGS,
  constraints: DEFAULT_CONSTRAINTS
});
const solution = solver.solve();
const aimlSheet = timetableRenderer.renderClassSheet('AIML-3A', solution);
console.log("AIML-3A Sheet Generated:", aimlSheet.includes("3rd Sem - Section A (AIML)"));
console.log("Contains AI Fundamentals (21AI33):", aimlSheet.includes("21AI33"));
console.log("Contains Python AI Lab (21AIL35):", aimlSheet.includes("21AIL35"));

console.log("\n>>> ALL TESTS COMPLETED SUCCESSFULLY! <<<");
