((root) => {
  /**
   * Adapts a workout structure for extreme weather conditions.
   * @param {Object} workout - The workout object to adapt
   * @param {'normal'|'extreme_heat'|'rain_indoor'|string} weatherCondition - Weather condition key
   * @returns {Object|null} Adapted copy of the workout, or null if input is invalid
   */
  function adaptWorkoutForWeather(workout, weatherCondition) {
    if (!workout || typeof workout !== 'object') {
      return null;
    }

    const condition = weatherCondition || 'normal';
    if (condition === 'normal') {
      return JSON.parse(JSON.stringify(workout));
    }

    const adapted = JSON.parse(JSON.stringify(workout));

    if (condition === 'extreme_heat') {
      adapted.weather = 'extreme_heat';
      adapted.weather_note = 'הותאם לעומס חום כבד: הוספת הפסקות מים יזומות, קיצור ריצות חוץ והוראות שתייה מרובה בצל.';

      const handlePhase = (phase) => {
        if (!phase || !Array.isArray(phase.exercises)) return;
        const newExercises = [];
        let addedWaterBreak = false;

        for (const ex of phase.exercises) {
          const exName = ex.name || '';
          const exNotes = ex.notes || '';
          const isRun = /(ריצה|ריצת|שליחים|ספרינט|אינטרוולים)/i.test(`${exName} ${exNotes}`);
          const isWater = /(מים|שתייה)/i.test(exName);

          if (isRun) {
            const originalDuration = ex.duration_seconds || 0;
            const shortenedDuration = originalDuration > 0 ? Math.round(originalDuration * 0.6) : 0;
            const savedTime = originalDuration > 0 ? originalDuration - shortenedDuration : 0;

            newExercises.push({
              ...ex,
              name: `${exName} (קוצר עקב חום כבד)`,
              duration_seconds: shortenedDuration > 0 ? shortenedDuration : ex.duration_seconds,
              notes: `${exNotes ? `${exNotes} · ` : ''}קוצר עקב עומס חום כבד; שמירה על קצב מתון והוראות שתייה מרובה בצל.`
            });

            newExercises.push({
              name: 'הפסקת מים והתרעננות',
              notes: 'הוראות שתייה: חובה לשתות מים בצל, הורדת דופק ומעקב אחר הרגשה כללית.',
              duration_seconds: savedTime > 0 ? savedTime : 180,
              sets: 1,
              reps: null,
              rest_seconds: 60,
              is_water_break: true
            });
            addedWaterBreak = true;
          } else if (isWater) {
            newExercises.push({
              ...ex,
              notes: `${exNotes ? `${exNotes} · ` : ''}הוראות שתייה: שתייה מרובה בצל, עצירה מידית במקרה של סחרחורת.`
            });
            addedWaterBreak = true;
          } else {
            newExercises.push(ex);
          }
        }

        if (!addedWaterBreak && newExercises.length > 0) {
          newExercises.push({
            name: 'הפסקת מים והתרעננות',
            notes: 'הוראות שתייה: שתיית מים בצל, התאוששות והורדת עומס חום.',
            duration_seconds: 180,
            sets: 1,
            reps: null,
            rest_seconds: 60,
            is_water_break: true
          });
        }

        phase.exercises = newExercises;
      };

      if (Array.isArray(adapted.phases)) {
        for (const ph of adapted.phases) {
          handlePhase(ph);
        }
      } else if (Array.isArray(adapted.exercises)) {
        const dummyPhase = { exercises: adapted.exercises };
        handlePhase(dummyPhase);
        adapted.exercises = dummyPhase.exercises;
      }

      return adapted;
    }

    if (condition === 'rain_indoor') {
      adapted.weather = 'rain_indoor';
      adapted.weather_note = 'הותאם לתנאי גשם: מעבר לשטח מקורה והמרת תרגילי שטח וריצה לתחנות משקל גוף מקורות במקום.';

      const handlePhase = (phase) => {
        if (!phase || !Array.isArray(phase.exercises)) return;
        phase.exercises = phase.exercises.map((ex) => {
          const exName = ex.name || '';
          const exNotes = ex.notes || '';
          const isOutdoorOrRun = /(ריצה|ריצת|שליחים|פארק|דשא|אלונקה|חבל|דגל|זחילה|קונוסים)/i.test(
            `${exName} ${exNotes}`
          );

          if (isOutdoorOrRun) {
            const isRun = /(ריצה|ריצת|שליחים)/i.test(exName);
            const indoorName = isRun
              ? 'תחנת אירובי מקורה (ריצה במקום וצעדי צד)'
              : 'תחנת משקל גוף מקורה (סקוואט, שכיבות סמיכה וליבה)';
            const indoorNotes = `מעבר לשטח מקורה: ביצוע במקום על משטח יבש, ללא סכנת החלקה; ${exNotes || ''}`.trim();

            return {
              ...ex,
              original_name: ex.original_name || ex.name,
              name: indoorName,
              notes: indoorNotes,
              is_indoor: true
            };
          }
          return ex;
        });
      };

      if (Array.isArray(adapted.phases)) {
        for (const ph of adapted.phases) {
          handlePhase(ph);
        }
      } else if (Array.isArray(adapted.exercises)) {
        const dummyPhase = { exercises: adapted.exercises };
        handlePhase(dummyPhase);
        adapted.exercises = dummyPhase.exercises;
      }

      return adapted;
    }

    return JSON.parse(JSON.stringify(workout));
  }

  const api = {
    adaptWorkoutForWeather
  };

  if (root) {
    root.THWeatherFallback = api;
    root.adaptWorkoutForWeather = adaptWorkoutForWeather;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
