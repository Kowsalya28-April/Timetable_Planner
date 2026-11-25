/**
 * ATRIA INSTITUTE OF TECHNOLOGY
 * Constraint Satisfaction Problem (CSP) timetable solver.
 */
class CSPSolver {
  constructor(config = {}) {
    this.classes = config.classes || [];
    this.subjects = config.subjects || [];
    this.faculty = config.faculty || [];
    this.rooms = config.rooms || [];
    this.settings = config.settings || {};
    this.constraints = config.constraints || {};
    this.workingDays = this.settings.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    this.periodTimes = this.settings.periodTimes || [];
    this.periodsPerDay = this.periodTimes.length || this.settings.periodsPerDay || 7;
    this.breaks = this.settings.breaks || [];
    this.breakAfterPeriods = new Set(this.breaks.map(item => Number(item.afterPeriod)));
    this.requiredBatches = this.settings.synchronizedBatches || ["B1", "B2", "B3"];
    this.conflicts = [];
    this.conflictSet = new Set();
    this.stats = {
      variablesCount: 0,
      assignmentsTried: 0,
      backtracksCount: 0,
      startTime: 0,
      endTime: 0,
      elapsedMs: 0,
      success: false
    };
  }

  solve() {
    this.stats.startTime = performance.now();
    this.stats.assignmentsTried = 0;
    this.stats.backtracksCount = 0;
    this.conflicts = [];
    this.conflictSet = new Set();
    this.generationNumber = CSPSolver.generationCounter++;

    const variables = this.buildVariables();
    this.stats.variablesCount = variables.length;
    if (this.conflicts.length) return this.failure("Invalid timetable inputs.");
    this.currentVariables = new Map(variables.map(variable => [variable.id, variable]));

    const feasibility = this.checkBasicFeasibility(variables);
    if (!feasibility.possible) return this.failure(feasibility.reason);

    const domains = new Map();
    for (const variable of variables) {
      const domain = this.generateInitialDomain(variable);
      if (!domain.length) {
        this.addConflict(`${this.variableLabel(variable)} has no valid day/time slot.`);
        return this.failure(`No valid slots are available for ${this.variableLabel(variable)}.`);
      }
      domains.set(variable.id, domain);
    }

    const assignment = new Map();
    const success = this.backtrack(assignment, variables, domains, 25000);
    if (!success) {
      if (!this.conflicts.length) {
        this.addConflict("Search space exhausted before all subjects could be scheduled.");
      }
      return this.failure("Unable to find a timetable that satisfies all hard constraints.");
    }

    const validation = this.validateSchedule(assignment, variables);
    if (validation.length) {
      validation.forEach(message => this.addConflict(message));
      return this.failure("The generated timetable failed post-schedule validation.");
    }

    const formatted = this.formatTimetable(assignment, variables);
    this.finishStats(true);
    return {
      success: true,
      timetable: formatted.classTimetables,
      classTimetables: formatted.classTimetables,
      facultyTimetables: formatted.facultyTimetables,
      roomTimetables: formatted.roomTimetables,
      facultyWorkload: formatted.facultyWorkload,
      stats: this.stats,
      conflicts: []
    };
  }

  failure(error) {
    this.finishStats(false);
    return { success: false, error, conflicts: this.conflicts, stats: this.stats };
  }

  finishStats(success) {
    this.stats.endTime = performance.now();
    this.stats.elapsedMs = Math.round(this.stats.endTime - this.stats.startTime);
    this.stats.success = success;
  }

  addConflict(message) {
    if (!this.conflictSet.has(message) && this.conflicts.length < 20) {
      this.conflictSet.add(message);
      this.conflicts.push(message);
    }
  }

  buildVariables() {
    const regular = [];
    const synchronized = new Map();

    for (const subject of this.subjects) {
      const cls = this.classes.find(item => item.id === subject.classId);
      const faculty = this.faculty.find(item => item.id === subject.facultyId);
      const roomId = subject.roomId || (cls && cls.defaultRoom);
      const room = this.rooms.find(item => item.id === roomId);
      const isLab = subject.type === "Lab";
      const duration = isLab ? Number(subject.duration || 2) : 1;
      const hours = Number(subject.hoursPerWeek);

      if (!cls) {
        this.addConflict(`Subject ${subject.code || subject.name || subject.id} refers to missing class ${subject.classId || "(unassigned)"}.`);
        continue;
      }
      if (!faculty) {
        this.addConflict(`Subject ${subject.code || subject.name} (${cls.name}) has no valid assigned faculty.`);
        continue;
      }
      if (!room) {
        this.addConflict(`Subject ${subject.code || subject.name} (${cls.name}) has no valid assigned room/laboratory.`);
        continue;
      }
      if (!Number.isInteger(hours) || hours < 1) {
        this.addConflict(`Subject ${subject.code || subject.name} (${cls.name}) must have a positive whole-number weekly hour allocation.`);
        continue;
      }
      if (isLab && (duration !== 2 || hours % duration !== 0)) {
        this.addConflict(`Lab ${subject.code || subject.name} (${cls.name}) must use 2-hour blocks and its weekly hours must be divisible by 2.`);
        continue;
      }
      if (isLab && room.type && room.type !== "Lab") {
        this.addConflict(`Lab ${subject.code || subject.name} (${cls.name}) is assigned to non-laboratory room ${room.name || room.id}.`);
        continue;
      }
      if (!isLab && room.type && room.type === "Lab") {
        this.addConflict(`Lecture ${subject.code || subject.name} (${cls.name}) is assigned to laboratory ${room.name || room.id}.`);
        continue;
      }

      const explicitBatch = String(subject.batch || "").trim();
      const legacyBatches = String(subject.batches || "").split(",").map(value => value.trim()).filter(Boolean);
      if (isLab && !explicitBatch && legacyBatches.length > 1) {
        this.addConflict(`Lab ${subject.code || subject.name} (${cls.name}) lists multiple legacy batches (${legacyBatches.join(", ")}) without individual batch allocations. Assign separate B1, B2, and B3 lab subjects in one synchronized group.`);
        continue;
      }
      const batch = explicitBatch || (legacyBatches.length === 1 ? legacyBatches[0] : "");
      const groupId = isLab
        ? String(subject.synchronizedGroupId || subject.labGroupId || (batch ? "B1-B2-B3" : "")).trim()
        : "";
      const eventCount = isLab ? hours / duration : hours;

      for (let eventIndex = 1; eventIndex <= eventCount; eventIndex++) {
        const allocation = {
          classId: cls.id,
          className: cls.name,
          subjectId: subject.id,
          subjectCode: subject.code || subject.id,
          subjectName: subject.name || subject.code || subject.id,
          shortName: subject.shortName || subject.code || subject.name,
          type: subject.type || "Lecture",
          duration,
          eventIndex,
          totalEvents: eventCount,
          facultyId: faculty.id,
          facultyName: faculty.name,
          facultyInitials: faculty.initials || "",
          roomId: room.id,
          roomName: room.name || room.id,
          batch,
          legacyBatches: subject.batches || "",
          synchronizedGroupId: groupId
        };

        if (isLab && groupId && batch) {
          const key = `${groupId}::${eventIndex}`;
          if (!synchronized.has(key)) synchronized.set(key, { groupId, eventIndex, allocations: [] });
          synchronized.get(key).allocations.push(allocation);
        } else {
          regular.push({
            id: `${cls.id}_${subject.id}_ev${eventIndex}`,
            duration,
            type: allocation.type,
            subjectId: subject.id,
            subjectCode: allocation.subjectCode,
            subjectName: allocation.subjectName,
            classId: cls.id,
            facultyId: faculty.id,
            roomId: room.id,
            allocations: [allocation],
            synchronized: false
          });
        }
      }
    }

    const variables = regular.slice();
    for (const [key, group] of synchronized.entries()) {
      const byBatch = new Map();
      for (const allocation of group.allocations) {
        if (byBatch.has(allocation.batch)) {
          this.addConflict(`Synchronized lab group ${group.groupId}, session ${group.eventIndex} has multiple lab subjects assigned to batch ${allocation.batch}.`);
        }
        byBatch.set(allocation.batch, allocation);
      }
      const missing = this.requiredBatches.filter(batch => !byBatch.has(batch));
      const unexpected = Array.from(byBatch.keys()).filter(batch => !this.requiredBatches.includes(batch));
      if (missing.length || unexpected.length || byBatch.size !== this.requiredBatches.length) {
        this.addConflict(`Synchronized lab group ${group.groupId}, session ${group.eventIndex} must contain exactly ${this.requiredBatches.join(", ")}; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}.`);
        continue;
      }
      const allocations = this.requiredBatches.map(batch => byBatch.get(batch));
      variables.push({
        id: `SYNC_${key}`,
        duration: allocations[0].duration,
        type: "Lab",
        subjectId: allocations.map(item => item.subjectId).join("|"),
        subjectCode: allocations.map(item => item.subjectCode).join(" / "),
        subjectName: "Synchronized laboratory session",
        classId: null,
        facultyId: null,
        roomId: null,
        allocations,
        synchronized: true,
        synchronizedGroupId: group.groupId
      });
    }
    return variables;
  }

  checkBasicFeasibility(variables) {
    const weeklyLoad = new Map();
    for (const variable of variables) {
      for (const allocation of variable.allocations) {
        weeklyLoad.set(allocation.facultyId, (weeklyLoad.get(allocation.facultyId) || 0) + allocation.duration);
      }
    }
    for (const faculty of this.faculty) {
      const required = weeklyLoad.get(faculty.id) || 0;
      const maximum = Number(faculty.maxWeeklyHours || 18);
      if (required > maximum) {
        const message = `Faculty ${faculty.name} is assigned ${required} hours/week, exceeding the ${maximum}-hour weekly limit.`;
        this.addConflict(message);
        return { possible: false, reason: message };
      }
    }
    return { possible: true };
  }

  generateInitialDomain(variable) {
    const domain = [];
    for (let day = 0; day < this.workingDays.length; day++) {
      for (let period = 1; period <= this.periodsPerDay - variable.duration + 1; period++) {
        if (!this.isContinuousSlot(period, variable.duration)) continue;
        const slot = { day, period, dayName: this.workingDays[day] };
        if (this.slotAllowed(variable, slot)) domain.push(slot);
      }
    }
    return domain;
  }

  isContinuousSlot(period, duration) {
    for (let offset = 0; offset < duration - 1; offset++) {
      const currentPeriod = period + offset;
      if (this.breakAfterPeriods.has(currentPeriod)) return false;
      const current = this.periodTimes[currentPeriod - 1];
      const next = this.periodTimes[currentPeriod];
      if (current && next && current.end !== next.start) return false;
    }
    return true;
  }

  slotAllowed(variable, slot) {
    for (const allocation of variable.allocations) {
      for (const condition of this.constraints.customConditions || []) {
        if (!condition.active || condition.day !== slot.dayName) continue;
        if (condition.type === "no_labs_after" && variable.type === "Lab" &&
            slot.period > condition.period) return false;
        const blocked = (condition.periods || []).some(period =>
          period >= slot.period && period < slot.period + variable.duration
        );
        if (!blocked) continue;
        if (condition.type === "block_faculty" && condition.facultyId === allocation.facultyId) return false;
        if (condition.type === "block_class" && condition.classId === allocation.classId) return false;
        if (condition.type === "block_room" && condition.roomId === allocation.roomId) return false;
      }
    }
    return true;
  }

  selectUnassignedVariable(unassigned, assignment, domains) {
    let best = null;
    let bestDomain = null;
    let bestDegree = -1;
    for (const variable of unassigned) {
      const legal = domains.get(variable.id).filter(slot => this.isConsistent(variable, slot, assignment));
      if (!legal.length) return { variable, legal };
      const degree = unassigned.reduce((count, other) =>
        count + (other !== variable && this.shareConstraint(variable, other) ? 1 : 0), 0);
      if (!best || legal.length < bestDomain.length ||
          (legal.length === bestDomain.length && degree > bestDegree)) {
        best = variable;
        bestDomain = legal;
        bestDegree = degree;
      }
    }
    return best ? { variable: best, legal: bestDomain } : null;
  }

  shareConstraint(first, second) {
    return first.allocations.some(a => second.allocations.some(b =>
      a.classId === b.classId || a.facultyId === b.facultyId || a.roomId === b.roomId ||
      (a.batch && b.batch && a.batch === b.batch && a.synchronizedGroupId === b.synchronizedGroupId)
    ));
  }

  orderDomainValues(variable, values, assignment) {
    const valuesWithScores = values.map(slot => {
      let score = 0;
      if (variable.type === "Lab") {
        let dayLoad = 0;
        let sameStart = 0;
        for (const [otherId, otherSlot] of assignment.entries()) {
          const other = this.currentVariables.get(otherId);
          if (!other || other.type !== "Lab") continue;
          if (otherSlot.day === slot.day) dayLoad++;
          if (otherSlot.day === slot.day && otherSlot.period === slot.period) sameStart++;
        }
        score += dayLoad * 10 + sameStart * 100;
      } else {
        const sameClassPeriods = [];
        for (const [otherId, otherSlot] of assignment.entries()) {
          const other = this.currentVariables.get(otherId);
          if (!other || otherSlot.day !== slot.day) continue;
          for (const a of variable.allocations) {
            if (other.allocations.some(b => b.classId === a.classId)) {
              for (let offset = 0; offset < other.duration; offset++) sameClassPeriods.push(otherSlot.period + offset);
            }
          }
        }
        const start = slot.period;
        const end = start + variable.duration - 1;
        const hasBefore = sameClassPeriods.includes(start - 1) && !this.breakAfterPeriods.has(start - 1);
        const hasAfter = sameClassPeriods.includes(end + 1) && !this.breakAfterPeriods.has(end);
        score += hasBefore || hasAfter ? -5 : 0;
      }
      const windowCount = Math.max(1, this.periodsPerDay - variable.duration + 1);
      const dayIndex = slot.day;
      const phase = (dayIndex * windowCount + slot.period - 1 + this.generationNumber * 5) %
        (this.workingDays.length * windowCount);
      return { slot, score, phase };
    });
    return valuesWithScores.sort((a, b) => a.score - b.score || a.phase - b.phase).map(item => item.slot);
  }

  isConsistent(variable, slot, assignment) {
    const candidate = this.expandAllocations(variable, slot);
    const prior = [];
    for (const [id, assignedSlot] of assignment.entries()) {
      prior.push(...this.expandAllocations(this.currentVariables.get(id), assignedSlot));
    }

    for (let i = 0; i < candidate.length; i++) {
      const current = candidate[i];
      const detail = this.allocationLabel(current);
      const time = this.slotLabel(slot.day, slot.period, variable.duration);
      const dailyHours = prior
        .filter(item => item.facultyId === current.facultyId && item.day === slot.day)
        .reduce((sum, item) => sum + item.duration, 0);
      const dailyMaximum = Number(this.faculty.find(item => item.id === current.facultyId)?.maxDailyHours ||
        this.constraints.maxDailyFacultyHours || 4);
      if (dailyHours + current.duration > dailyMaximum) {
        this.addConflict(`${slot.dayName} ${time}: ${current.facultyName} exceeds the daily teaching limit while assigned ${current.subjectCode} to ${current.batch || current.className} in ${current.roomName}.`);
        return false;
      }

      for (let j = 0; j < prior.length + i; j++) {
        const other = j < prior.length ? prior[j] : candidate[j - prior.length];
        if (!this.overlaps(current, other, slot.day)) continue;
        const otherLabel = this.allocationLabel(other);
        if (current.facultyId === other.facultyId) {
          this.addConflict(`${slot.dayName} ${time}: faculty ${current.facultyName} is assigned ${current.subjectCode} (${current.batch || current.className}, ${current.roomName}) and ${other.subjectCode} (${other.batch || other.className}, ${other.roomName}) simultaneously.`);
          return false;
        }
        if (current.roomId === other.roomId) {
          this.addConflict(`${slot.dayName} ${time}: room/lab ${current.roomName} is assigned to ${current.subjectCode} (${current.className}, ${current.batch || "whole section"}) and ${other.subjectCode} (${other.className}, ${other.batch || "whole section"}) simultaneously.`);
          return false;
        }
        if (this.sectionConflict(current, other)) {
          this.addConflict(`${slot.dayName} ${time}: section/batch overlap between ${current.subjectCode} (${current.batch || current.className}) and ${other.subjectCode} (${other.batch || other.className}).`);
          return false;
        }
        if (current.batch && other.batch && current.batch === other.batch &&
            current.synchronizedGroupId && current.synchronizedGroupId === other.synchronizedGroupId) {
          this.addConflict(`${slot.dayName} ${time}: batch ${current.batch} is assigned overlapping labs ${current.subjectCode} and ${other.subjectCode}.`);
          return false;
        }
      }

      if (this.constraints.maxConsecutiveClasses && !this.withinConsecutiveLimit(current, slot, prior)) {
        this.addConflict(`${slot.dayName} ${time}: ${current.facultyName} exceeds the consecutive teaching limit during ${current.subjectCode}.`);
        return false;
      }

      if (this.constraints.spreadLectures && current.type === "Lecture") {
        const sameDayCount = prior.filter(item =>
          item.classId === current.classId && item.subjectId === current.subjectId &&
          item.day === slot.day && item.type === "Lecture"
        ).length;
        const subject = this.subjects.find(item => item.id === current.subjectId);
        if (sameDayCount && subject && Number(subject.hoursPerWeek) <= this.workingDays.length) return false;
      }
    }
    return true;
  }

  overlaps(first, second, day) {
    return first.day === day && second.day === day &&
      first.period < second.period + second.duration &&
      second.period < first.period + first.duration;
  }

  sectionConflict(first, second) {
    if (first.classId !== second.classId) return false;
    return !first.batch || !second.batch || first.batch === second.batch;
  }

  withinConsecutiveLimit(candidate, slot, existing) {
    const maximum = Number(this.constraints.maxConsecutiveClasses);
    const periods = new Set();
    for (const item of existing) {
      if (item.facultyId !== candidate.facultyId || item.day !== slot.day) continue;
      for (let offset = 0; offset < item.duration; offset++) periods.add(item.period + offset);
    }
    for (let offset = 0; offset < candidate.duration; offset++) periods.add(slot.period + offset);
    const sorted = Array.from(periods).sort((a, b) => a - b);
    let run = 0;
    let previous = null;
    for (const period of sorted) {
      if (previous !== null && (period !== previous + 1 || this.breakAfterPeriods.has(previous))) run = 0;
      run++;
      if (run > maximum) return false;
      previous = period;
    }
    return true;
  }

  expandAllocations(variable, slot) {
    if (!variable) return [];
    return variable.allocations.map(allocation => ({
      ...allocation,
      day: slot.day,
      period: slot.period,
      duration: variable.duration
    }));
  }

  forwardCheck(unassigned, assignment, domains) {
    for (const variable of unassigned) {
      if (!domains.get(variable.id).some(slot => this.isConsistent(variable, slot, assignment))) return false;
    }
    return true;
  }

  backtrack(assignment, variables, domains, maxBacktracks) {
    if (assignment.size === variables.length) return true;
    if (this.stats.backtracksCount >= maxBacktracks) return false;

    const unassigned = variables.filter(variable => !assignment.has(variable.id));
    const selected = this.selectUnassignedVariable(unassigned, assignment, domains);
    if (!selected || !selected.legal.length) return false;
    const variable = selected.variable;
    const ordered = this.orderDomainValues(variable, selected.legal, assignment);

    for (const slot of ordered) {
      this.stats.assignmentsTried++;
      if (!this.isConsistent(variable, slot, assignment)) continue;
      assignment.set(variable.id, slot);
      const remaining = unassigned.filter(item => item.id !== variable.id);
      if (this.forwardCheck(remaining, assignment, domains) &&
          this.backtrack(assignment, variables, domains, maxBacktracks)) return true;
      assignment.delete(variable.id);
      this.stats.backtracksCount++;
    }
    return false;
  }

  validateSchedule(assignment, variables) {
    const errors = [];
    const allocations = [];
    const actualHours = new Map();
    const facultyHours = new Map();
    const facultyDailyHours = new Map();
    for (const variable of variables) {
      const slot = assignment.get(variable.id);
      for (const allocation of this.expandAllocations(variable, slot)) {
        allocations.push(allocation);
        actualHours.set(allocation.subjectId, (actualHours.get(allocation.subjectId) || 0) + allocation.duration);
        facultyHours.set(allocation.facultyId, (facultyHours.get(allocation.facultyId) || 0) + allocation.duration);
        const key = `${allocation.facultyId}::${allocation.day}`;
        facultyDailyHours.set(key, (facultyDailyHours.get(key) || 0) + allocation.duration);
        if (!this.isContinuousSlot(allocation.period, allocation.duration)) {
          errors.push(`${this.workingDays[allocation.day]} ${this.slotLabel(allocation.day, allocation.period, allocation.duration)}: lab ${allocation.subjectCode} crosses a break or is not continuous.`);
        }
      }
      if (variable.synchronized) {
        const starts = allocations.slice(-variable.allocations.length)
          .map(item => `${item.day}:${item.period}:${item.duration}`);
        if (new Set(starts).size !== 1) errors.push(`Synchronized group ${variable.synchronizedGroupId} does not share one day and time.`);
        const batches = allocations.slice(-variable.allocations.length).map(item => item.batch);
        if (this.requiredBatches.some(batch => !batches.includes(batch))) {
          errors.push(`Synchronized group ${variable.synchronizedGroupId} is missing one or more required batches.`);
        }
      }
    }

    const resourceSlots = new Map();
    const classSlots = new Map();
    const batchSlots = new Map();
    for (const item of allocations) {
      const endPeriod = item.period + item.duration;
      const location = `${this.workingDays[item.day]} ${this.slotLabel(item.day, item.period, item.duration)}`;
      for (let period = item.period; period < endPeriod; period++) {
        for (const [type, id] of [["faculty", item.facultyId], ["room", item.roomId]]) {
          const key = `${type}:${id}:${item.day}:${period}`;
          const previous = resourceSlots.get(key);
          if (previous) {
            errors.push(`${location}: ${type} conflict for ${type === "faculty" ? item.facultyName : item.roomName}; ${previous.subjectCode} and ${item.subjectCode} overlap (${item.className}, ${item.batch || "whole section"}).`);
          } else {
            resourceSlots.set(key, item);
          }
        }
        const classKey = `class:${item.classId}:${item.day}:${period}`;
        const entries = classSlots.get(classKey) || [];
        for (const previousEntry of entries) {
          if (this.sectionConflict(item, previousEntry)) {
            errors.push(`${location}: section/batch conflict between ${previousEntry.subjectCode} and ${item.subjectCode} in ${item.className}.`);
          }
        }
        entries.push(item);
        classSlots.set(classKey, entries);
        if (item.batch && item.synchronizedGroupId) {
          const batchKey = `batch:${item.synchronizedGroupId}:${item.batch}:${item.day}:${period}`;
          const previousBatchEntry = batchSlots.get(batchKey);
          if (previousBatchEntry && previousBatchEntry.subjectId !== item.subjectId) {
            errors.push(`${location}: batch ${item.batch} is assigned overlapping labs ${previousBatchEntry.subjectCode} and ${item.subjectCode}.`);
          } else {
            batchSlots.set(batchKey, item);
          }
        }
      }
    }

    for (const subject of this.subjects) {
      const expected = Number(subject.hoursPerWeek) || 0;
      const actual = actualHours.get(subject.id) || 0;
      if (expected !== actual) {
        errors.push(`Subject ${subject.code || subject.name} (${subject.classId}) has ${actual} scheduled hours/week; ${expected} are required.`);
      }
    }
    for (const member of this.faculty) {
      const weekly = facultyHours.get(member.id) || 0;
      const maxWeekly = Number(member.maxWeeklyHours || 18);
      if (weekly > maxWeekly) errors.push(`Faculty ${member.name} has ${weekly} scheduled hours/week; maximum is ${maxWeekly}.`);
      for (let day = 0; day < this.workingDays.length; day++) {
        const daily = facultyDailyHours.get(`${member.id}::${day}`) || 0;
        const maxDaily = Number(member.maxDailyHours || this.constraints.maxDailyFacultyHours || 4);
        if (daily > maxDaily) errors.push(`${this.workingDays[day]}: faculty ${member.name} has ${daily} hours; maximum daily workload is ${maxDaily}.`);
      }
    }
    return Array.from(new Set(errors));
  }

  slotLabel(day, period, duration) {
    const start = this.periodTimes[period - 1];
    const end = this.periodTimes[period + duration - 2];
    if (start && end) return `${start.start}-${end.end}`;
    return `period ${period}${duration > 1 ? `-${period + duration - 1}` : ""}`;
  }

  variableLabel(variable) {
    return variable.allocations.map(item =>
      `${item.subjectCode} (${item.className}${item.batch ? `, ${item.batch}` : ""})`
    ).join(" / ");
  }

  allocationLabel(allocation) {
    return `${allocation.subjectCode} (${allocation.className}${allocation.batch ? `, ${allocation.batch}` : ""}; ${allocation.facultyName}; ${allocation.roomName})`;
  }

  formatTimetable(assignment, variables) {
    const classTimetables = {};
    const facultyTimetables = {};
    const roomTimetables = {};
    const facultyWorkload = {};

    for (const cls of this.classes) {
      classTimetables[cls.id] = {
        classInfo: cls,
        schedule: Array.from({ length: this.workingDays.length }, () => Array(this.periodsPerDay + 1).fill(null)),
        legend: []
      };
    }
    for (const member of this.faculty) {
      facultyTimetables[member.id] = {
        facultyInfo: member,
        schedule: Array.from({ length: this.workingDays.length }, () => Array(this.periodsPerDay + 1).fill(null))
      };
      facultyWorkload[member.id] = {
        facultyInfo: member,
        totalHours: 0,
        subjects: new Set(),
        classes: new Set(),
        dailyHours: Array(this.workingDays.length).fill(0)
      };
    }
    for (const room of this.rooms) {
      roomTimetables[room.id] = {
        roomInfo: room,
        schedule: Array.from({ length: this.workingDays.length }, () => Array(this.periodsPerDay + 1).fill(null))
      };
    }

    for (const variable of variables) {
      const slot = assignment.get(variable.id);
      for (const allocation of variable.allocations) {
        for (let offset = 0; offset < variable.duration; offset++) {
          const period = slot.period + offset;
          const entry = {
            variableId: variable.id,
            classId: allocation.classId,
            className: allocation.className,
            subjectId: allocation.subjectId,
            subjectCode: allocation.subjectCode,
            subjectName: allocation.subjectName,
            shortName: allocation.shortName,
            type: allocation.type,
            duration: variable.duration,
            isSpanStart: offset === 0,
            spanOffset: offset,
            facultyId: allocation.facultyId,
            facultyName: allocation.facultyName,
            facultyInitials: allocation.facultyInitials,
            roomId: allocation.roomId,
            roomName: allocation.roomName,
            batch: allocation.batch,
            batches: allocation.batch || allocation.legacyBatches,
            synchronizedGroupId: allocation.synchronizedGroupId
          };
          const table = classTimetables[allocation.classId].schedule;
          const current = table[slot.day][period];
          if (!current) table[slot.day][period] = entry;
          else if (Array.isArray(current)) current.push(entry);
          else table[slot.day][period] = [current, entry];
          if (facultyTimetables[allocation.facultyId]) {
            facultyTimetables[allocation.facultyId].schedule[slot.day][period] = entry;
          }
          if (roomTimetables[allocation.roomId]) {
            roomTimetables[allocation.roomId].schedule[slot.day][period] = entry;
          }
        }
        const workload = facultyWorkload[allocation.facultyId];
        if (workload) {
          workload.totalHours += variable.duration;
          workload.subjects.add(allocation.subjectCode);
          workload.classes.add(allocation.classId);
          workload.dailyHours[slot.day] += variable.duration;
        }
      }
    }

    for (const cls of this.classes) {
      const classSubjects = this.subjects.filter(subject => subject.classId === cls.id);
      classTimetables[cls.id].legend = classSubjects.map((subject, index) => {
        const member = this.faculty.find(item => item.id === subject.facultyId);
        const room = this.rooms.find(item => item.id === subject.roomId);
        return {
          slNo: index + 1,
          code: subject.code,
          name: subject.name,
          shortName: subject.shortName || subject.code,
          type: subject.type,
          hoursPerWeek: subject.hoursPerWeek,
          facultyName: member ? member.name : "Unassigned",
          facultyInitials: member ? member.initials : "NA",
          roomName: room ? room.name : (subject.roomId || cls.defaultRoom),
          batches: subject.batch || subject.batches || "-"
        };
      });
    }
    for (const workload of Object.values(facultyWorkload)) {
      workload.subjects = Array.from(workload.subjects);
      workload.classes = Array.from(workload.classes);
    }
    return { classTimetables, facultyTimetables, roomTimetables, facultyWorkload };
  }
}

CSPSolver.generationCounter = 0;
