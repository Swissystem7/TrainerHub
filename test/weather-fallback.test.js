const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { adaptWorkoutForWeather } = require('../js/weather-fallback.js');
const { NetanyaOpeningWorkouts, adaptNetanyaWorkout } = require('../frontend/netanya-opening.js');

test('מצב רגיל ללא שינוי: normal condition leaves workout structure and exercises unchanged', () => {
  const baseWorkout = {
    title: 'אימון כושר בסיסי',
    duration_minutes: 45,
    phases: [
      {
        name: 'Main',
        exercises: [
          { name: 'סקוואט', duration_seconds: 300, sets: 3, reps: '10' },
          { name: 'שכיבות סמיכה', duration_seconds: 300, sets: 3, reps: '12' }
        ]
      }
    ]
  };

  const adapted = adaptWorkoutForWeather(baseWorkout, 'normal');
  assert.ok(adapted, 'adapted workout should not be null');
  assert.equal(adapted.title, baseWorkout.title);
  assert.equal(adapted.phases.length, 1);
  assert.equal(adapted.phases[0].exercises.length, 2);
  assert.equal(adapted.phases[0].exercises[0].name, 'סקוואט');
  assert.equal(adapted.phases[0].exercises[0].duration_seconds, 300);
  assert.equal(adapted.phases[0].exercises[1].name, 'שכיבות סמיכה');

  // Verify deep copy: mutation to adapted does not affect original
  adapted.phases[0].exercises[0].name = 'סקוואט שונה';
  assert.equal(baseWorkout.phases[0].exercises[0].name, 'סקוואט');
});

test('התאמת חום כבד עם הוראות שתייה: extreme_heat adds water breaks, shortens outdoor runs, and includes hydration instructions', () => {
  const outdoorWorkout = {
    title: 'אימון פארק וריצה',
    phases: [
      {
        name: 'Main',
        exercises: [
          { name: 'ריצת שדה וחימום', duration_seconds: 1000, notes: 'ריצה רציפה בפארק' },
          { name: 'סקוואט ולאנגים', duration_seconds: 600, notes: 'עבודה בעצימות גבוהה' }
        ]
      }
    ]
  };

  const adapted = adaptWorkoutForWeather(outdoorWorkout, 'extreme_heat');
  assert.ok(adapted);
  assert.equal(adapted.weather, 'extreme_heat');
  assert.match(adapted.weather_note, /חום כבד/);

  const mainExercises = adapted.phases[0].exercises;
  // Outdoor run must be shortened
  const runEx = mainExercises.find((e) => e.name.includes('ריצת שדה'));
  assert.ok(runEx, 'shortened run exercise should exist');
  assert.ok(runEx.duration_seconds < 1000, 'outdoor run duration should be shortened');
  assert.match(runEx.notes, /חום כבד/);

  // Water break must be added with hydration instructions
  const waterBreaks = mainExercises.filter((e) => e.is_water_break || e.name.includes('מים'));
  assert.ok(waterBreaks.length >= 1, 'at least one water break should be added');
  assert.match(waterBreaks[0].notes, /הוראות שתייה/);

  // Test netanya-opening helper as well
  const netanyaAdapted = adaptNetanyaWorkout(0, 'extreme_heat');
  assert.ok(netanyaAdapted);
  assert.equal(netanyaAdapted.weather, 'extreme_heat');
  const netanyaWaterBreaks = netanyaAdapted.phases
    .flatMap((p) => p.exercises)
    .filter((e) => e.name.includes('מים') || e.is_water_break);
  assert.ok(netanyaWaterBreaks.length > 0, 'Netanya adapted plan should include water breaks');
});

test('המרת גשם לתרגילים מקורים: rain_indoor converts outdoor running and park drills to stationary indoor stations', () => {
  const parkWorkout = {
    title: 'אימון שטח ופארק',
    phases: [
      {
        name: 'Main',
        exercises: [
          { name: 'שליחי היכרות', duration_seconds: 1200, notes: 'ריצת שליחים בדשא הפארק' },
          { name: 'שרשרת היכרות וקונוסים', duration_seconds: 1200, notes: 'תרגילי פארק בין קונוסים' }
        ]
      }
    ]
  };

  const adapted = adaptWorkoutForWeather(parkWorkout, 'rain_indoor');
  assert.ok(adapted);
  assert.equal(adapted.weather, 'rain_indoor');
  assert.match(adapted.weather_note, /מעבר לשטח מקורה/);

  const exercises = adapted.phases[0].exercises;
  assert.equal(exercises.length, 2);

  // All park and running drills converted to indoor stations
  for (const ex of exercises) {
    assert.ok(ex.is_indoor, 'exercise should be flagged as indoor');
    assert.match(ex.name, /מקורה/);
    assert.match(ex.notes, /מעבר לשטח מקורה/);
  }

  // Netanya opening workout conversion check
  assert.ok(Array.isArray(NetanyaOpeningWorkouts));
  const netanyaRainAdapted = adaptNetanyaWorkout(NetanyaOpeningWorkouts[0], 'rain_indoor');
  assert.ok(netanyaRainAdapted);
  const indoorDrills = netanyaRainAdapted.phases.flatMap((p) => p.exercises).filter((e) => e.is_indoor);
  assert.ok(indoorDrills.length >= 2, 'Park and running drills in Netanya workout should be converted to indoor');
});

test('קלט null/מצב שגוי: handles null, undefined, and invalid weather conditions safely', () => {
  assert.equal(adaptWorkoutForWeather(null, 'normal'), null);
  assert.equal(adaptWorkoutForWeather(null, 'extreme_heat'), null);
  assert.equal(adaptWorkoutForWeather(undefined, 'rain_indoor'), null);
  assert.equal(adaptWorkoutForWeather('invalid_workout_string', 'normal'), null);

  const sample = { title: 'אימון תקין', phases: [] };
  const adaptedInvalidCondition = adaptWorkoutForWeather(sample, 'storm_typhoon');
  assert.ok(adaptedInvalidCondition);
  assert.equal(adaptedInvalidCondition.title, 'אימון תקין');

  const adaptedNullCondition = adaptWorkoutForWeather(sample, null);
  assert.ok(adaptedNullCondition);
  assert.equal(adaptedNullCondition.title, 'אימון תקין');

  const emptyWorkout = adaptWorkoutForWeather({}, 'extreme_heat');
  assert.ok(emptyWorkout);
});

test('וקיום הבורר והתווית ב-reserves.html: weatherConditionSelect and matching label are present in reserves.html', () => {
  const htmlPath = path.join(__dirname, '..', 'reserves.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify explicit label for weatherConditionSelect
  assert.match(html, /<label\b[^>]*for="weatherConditionSelect"[^>]*>/, 'label for weatherConditionSelect must exist');

  // Verify select element with required id
  assert.match(html, /<select\b[^>]*id="weatherConditionSelect"[^>]*>/, 'select#weatherConditionSelect must exist');

  // Verify output display container
  assert.match(html, /id="weatherAdaptedOut"/, 'container#weatherAdaptedOut must exist');

  // Verify selector includes options for normal, extreme heat, and rain
  assert.match(html, /value="normal"/);
  assert.match(html, /value="extreme_heat"/);
  assert.match(html, /value="rain_indoor"/);

  // Verify weather fallback script is included in reserves.html
  assert.match(html, /<script\s+src="\.\/js\/weather-fallback\.js"><\/script>/);
});
