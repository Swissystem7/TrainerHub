const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildIcsCalendarText,
  escapeIcsText,
  formatIcsDate,
  weeklyProgramToCalendarEvents,
  reservesPlanToCalendarEvents
} = require('../js/calendar-export.js');

const root = path.join(__dirname, '..');

test('יצירת כותרות BEGIN:VCALENDAR ו-END:VCALENDAR', () => {
  const events = [
    {
      title: 'אימון ניסיון',
      startDate: new Date('2026-11-23T08:00:00Z'),
      durationMinutes: 45
    }
  ];
  const ics = buildIcsCalendarText(events);

  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'ICS file must begin with BEGIN:VCALENDAR');
  assert.match(ics, /VERSION:2\.0/, 'ICS must specify VERSION:2.0');
  assert.match(ics, /PRODID:-?\/\/TrainerHub\/\//, 'ICS must specify TrainerHub PRODID');
  assert.match(ics, /CALSCALE:GREGORIAN/, 'ICS must specify CALSCALE:GREGORIAN');
  assert.ok(ics.trim().endsWith('END:VCALENDAR'), 'ICS file must terminate with END:VCALENDAR');
});

test('יצירת אירוע תקין עם שעה ומשך', () => {
  const start = new Date('2026-11-25T10:00:00Z');
  const events = [
    {
      id: 'test-event-1',
      title: 'אימון רגליים וכוח',
      description: 'סקוואט 3 סטים ומכרעים',
      startDate: start,
      durationMinutes: 45
    }
  ];
  const ics = buildIcsCalendarText(events);

  assert.match(ics, /BEGIN:VEVENT/, 'Must contain BEGIN:VEVENT');
  assert.match(ics, /UID:test-event-1@trainerhub/, 'UID should be derived from event id or unique');
  assert.match(ics, /DTSTAMP:\d{8}T\d{6}Z/, 'Must contain valid DTSTAMP timestamp');
  assert.match(ics, /DTSTART:20261125T100000Z/, 'DTSTART must match event start time');
  assert.match(ics, /DTEND:20261125T104500Z/, 'DTEND must be 45 minutes after DTSTART');
  assert.match(ics, /SUMMARY:אימון רגליים וכוח/, 'SUMMARY must contain event title');
  assert.match(ics, /DESCRIPTION:סקוואט 3 סטים ומכרעים/, 'DESCRIPTION must contain event description');
  assert.match(ics, /END:VEVENT/, 'Must contain END:VEVENT');
  assert.equal(formatIcsDate(start), '20261125T100000Z');
});

test('ביצוע escape לפסיקים ושורות חדשות', () => {
  const rawSummary = 'אימון גב, יד קדמית, ובטן; דגש מיוחד\\בטיחות';
  const rawDescription = 'חימום: ריצה קלה, מתיחות\nסט ראשון: 10 חזרות\r\nסט שני: 8 חזרות';
  const events = [
    {
      title: rawSummary,
      description: rawDescription,
      startDate: new Date('2026-11-26T07:00:00Z'),
      durationMinutes: 60
    }
  ];
  const ics = buildIcsCalendarText(events);

  assert.match(
    ics,
    /SUMMARY:אימון גב\\, יד קדמית\\, ובטן\\; דגש מיוחד\\\\בטיחות/,
    'Commas, semicolons, and backslashes in summary must be safely escaped'
  );
  assert.match(
    ics,
    /DESCRIPTION:חימום: ריצה קלה\\, מתיחות\\nסט ראשון: 10 חזרות\\nסט שני: 8 חזרות/,
    'Commas and newlines in description must be escaped to \\, and \\n'
  );
  assert.equal(escapeIcsText('א, ב; ג\\ד\nה'), 'א\\, ב\\; ג\\\\ד\\nה', 'escapeIcsText helper must escape all specials');
});

test('טיפול במערך ריק/null', () => {
  assert.doesNotThrow(() => {
    const fromNull = buildIcsCalendarText(null);
    assert.ok(fromNull.startsWith('BEGIN:VCALENDAR'));
    assert.ok(fromNull.trim().endsWith('END:VCALENDAR'));
    assert.doesNotMatch(fromNull, /BEGIN:VEVENT/, 'Null list should have 0 events');
  });

  assert.doesNotThrow(() => {
    const fromUndefined = buildIcsCalendarText(undefined);
    assert.ok(fromUndefined.startsWith('BEGIN:VCALENDAR'));
    assert.ok(fromUndefined.trim().endsWith('END:VCALENDAR'));
    assert.doesNotMatch(fromUndefined, /BEGIN:VEVENT/, 'Undefined list should have 0 events');
  });

  assert.doesNotThrow(() => {
    const fromEmpty = buildIcsCalendarText([]);
    assert.ok(fromEmpty.startsWith('BEGIN:VCALENDAR'));
    assert.ok(fromEmpty.trim().endsWith('END:VCALENDAR'));
    assert.doesNotMatch(fromEmpty, /BEGIN:VEVENT/, 'Empty array should have 0 events');
  });
});

test('קיום הכפתור ב-weekly.html וב-reserves.html', () => {
  const weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
  const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');

  assert.match(
    weeklyHtml,
    /<button[^>]*id="exportIcsCalendarBtn"[^>]*>הורד ליומן \(\.ics\)<\/button>/,
    'weekly.html must contain exportIcsCalendarBtn button'
  );
  assert.match(weeklyHtml, /calendar-export\.js/, 'weekly.html must include calendar-export.js script');

  assert.match(
    reservesHtml,
    /<button[^>]*id="exportIcsCalendarBtn"[^>]*>הורד ליומן \(\.ics\)<\/button>/,
    'reserves.html must contain exportIcsCalendarBtn button'
  );
  assert.match(reservesHtml, /calendar-export\.js/, 'reserves.html must include calendar-export.js script');

  const sampleProg = {
    dailyWorkouts: [{ day: 1, split: 'push', exercises: [{ name: 'שכיבות סמיכה', sets: 3, reps: '10' }] }]
  };
  const weeklyEvents = weeklyProgramToCalendarEvents(sampleProg);
  assert.ok(weeklyEvents.length === 1);
  assert.match(weeklyEvents[0].summary, /אימון 1/);

  const samplePlan = {
    sessions: [{ id: 's1', week: 1, day_he: 'יום א׳', focus_he: 'כוח', items_he: ['סקוואט'] }]
  };
  const reservesEvents = reservesPlanToCalendarEvents(samplePlan);
  assert.ok(reservesEvents.length === 1);
  assert.match(reservesEvents[0].summary, /מילואים/);
});
