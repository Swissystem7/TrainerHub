((root) => {
  const DAY_NAMES_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

  function createMobilitySession(dayIndex) {
    const dayName = DAY_NAMES_HE[dayIndex] || `יום ${dayIndex + 1}`;
    return {
      id: `mobility-shift-${dayIndex}`,
      dayIndex: dayIndex,
      dayName: dayName,
      day_he: dayName,
      day: dayName,
      title: 'תחזוקת מוביליטי קצרה (10 דקות)',
      name: 'תחזוקת מוביליטי קצרה (10 דקות)',
      type: 'mobility',
      isMobility: true,
      isRest: false,
      isBusy: true,
      isShift: true,
      durationMinutes: 10,
      duration_minutes: 10,
      focus: 'mobility',
      focus_he: 'תחזוקת מוביליטי קצרה (10 דקות)',
      description: 'תחזוקת מוביליטי קצרה (10 דקות) בימי העומס לשחרור מפרקים והתאוששות',
      notes: 'תחזוקת מוביליטי קצרה (10 דקות) בימי העומס לשחרור מפרקים והתאוששות',
      exercises: [
        { name: 'תנועתיות מפרקים דינמית', duration_seconds: 180, reps: '3 דק׳' },
        { name: 'חתול-כלב ופתיחת בית חזה', duration_seconds: 180, reps: '3 דק׳' },
        { name: 'מתיחות אגן וכופפי ירך', duration_seconds: 240, reps: '4 דק׳' }
      ]
    };
  }

  function createRestDay(dayIndex) {
    const dayName = DAY_NAMES_HE[dayIndex] || `יום ${dayIndex + 1}`;
    return {
      id: `rest-${dayIndex}`,
      dayIndex: dayIndex,
      dayName: dayName,
      day_he: dayName,
      day: dayName,
      title: 'מנוחה והתאוששות',
      name: 'מנוחה והתאוששות',
      type: 'rest',
      isRest: true,
      isMobility: false,
      durationMinutes: 0,
      duration_minutes: 0,
      description: 'יום מנוחה והתאוששות מלאה'
    };
  }

  function isRestSlot(slot) {
    if (slot === null || slot === undefined) return true;
    if (typeof slot === 'string') {
      const s = slot.trim().toLowerCase();
      if (!s || s.includes('מנוחה') || s.includes('חופש') || s.includes('התאוששות') || s.includes('rest')) {
        return true;
      }
      return false;
    }
    if (typeof slot === 'object') {
      if (slot.isRest === true || slot.rest === true) return true;
      if (slot.workout === null || slot.workout === false) return true;
      if (slot.type === 'rest') return true;
    }
    return false;
  }

  function isMobilitySlot(slot) {
    if (!slot) return false;
    if (typeof slot === 'string') {
      return slot.includes('מוביליטי') || slot.includes('תחזוקה');
    }
    if (typeof slot === 'object') {
      return slot.isMobility === true || slot.type === 'mobility';
    }
    return false;
  }

  function isHeavyWorkout(slot) {
    if (isRestSlot(slot) || isMobilitySlot(slot)) return false;
    if (typeof slot === 'object' && slot !== null) {
      if (slot.isHeavy !== undefined) {
        return Boolean(slot.isHeavy);
      }
      if (slot.workout !== undefined) {
        return isHeavyWorkout(slot.workout);
      }
    }
    return true;
  }

  function normalizeWorkoutSlot(slot, dayIndex) {
    if (typeof slot === 'object' && slot !== null) {
      return {
        ...slot,
        dayIndex: dayIndex,
        dayName: DAY_NAMES_HE[dayIndex] || `יום ${dayIndex + 1}`,
        day_he: DAY_NAMES_HE[dayIndex] || `יום ${dayIndex + 1}`,
        day: slot.day || DAY_NAMES_HE[dayIndex] || dayIndex + 1,
        isHeavy: slot.isHeavy !== undefined ? slot.isHeavy : true,
        isRest: false,
        isMobility: false
      };
    }
    return {
      dayIndex: dayIndex,
      dayName: DAY_NAMES_HE[dayIndex] || `יום ${dayIndex + 1}`,
      day_he: DAY_NAMES_HE[dayIndex] || `יום ${dayIndex + 1}`,
      day: DAY_NAMES_HE[dayIndex] || dayIndex + 1,
      title: String(slot),
      name: String(slot),
      isHeavy: true,
      isRest: false,
      isMobility: false
    };
  }

  function moveWorkoutToDay(slot, newDayIndex, originalDayIndex) {
    const normalized = normalizeWorkoutSlot(slot, newDayIndex);
    normalized.movedFromDay = originalDayIndex;
    normalized.isRescheduled = true;
    return normalized;
  }

  /**
   * Adapts a weekly training schedule around shift work and high-load days.
   * Displaces heavy workouts from busy days to available free days,
   * and schedules a 10-minute short mobility session on busy days.
   *
   * @param {Array|Object} weeklySchedule - Weekly schedule array (or schedule object)
   * @param {Array<number>} busyDaysIndices - Indices of busy/shift days (0 = Sunday ... 6 = Saturday)
   * @returns {Array|Object} Adapted schedule with preserved total workouts when possible
   */
  function adaptWeekForShifts(weeklySchedule, busyDaysIndices) {
    if (weeklySchedule == null) {
      return [];
    }

    let scheduleArray;
    let isObjectInput = false;
    if (Array.isArray(weeklySchedule)) {
      scheduleArray = weeklySchedule;
    } else if (typeof weeklySchedule === 'object') {
      isObjectInput = true;
      if (Array.isArray(weeklySchedule.days)) {
        scheduleArray = weeklySchedule.days;
      } else if (Array.isArray(weeklySchedule.dailyWorkouts)) {
        scheduleArray = weeklySchedule.dailyWorkouts;
      } else if (Array.isArray(weeklySchedule.sessions)) {
        scheduleArray = weeklySchedule.sessions;
      } else {
        return [];
      }
    } else {
      return [];
    }

    if (scheduleArray.length === 0) {
      return [];
    }

    const totalDays = Math.max(scheduleArray.length, 7);

    const validBusyIndices = Array.isArray(busyDaysIndices)
      ? busyDaysIndices.filter((idx) => {
          return typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 && idx < totalDays;
        })
      : [];
    const busySet = new Set(validBusyIndices);

    const slots = new Array(totalDays);
    for (let i = 0; i < totalDays; i++) {
      slots[i] = i < scheduleArray.length ? scheduleArray[i] : null;
    }

    const displacedWorkouts = [];
    const adapted = new Array(totalDays);

    // First pass: identify heavy workouts on busy days and place mobility on busy days
    for (let i = 0; i < totalDays; i++) {
      const slot = slots[i];
      const isBusy = busySet.has(i);

      if (isBusy) {
        if (isHeavyWorkout(slot)) {
          displacedWorkouts.push({ originalDay: i, workout: slot });
        }
        adapted[i] = createMobilitySession(i);
      } else {
        if (isHeavyWorkout(slot)) {
          adapted[i] = normalizeWorkoutSlot(slot, i);
        } else {
          adapted[i] = null;
        }
      }
    }

    // Second pass: place displaced heavy workouts into available free days
    for (let d = 0; d < displacedWorkouts.length; d++) {
      const item = displacedWorkouts[d];
      let placedDay = -1;

      for (let j = 0; j < totalDays; j++) {
        if (!busySet.has(j) && adapted[j] === null) {
          placedDay = j;
          break;
        }
      }

      if (placedDay !== -1) {
        adapted[placedDay] = moveWorkoutToDay(item.workout, placedDay, item.originalDay);
      }
    }

    // Third pass: fill remaining empty slots with rest days
    for (let i = 0; i < totalDays; i++) {
      if (adapted[i] === null) {
        const originalSlot = slots[i];
        if (originalSlot && typeof originalSlot === 'object' && originalSlot.isRest) {
          adapted[i] = {
            ...originalSlot,
            dayIndex: i,
            dayName: DAY_NAMES_HE[i] || `יום ${i + 1}`,
            day_he: DAY_NAMES_HE[i] || `יום ${i + 1}`,
            day: DAY_NAMES_HE[i] || i + 1
          };
        } else {
          adapted[i] = createRestDay(i);
        }
      }
    }

    if (isObjectInput) {
      return {
        ...weeklySchedule,
        days: adapted,
        dailyWorkouts: adapted,
        isShiftAdapted: true
      };
    }

    return adapted;
  }

  const api = {
    DAY_NAMES_HE,
    createMobilitySession,
    createRestDay,
    isHeavyWorkout,
    adaptWeekForShifts
  };

  if (root) {
    root.THShiftAdapter = api;
    if (root.TH && typeof root.TH === 'object') {
      root.TH.shiftAdapter = api;
      root.TH.adaptWeekForShifts = adaptWeekForShifts;
    }
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    module.exports.adaptWeekForShifts = adaptWeekForShifts;
    module.exports.createMobilitySession = createMobilitySession;
    module.exports.createRestDay = createRestDay;
    module.exports.isHeavyWorkout = isHeavyWorkout;
    module.exports.DAY_NAMES_HE = DAY_NAMES_HE;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
