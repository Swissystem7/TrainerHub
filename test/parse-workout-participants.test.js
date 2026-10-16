'use strict';

// Regression: «אימון כוח ל-12 חניכים» came out with participants null and the
// title «אימון כוח ל-12 חניכים» - the studio parser only read «N אנשים» /
// «קבוצה של N», and a line «משתתפים: 12» became an exercise named «משתתפים 12».

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function head(first, extra) {
  const w = parseWorkoutClient([first].concat(extra || []).concat(['סקוואט 3x10']).join('\n'));
  return {
    title: w.title,
    participants: w.participants,
    group: w.tags.indexOf('group') !== -1,
    main: w.phases.find(function (p) { return p.name === 'Main'; }).exercises.map(function (e) { return e.name; })
  };
}

test('the trainers\' words for the group size are read and leave the title', () => {
  assert.deepEqual(head('אימון כוח ל-12 חניכים, 45 דקות'), { title: 'אימון כוח', participants: 12, group: true, main: ['סקוואט'] });
  assert.deepEqual(head('אימון קבוצתי 45 דקות ל-15 משתתפים'), { title: 'אימון קבוצתי', participants: 15, group: true, main: ['סקוואט'] });
  assert.deepEqual(head('אימון לקבוצה של 8 מתאמנים'), { title: 'אימון', participants: 8, group: true, main: ['סקוואט'] });
  assert.deepEqual(head('אימון ל-20 ילדים 40 דקות'), { title: 'אימון', participants: 20, group: true, main: ['סקוואט'] });
  assert.deepEqual(head('אימון כוח של 12 חניכים'), { title: 'אימון כוח', participants: 12, group: true, main: ['סקוואט'] });
  assert.deepEqual(head('אימון כוח לקבוצה של 12'), { title: 'אימון כוח', participants: 12, group: true, main: ['סקוואט'] });
});

test('a «משתתפים: 12» line is the group size, not an exercise', () => {
  assert.deepEqual(head('אימון 45 דקות', ['משתתפים: 12']), { title: 'אימון', participants: 12, group: true, main: ['סקוואט'] });
  assert.deepEqual(head('אימון 45 דקות', ['12 חניכים']), { title: 'אימון', participants: 12, group: true, main: ['סקוואט'] });
});

test('people inside an exercise line are not the group size', () => {
  assert.deepEqual(head('אימון כוח', ['מסירות בין 3 חניכים 3x10']), { title: 'אימון כוח', participants: null, group: false, main: ['מסירות בין 3 חניכים', 'סקוואט'] });
  assert.deepEqual(head('אימון אישי 30 דקות'), { title: 'אימון אישי', participants: null, group: false, main: ['סקוואט'] });
});

test('«N אנשים» still works as before', () => {
  assert.equal(head('אימון ל 10 אנשים').participants, 10);
  assert.equal(head('אימון ל 10 אנשים').title, 'אימון ל 10 אנשים'.replace(' ל 10 אנשים', ''));
});
