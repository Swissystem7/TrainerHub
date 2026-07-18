function parseRequest(rawText) {
  const text = rawText || '';
  const lower = text.toLowerCase();

  const muscleKeywords = {
    'חזה': 'chest',
    'גב': 'back',
    'רגליים': 'legs',
    'כתפיים': 'shoulders',
    'ידיים': 'arms',
    'בטן': 'abs',
    'פלג גוף עליון': 'upper_body',
    'פלג גוף תחתון': 'lower_body',
    'כל הגוף': 'full_body',
    'שרירי בטן': 'abs',
    'שרירי חזה': 'chest',
    'שרירי גב': 'back',
    'שרירי רגליים': 'legs',
    'שרירי כתפיים': 'shoulders',
    'שרירי ידיים': 'arms'
  };

  const goalKeywords = {
    'כוח': 'strength',
    'מסה': 'hypertrophy',
    'היפרטרופיה': 'hypertrophy',
    'סיבולת': 'endurance',
    'חיטוב': 'hypertrophy',
    'עלייה במסה': 'hypertrophy',
    'עלייה בכוח': 'strength'
  };

  const levelKeywords = {
    'מתחיל': 'beginner',
    'בינוני': 'intermediate',
    'מתקדם': 'advanced',
    'מקצוען': 'advanced'
  };

  const ageKeywords = {
    'ילד': 'child',
    'נער': 'teen',
    'מבוגר': 'adult',
    'קשיש': 'senior',
    'זקן': 'senior'
  };

  const equipmentKeywords = {
    'משקולות': 'dumbbells',
    'מוט': 'barbell',
    'מכונות': 'machines',
    'גומיות': 'bands',
    'משקל גוף': 'bodyweight',
    'קטלבל': 'kettlebell',
    'ספסל': 'bench',
    'מתח': 'pull_up_bar',
    'מקבילים': 'parallel_bars'
  };

  const muscleGroups = [];
  for (const [hebrew, english] of Object.entries(muscleKeywords)) {
    if (lower.includes(hebrew)) {
      muscleGroups.push(english);
    }
  }

  let goal = 'strength';
  for (const [hebrew, english] of Object.entries(goalKeywords)) {
    if (lower.includes(hebrew)) {
      goal = english;
      break;
    }
  }

  let level = 'beginner';
  for (const [hebrew, english] of Object.entries(levelKeywords)) {
    if (lower.includes(hebrew)) {
      level = english;
      break;
    }
  }

  let ageGroup = 'adult';
  for (const [hebrew, english] of Object.entries(ageKeywords)) {
    if (lower.includes(hebrew)) {
      ageGroup = english;
      break;
    }
  }

  const durationMatch = lower.match(/\d+/);
  let duration = 4;
  if (durationMatch) {
    const parsed = parseInt(durationMatch[0], 10);
    if (parsed >= 1 && parsed <= 52) {
      duration = parsed;
    }
  }

  const equipment = [];
  for (const [hebrew, english] of Object.entries(equipmentKeywords)) {
    if (lower.includes(hebrew)) {
      equipment.push(english);
    }
  }

  if (muscleGroups.length === 0) {
    muscleGroups.push('full_body');
  }

  return {
    muscleGroups,
    goal,
    level,
    ageGroup,
    duration,
    equipment
  };
}

module.exports = { parseRequest };