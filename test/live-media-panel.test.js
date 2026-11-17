const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const LiveMediaPanel = require('../js/live-media-panel.js');

function createMockElement(tagName) {
  const children = [];
  const attrs = {};
  return {
    tagName: String(tagName).toUpperCase(),
    children: children,
    attributes: attrs,
    style: {},
    className: '',
    textContent: '',
    type: '',
    src: '',
    alt: '',
    disabled: false,
    setAttribute(k, v) {
      attrs[k] = String(v);
    },
    getAttribute(k) {
      return attrs[k] ?? null;
    },
    appendChild(child) {
      children.push(child);
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      return child;
    },
    get firstChild() {
      return children[0] || null;
    },
    addEventListener(_event, fn) {
      this._listener = fn;
    }
  };
}

test('1) איתור מדיה לפי מזהה', () => {
  const catalog = [
    {
      id: 'ig-DfFxxAruQGT',
      name_he: 'זחילת דוב עם כדור רפואי',
      source_url: 'https://example.com/bear-crawl.mp4',
      poster: 'assets/posters/DfFxxAruQGT.jpg',
      steps_he: ['עמידת שש', 'ברכיים מעט מעל הרצפה', 'התקדמות איטית עם הכדור'],
      safety_he: 'לשמור על גב ישר ללא הקשתה'
    },
    {
      id: 'drive-file-abc12345',
      file_id: 'drive-file-abc12345',
      name_he: 'אימון אינטרוולים',
      source_url: 'https://drive.google.com/file/d/drive-file-abc12345/view',
      poster: 'assets/posters/DekhvfkoCfN.jpg',
      steps_he: ['עבודה בקצב גבוה']
    }
  ];

  const resolved = LiveMediaPanel.resolveExerciseMedia({ id: 'ig-DfFxxAruQGT' }, catalog);
  assert.equal(resolved.id, 'ig-DfFxxAruQGT');
  assert.equal(resolved.name_he, 'זחילת דוב עם כדור רפואי');
  assert.equal(resolved.videoUrl, 'https://example.com/bear-crawl.mp4');
  assert.equal(resolved.hasVideo, true);
  assert.equal(resolved.posterUrl, 'assets/posters/DfFxxAruQGT.jpg');
  assert.equal(resolved.isFallbackPoster, false);
  assert.deepEqual(resolved.techniqueCues, ['עמידת שש', 'ברכיים מעט מעל הרצפה', 'התקדמות איטית עם הכדור']);
  assert.equal(resolved.safetyNotes, 'לשמור על גב ישר ללא הקשתה');

  // Verify resolution without prefix
  const driveResolved = LiveMediaPanel.resolveExerciseMedia('drive-file-abc12345', catalog);
  assert.equal(driveResolved.id, 'drive-file-abc12345');
  assert.equal(driveResolved.hasVideo, true);
  assert.equal(driveResolved.videoUrl, 'https://drive.google.com/file/d/drive-file-abc12345/view');
});

test('2) איתור לפי שם עברי', () => {
  const catalog = [
    {
      id: 'ex-pushups',
      name_he: 'שכיבות סמיכה רגילות',
      source_url: 'https://example.com/pushups.mp4',
      poster: 'assets/posters/pushups.jpg',
      steps_he: ['ידיים ברוחב כתפיים', 'ירידה מבוקרת עד שהחזה קרוב לרצפה'],
      safety_he: 'לא להקשת את הגב התחתון'
    },
    {
      id: 'ex-squat',
      he: 'סקוואט חופשי',
      videoUrl: 'https://example.com/squat.mp4',
      techniqueCues: ['ברכיים בכיוון אצבעות הרגליים', 'משקל על העקבים']
    }
  ];

  const byNameHe = LiveMediaPanel.resolveExerciseMedia({ name_he: 'שכיבות סמיכה רגילות' }, catalog);
  assert.equal(byNameHe.id, 'ex-pushups');
  assert.equal(byNameHe.videoUrl, 'https://example.com/pushups.mp4');
  assert.deepEqual(byNameHe.techniqueCues, ['ידיים ברוחב כתפיים', 'ירידה מבוקרת עד שהחזה קרוב לרצפה']);

  const byHe = LiveMediaPanel.resolveExerciseMedia('סקוואט חופשי', catalog);
  assert.equal(byHe.id, 'ex-squat');
  assert.equal(byHe.videoUrl, 'https://example.com/squat.mp4');
  assert.deepEqual(byHe.techniqueCues, ['ברכיים בכיוון אצבעות הרגליים', 'משקל על העקבים']);
});

test('3) חסימת URL לא בטוח javascript:', () => {
  const unsafeExercise = {
    id: 'evil-ex',
    name: 'בדיקת אבטחה',
    videoUrl: 'javascript:alert("xss")',
    poster: 'javascript:confirm(1)'
  };
  const catalog = [
    {
      id: 'evil-ex',
      source_url: 'javascript:void(0)',
      poster: 'data:text/html,<script>alert(1)</script>'
    }
  ];

  const resolved = LiveMediaPanel.resolveExerciseMedia(unsafeExercise, catalog);
  assert.equal(resolved.videoUrl, null);
  assert.equal(resolved.hasVideo, false);
  assert.equal(resolved.isFallbackPoster, true);
  assert.equal(resolved.posterUrl, LiveMediaPanel.DEFAULT_FALLBACK_POSTER);

  assert.equal(LiveMediaPanel.isSafeUrl('javascript:alert(1)'), false);
  assert.equal(LiveMediaPanel.isSafeUrl('data:text/html;base64,PHNjcmlwdD4='), false);
  assert.equal(LiveMediaPanel.isSafeUrl('vbscript:msgbox(1)'), false);
  assert.equal(LiveMediaPanel.isSafeUrl('http://insecure.example.com/video.mp4'), false);
  assert.equal(LiveMediaPanel.isSafeUrl('//evil.example.com/video.mp4'), false);
  assert.equal(LiveMediaPanel.isSafeUrl('../etc/passwd'), false);
  assert.equal(LiveMediaPanel.isSafeUrl('https://valid.example.com/video.mp4'), true);
  assert.equal(LiveMediaPanel.isSafeUrl('assets/posters/valid.jpg'), true);
});

test('4) פוסטר fallback כשאין סרטון', () => {
  const noVideoEx = {
    id: 'no-video-step',
    name: 'מתיחות שרירים'
  };

  const resolved = LiveMediaPanel.resolveExerciseMedia(noVideoEx, []);
  assert.equal(resolved.videoUrl, null);
  assert.equal(resolved.hasVideo, false);
  assert.equal(resolved.isFallbackPoster, true);
  assert.equal(resolved.posterUrl, LiveMediaPanel.DEFAULT_FALLBACK_POSTER);
  assert.equal(resolved.posterUrl, 'assets/posters/fallback.jpg');
});

test('5) טיפול בקטלוג ריק/null', () => {
  assert.doesNotThrow(() => {
    const res1 = LiveMediaPanel.resolveExerciseMedia(null, null);
    assert.equal(typeof res1, 'object');
    assert.equal(res1.hasVideo, false);
    assert.equal(res1.isFallbackPoster, true);
    assert.deepEqual(res1.techniqueCues, []);
  });

  assert.doesNotThrow(() => {
    const res2 = LiveMediaPanel.resolveExerciseMedia('any-id', undefined);
    assert.equal(res2.id, 'any-id');
    assert.equal(res2.hasVideo, false);
  });

  assert.doesNotThrow(() => {
    const res3 = LiveMediaPanel.resolveExerciseMedia({}, []);
    assert.equal(typeof res3, 'object');
    assert.equal(res3.hasVideo, false);
  });

  assert.doesNotThrow(() => {
    const res4 = LiveMediaPanel.resolveExerciseMedia({ id: 'test' }, {});
    assert.equal(res4.id, 'test');
  });
});

test('6) רינדור בטוח ללא XSS', () => {
  const code = fs.readFileSync(path.join(root, 'js', 'live-media-panel.js'), 'utf8');
  assert.doesNotMatch(code, /\.innerHTML\b/, 'live-media-panel.js must not use innerHTML');

  const prevDoc = global.document;
  global.document = { createElement: createMockElement };
  try {
    const container = createMockElement('div');
    const mediaData = {
      name: '<script>alert("xss")</script>',
      videoUrl: 'https://example.com/watch?v=safe',
      posterUrl: 'assets/posters/sample.jpg',
      techniqueCues: ['<img src=x onerror=alert(1)>', '<svg onload=alert(2)>'],
      safetyNotes: '<a href="javascript:alert(3)">בטיחות חשובה</a>'
    };

    LiveMediaPanel.renderMediaPanel(container, mediaData);

    assert.equal(container.children.length, 4);

    const posterWrap = container.children[0];
    const posterImg = posterWrap.children[0];
    assert.equal(posterImg.tagName, 'IMG');
    assert.equal(posterImg.src, 'assets/posters/sample.jpg');
    assert.equal(posterImg.alt, '<script>alert("xss")</script>');

    const actionWrap = container.children[1];
    const videoBtn = actionWrap.children[0];
    assert.equal(videoBtn.tagName, 'BUTTON');
    assert.equal(videoBtn.textContent, 'צפייה בסרטון');
    assert.equal(videoBtn.getAttribute('data-video-url'), 'https://example.com/watch?v=safe');

    const cuesSection = container.children[2];
    assert.equal(cuesSection.tagName, 'DIV');
    const ul = cuesSection.children[1];
    assert.equal(ul.tagName, 'UL');
    assert.equal(ul.children.length, 2);
    assert.equal(ul.children[0].textContent, '<img src=x onerror=alert(1)>');
    assert.equal(ul.children[1].textContent, '<svg onload=alert(2)>');

    const safetyEl = container.children[3];
    assert.equal(safetyEl.tagName, 'P');
    assert.equal(safetyEl.textContent, 'בטיחות: <a href="javascript:alert(3)">בטיחות חשובה</a>');

    // Test with missing video: button should be disabled
    const noVideoContainer = createMockElement('div');
    LiveMediaPanel.renderMediaPanel(noVideoContainer, { videoUrl: null, posterUrl: null, techniqueCues: [] });
    const noVideoBtn = noVideoContainer.children[1].children[0];
    assert.equal(noVideoBtn.disabled, true);
    assert.equal(noVideoBtn.textContent, 'סרטון לא זמין');
  } finally {
    global.document = prevDoc;
  }
});

test('7) קיום האלמנטים ב-frontend/workout-mode.html', () => {
  const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

  // Verify container with id='liveMediaPanel'
  assert.match(
    html,
    /<div[^>]+id=["']liveMediaPanel["'][^>]*role=["']region["'][^>]*aria-label=["']תצוגת הדגמה ודגשי טכניקה["']/
  );

  // Verify scripts connection
  assert.match(html, /<script\s+src=["']\.\.\/js\/reel-library\.js["']><\/script>/);
  assert.match(html, /<script\s+src=["']\.\.\/js\/live-media-panel\.js["']><\/script>/);

  // Verify liveMediaPanel is integrated in renderExercise
  assert.match(html, /LiveMediaPanel\.resolveExerciseMedia/);
  assert.match(html, /LiveMediaPanel\.renderMediaPanel/);
});

test('8) קיום האלמנטים ב-exercises.html', () => {
  const html = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');

  // Verify link 'הפעל במצב אימון חי' in exercises.html
  assert.match(html, /הפעל במצב אימון חי/);
  assert.match(html, /class=["'][^"']*play-live[^"']*["']/);
  assert.match(html, /data-play-live/);
  assert.match(html, /id=["']playLiveLink["']/);

  // Verify live-media-panel.js connection
  assert.match(html, /<script\s+src=["']\.\/js\/live-media-panel\.js["']><\/script>/);

  // Verify click handler for play-live exists in script
  assert.match(html, /data-play-live/);
  assert.match(html, /playLiveLink/);
});
