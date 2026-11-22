((root) => {
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatIcsDate(d) {
    if (typeof d === 'string' && /^\d{8}(T\d{6}Z?)?$/.test(d)) {
      return d;
    }
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) {
      return '20261122T080000Z';
    }
    return (
      date.getUTCFullYear() +
      pad2(date.getUTCMonth() + 1) +
      pad2(date.getUTCDate()) +
      'T' +
      pad2(date.getUTCHours()) +
      pad2(date.getUTCMinutes()) +
      pad2(date.getUTCSeconds()) +
      'Z'
    );
  }

  function escapeIcsText(str) {
    if (str == null) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\n|\r/g, '\\n');
  }

  function buildIcsCalendarText(eventsList) {
    const list = Array.isArray(eventsList) ? eventsList : [];
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TrainerHub//Calendar Export//HE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    list.forEach((event, idx) => {
      if (!event || typeof event !== 'object') return;

      const uid = event.uid || (event.id ? `${event.id}@trainerhub` : `th-event-${idx + 1}-${Date.now()}@trainerhub`);
      const dtstamp = formatIcsDate(event.stampDate || new Date());

      let startDate;
      if (event.startDate || event.start || event.date || event.dtstart) {
        const rawStart = event.startDate || event.start || event.date || event.dtstart;
        startDate = rawStart instanceof Date ? rawStart : new Date(rawStart);
        if (Number.isNaN(startDate.getTime())) {
          startDate = new Date();
        }
      } else {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 + idx, 8, 0, 0);
      }

      const durationMinutes = Number(event.durationMinutes ?? event.duration_minutes ?? event.duration ?? 45) || 45;

      let endDate;
      if (event.endDate || event.end || event.dtend) {
        const rawEnd = event.endDate || event.end || event.dtend;
        endDate = rawEnd instanceof Date ? rawEnd : new Date(rawEnd);
        if (Number.isNaN(endDate.getTime())) {
          endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        }
      } else {
        endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
      }

      const summary = escapeIcsText(event.summary || event.title || event.name || 'אימון TrainerHub');
      const description = escapeIcsText(event.description || event.details || event.notes || '');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${formatIcsDate(startDate)}`);
      lines.push(`DTEND:${formatIcsDate(endDate)}`);
      lines.push(`SUMMARY:${summary}`);
      if (description) {
        lines.push(`DESCRIPTION:${description}`);
      }
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return `${lines.join('\r\n')}\r\n`;
  }

  function downloadIcsFile(filename, icsContent) {
    if (typeof document === 'undefined') return false;
    try {
      const cleanName = (filename || 'workout-schedule').endsWith('.ics')
        ? filename || 'workout-schedule'
        : `${filename || 'workout-schedule'}.ics`;
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
        }, 1000);
        return true;
      }
    } catch (_e) {
      /* ignore download errors */
    }
    return false;
  }

  function weeklyProgramToCalendarEvents(program, options) {
    if (!program || !Array.isArray(program.dailyWorkouts)) return [];
    const baseDate = options && options.startDate instanceof Date ? options.startDate : new Date();
    const startDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 8, 0, 0);

    return program.dailyWorkouts.map((d, index) => {
      const splitMap = {
        push: 'דחיפה',
        pull: 'משיכה',
        legs: 'רגליים',
        upper: 'פלג עליון',
        lower: 'פלג תחתון',
        full: 'גוף מלא',
        focus: 'מיקוד'
      };
      const splitLabel = splitMap[d.split] || '';
      const dayNum = d.day || index + 1;
      const title = `אימון ${dayNum}${splitLabel ? ` · ${splitLabel}` : ''}`;

      const exercises = (d.phases ? d.phases.flatMap((p) => p.exercises || []) : d.exercises || []).filter(Boolean);
      const descLines = exercises.map((ex) => {
        let line = ex.name || '';
        if (ex.sets && ex.reps) {
          line += ` (${ex.sets} סטים · ${ex.reps} חזרות)`;
        } else if (ex.reps) {
          line += ` (${ex.reps} חזרות)`;
        } else if (ex.duration_seconds) {
          line += ` (${ex.duration_seconds} שנ׳)`;
        }
        return line;
      });

      const eventDate = new Date(startDay.getTime() + index * 2 * 86400000);

      return {
        uid: `weekly-day-${dayNum}-${Date.now()}@trainerhub`,
        title: title,
        summary: title,
        description: descLines.length ? `תרגילים:\n${descLines.join('\n')}` : 'תוכנית אימונים שבועית מ-TrainerHub',
        startDate: eventDate,
        durationMinutes: 45
      };
    });
  }

  function reservesPlanToCalendarEvents(plan, options) {
    if (!plan) return [];
    const sessions = Array.isArray(plan.sessions) ? plan.sessions : Array.isArray(plan) ? plan : [];
    if (!sessions.length) return [];
    const baseDate = options && options.startDate instanceof Date ? options.startDate : new Date();
    const startDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 7, 0, 0);

    return sessions.map((s, index) => {
      const weekNum = s.week || Math.floor(index / 3) + 1;
      const dayLabel = s.day_he || `יום ${index + 1}`;
      const focus = s.focus_he || '';
      const title = `מילואים · שבוע ${weekNum} · ${dayLabel}${focus ? ` (${focus})` : ''}`;
      const items = Array.isArray(s.items_he) ? s.items_he.join('\n') : '';
      const eventDate = new Date(startDay.getTime() + index * 2 * 86400000);

      return {
        uid: `reserves-session-${s.id || index + 1}-${Date.now()}@trainerhub`,
        title: title,
        summary: title,
        description: items || 'תוכנית אימוני מילואים מ-TrainerHub',
        startDate: eventDate,
        durationMinutes: 30
      };
    });
  }

  const api = {
    buildIcsCalendarText: buildIcsCalendarText,
    escapeIcsText: escapeIcsText,
    formatIcsDate: formatIcsDate,
    downloadIcsFile: downloadIcsFile,
    weeklyProgramToCalendarEvents: weeklyProgramToCalendarEvents,
    reservesPlanToCalendarEvents: reservesPlanToCalendarEvents
  };

  if (root) {
    root.THCalendarExport = api;
    if (root.TH && typeof root.TH === 'object') {
      root.TH.buildIcsCalendarText = buildIcsCalendarText;
      root.TH.escapeIcsText = escapeIcsText;
      root.TH.downloadIcsFile = downloadIcsFile;
      root.TH.weeklyProgramToCalendarEvents = weeklyProgramToCalendarEvents;
      root.TH.reservesPlanToCalendarEvents = reservesPlanToCalendarEvents;
    }
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
