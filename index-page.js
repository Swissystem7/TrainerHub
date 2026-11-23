
(() => {
  var $ = (id) => document.getElementById(id);
  var trackStartedAt = 0;
  var activeBuiltWorkout = null;

  function muscleList(ids) {
    return (ids || []).map((m) => TH.muscleLabel(m)).join(', ') || '—';
  }

  // The equipment select value for a parsed equipment list: exactly one id that the
  // select offers, otherwise «לפי הבקשה» so the request text decides.
  function equipmentOption(list) {
    if (!Array.isArray(list) || list.length !== 1) return 'auto';
    var options = $('equipmentInput').options || [];
    var i;
    for (i = 0; i < options.length; i++) {
      if (options[i].value === list[0]) return list[0];
    }
    return 'auto';
  }

  function switchTab(id) {
    ['prompt', 'ingest', 'seg'].forEach((key) => {
      var tab = $('tab-' + key);
      var panel = $('panel-' + key);
      var on = key === id;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });
  }

  function applySelectedTempo(workoutObj) {
    var tempoSelect = $('liveWorkoutTempoSelect');
    var selectedTempo = tempoSelect ? tempoSelect.value : null;
    if (selectedTempo && selectedTempo !== 'none') {
      workoutObj.tempo = selectedTempo;
      if (Array.isArray(workoutObj.phases)) {
        workoutObj.phases.forEach((ph) => {
          if (ph && Array.isArray(ph.exercises)) {
            ph.exercises.forEach((ex) => {
              if (ex && !ex.tempo) ex.tempo = selectedTempo;
            });
          }
        });
      }
    }
  }

  function bindWorkoutActions(w) {
    $('startBtn').addEventListener('click', () => {
      applySelectedTempo(w);
      TH.store.set(TH.KEYS.active, w);
      location.href = './frontend/workout-mode.html';
    });
    var startLiveBtn = $('startLiveWorkoutBtn');
    if (startLiveBtn) {
      startLiveBtn.addEventListener('click', () => {
        applySelectedTempo(w);
        TH.store.set(TH.KEYS.active, w);
        TH.store.set('trainerhub_active_workout', w);
        location.href = './frontend/workout-mode.html';
      });
    }
    $('previewBtn').addEventListener('click', () => {
      location.href = TH.encodeLink(w, {});
    });
    $('copyBtn').addEventListener('click', () => {
      var shared = TH.shareToClient(w, {});
      var host = $('copyBtn').parentNode;
      var old = host.parentNode.querySelector('.th-gate');
      if (old) old.parentNode.removeChild(old);
      if (!shared.ok) {
        host.insertAdjacentHTML('afterend', TH.gateMarkup('share'));
        return;
      }
      var oldQr = host.parentNode.querySelector('[data-role="share-qr"]');
      if (oldQr) oldQr.parentNode.removeChild(oldQr);
      if (TH.shareQrMarkup) host.insertAdjacentHTML('afterend', TH.shareQrMarkup(shared.url));
      TH.copyOrShow(shared.url, host, () => {
        $('copyBtn').textContent = 'הועתק';
        setTimeout(() => { $('copyBtn').textContent = 'שתף אימון ללקוח'; }, 1400);
      });
    });
    var shareWaBtn = $('shareWorkoutWhatsappBtn');
    if (shareWaBtn) {
      shareWaBtn.addEventListener('click', () => {
        var shareMod = window.THWhatsAppShare || window.TH || {};
        var formatFn = shareMod.formatWorkoutWhatsAppText;
        var buildUrlFn = shareMod.buildWhatsAppShareUrl;
        var text;
        var url;
        var opened = false;
        var win;
        if (!formatFn || !buildUrlFn) return;
        text = formatFn(w);
        if (!text) return;
        url = buildUrlFn(text);
        try {
          if (url && typeof window.open === 'function') {
            win = window.open(url, '_blank', 'noopener,noreferrer');
            if (win) opened = true;
          }
        } catch (e) {
          opened = false;
        }
        if (!opened) {
          if (window.TH && typeof window.TH.copyOrShow === 'function') {
            window.TH.copyOrShow(text, shareWaBtn.parentNode);
          }
        }
      });
    }
    $('pdfBtn').addEventListener('click', () => {
      TH.preparePrint(w, {});
      location.href = TH.printUrl();
    });
  }

  // A pasted row keeps what the coach wrote beyond sets × reps: «80 ק"ג»,
  // «עד כשל», «לכל רגל», «10-12» live in notes, and «מתח 3xמקס» has sets but
  // no reps. The card showed only sets × reps, so those rows lost the load or
  // showed a bare «מתח». «חסר סרטון» is left out - the row says it below.
  // The rest between sets is shown too, like the print sheet and weekly.html:
  // a pasted «3x10 מנוחה 60 שניות» lost its rest on the card.
  function exerciseBits(ex) {
    var bits = [];
    if (ex.sets && ex.reps) bits.push(ex.sets + ' × ' + ex.reps);
    else if (ex.sets && ex.duration_seconds) bits.push(ex.sets + ' × ' + ex.duration_seconds + ' שנ׳');
    else if (ex.sets > 1) bits.push(ex.sets + ' סטים');
    if (ex.rest_seconds) bits.push('מנוחה ' + ex.rest_seconds + ' שנ׳');
    String(ex.notes || '').split(' · ').forEach((note) => {
      note = note.trim();
      if (note && note !== 'חסר סרטון') bits.push(note);
    });
    return bits;
  }

  function render(built) {
    var box = $('result');
    if (!built || !built.workout) {
      box.innerHTML = '<div class="card notice" role="status"><p>' + TH.esc((built && built.notice) || 'לא הצלחנו לבנות אימון.') + '</p></div>';
      return;
    }
    var w = built.workout;
    activeBuiltWorkout = w;
    var exp = built.explanation || {};
    var stim = exp.stimulus || {};
    var notice = built.notice
      ? '<div class="card notice" role="status"><p>' + TH.esc(built.notice) + '</p></div>'
      : '';
    var flags = (exp.flags || []).length
      ? '<ul class="flags">' + exp.flags.map((f) => '<li>' + TH.esc(f.he) + '</li>').join('') + '</ul>'
      : '';
    var phases = (w.phases || []).map((ph) => {
      if (!(ph.exercises || []).length) return '';
      var label = TH.phaseLabel(ph.name);
      var rows = (ph.exercises || []).map((ex) => {
        var reason = (exp.reasons || []).filter((r) => r.id === ex.id)[0];
        var bits = exerciseBits(ex);
        var clip = ex.id ? TH.findExercise(ex) : null;
        var media = clip ? TH.mediaMarkup(clip, { className: 'ex-media' }) : '';
        var miss = ex.missing ? '<div class="missing">חסר סרטון — מוצג כטקסט בלבד</div>' : '';
        return '<div class="ex"><b>' + TH.esc(ex.name) +
          (bits.length ? ' <span class="pill">' + TH.esc(bits.join(' · ')) + '</span>' : '') +
          '</b>' + (reason ? '<div class="why">' + TH.esc(reason.why) + '</div>' : '') +
          miss + media + '</div>';
      }).join('');
      return '<h3 class="phase">' + TH.esc(label) + '</h3>' + rows;
    }).join('');
    // Every assumption behind the plan, with its source, so it can be read before «התחל אימון».
    var rules = built.request
      ? TH.rulesMarkup(built, { className: 'rules', title: 'הנחות האימון ומקורותיהן' })
      : '';
    var equipment = (w.equipment || []).length ? w.equipment.join(', ') : 'לפי המאגר';
    var groupPlan = w.group_plan && w.group_plan.he
      ? '<p class="stim"><strong>סידור קבוצה:</strong> ' + TH.esc(w.group_plan.he) + '</p>'
      : '';

    box.innerHTML = notice +
      '<article class="card">' +
        '<h2>' + TH.esc(w.title) + '</h2>' +
        '<div class="meta">' +
          (exp.type ? '<span class="pill">' + TH.esc(exp.type) + '</span>' : '') +
          '<span class="pill">זמן: ' + TH.esc(TH.durationLabel(w.duration_minutes, exp.durationMinutes)) + '</span>' +
          '<span class="pill">ציוד: ' + TH.esc(equipment) + '</span>' +
          '<span class="pill">חניכים: ' + TH.esc(w.participants || 1) + '</span>' +
          '<span class="pill">ראשי: ' + TH.esc(muscleList(exp.primary)) + '</span>' +
          '<span class="pill">משני: ' + TH.esc(muscleList(exp.secondary)) + '</span>' +
        '</div>' +
        (stim.he
          ? '<p class="stim"><strong>גירוי צפוי: ' + TH.esc(stim.he) + '</strong>' +
            '<small>' + TH.esc(stim.detail || '') + ' זה תיאור של העומס, לא הבטחת תוצאה.</small></p>'
          : '') +
        flags +
        groupPlan +
        '<section id="warmupSection" class="warmup-section" aria-label="חימום ממוקד ומוביליטי"></section>' +
        phases +
        rules +
        '<div class="actions" role="toolbar" aria-label="פעולות אימון">' +
          '<label for="liveWorkoutTempoSelect" style="display:inline-flex;align-items:center;gap:6px;font-size:0.85rem">' +
            '<span>קצב מבוקר:</span>' +
            '<select id="liveWorkoutTempoSelect" aria-label="בחירת קצב ביצוע לפני תחילת אימון חי" style="background:#0A1513;color:#E8F1EE;border:1px solid #28423C;border-radius:6px;padding:4px 8px">' +
              '<option value="none">רגיל (ללא קצב מבוקר)</option>' +
              '<option value="3-1-1" selected>קצב מבוקר 3-1-1</option>' +
              '<option value="3-1-2">קצב איטי ומבוקר 3-1-2</option>' +
              '<option value="4-2-1">אקסצנטרי מודגש 4-2-1</option>' +
            '</select>' +
          '</label>' +
          '<button type="button" class="th-btn" id="startBtn" aria-label="התחל אימון במצב חי">התחל אימון</button>' +
          '<button type="button" class="th-btn ghost" id="startLiveWorkoutBtn" aria-label="התחל אימון חי">התחל אימון חי</button>' +
          '<button type="button" class="th-btn ghost" id="previewBtn" aria-label="פתח קישור אימון לתצוגת מתאמן">פתח כמתאמן</button>' +
          '<button type="button" class="th-btn ghost" id="copyBtn" aria-label="שתף אימון ללקוח">שתף אימון ללקוח</button>' +
          '<button type="button" class="th-btn ghost" id="shareWorkoutWhatsappBtn" aria-label="שתף אימון בוואטסאפ">שתף בוואטסאפ</button>' +
          '<button type="button" class="th-btn ghost" id="pdfBtn" aria-label="דף להדפסה או שמירה כ־PDF">דף להדפסה / PDF</button>' +
        '</div>' +
      '</article>';

    bindWorkoutActions(w);
    var warmupBlock = built.warmupBlock || (w && w.warmupBlock);
    if (!warmupBlock && typeof THWarmupGenerator !== 'undefined' && typeof THWarmupGenerator.generateTargetedWarmup === 'function') {
      warmupBlock = THWarmupGenerator.generateTargetedWarmup(w, built.request || {}, TH.catalogList());
    }
    var warmupEl = $('warmupSection');
    if (warmupEl && warmupBlock) {
      renderWarmupSection(warmupBlock, warmupEl);
    }

    var report = built.adaptationReport || (w && w.adaptationReport);
    if (!report && typeof THAdaptation !== 'undefined') {
      report = THAdaptation.buildAdaptationReport(built.request || {}, w);
    }
    if (report) {
      renderAdaptationCard(report, box);
    }
  }

  function renderWarmupSection(warmupBlock, container) {
    if (!warmupBlock || !container || typeof document.createElement !== 'function') return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const heading = document.createElement('h3');
    heading.className = 'warmup-heading';
    heading.textContent = 'חימום ממוקד ומוביליטי (' + (warmupBlock.duration_minutes || 6) + ' דקות)';
    container.appendChild(heading);

    if (warmupBlock.pacingGuidelines || warmupBlock.pacing) {
      const pacing = document.createElement('p');
      pacing.className = 'warmup-pacing';
      pacing.textContent = 'הנחיות קצב: ' + (warmupBlock.pacingGuidelines || warmupBlock.pacing);
      container.appendChild(pacing);
    }

    const list = document.createElement('ul');
    list.className = 'warmup-list';
    list.setAttribute('role', 'list');

    const exercises = Array.isArray(warmupBlock.exercises) ? warmupBlock.exercises : [];
    for (const ex of exercises) {
      const item = document.createElement('li');
      item.className = 'warmup-item';

      const label = document.createElement('label');
      label.className = 'warmup-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'warmup-checkbox';
      checkbox.setAttribute('aria-label', 'הושלם: ' + (ex.name || ex.id));

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          item.classList.add('completed');
        } else {
          item.classList.remove('completed');
        }
      });

      const textSpan = document.createElement('span');
      textSpan.className = 'warmup-text';
      let desc = ex.name || ex.id;
      if (ex.duration_seconds) {
        desc += ' (' + Math.round(ex.duration_seconds / 60) + ' דק׳)';
      }
      if (ex.instructions) {
        desc += ' · ' + ex.instructions;
      }
      textSpan.textContent = desc;

      label.appendChild(checkbox);
      label.appendChild(textSpan);
      item.appendChild(label);
      list.appendChild(item);
    }

    container.appendChild(list);
    container.removeAttribute('hidden');
  }

  function renderAdaptationCard(report, container) {
    if (!report || !container || typeof document.createElement !== 'function' || typeof container.appendChild !== 'function') return;

    const card = document.createElement('section');
    card.className = 'card adaptation-card';
    card.id = 'adaptationCard';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'התאמה להרכב הגוף וליכולת שלך');

    const heading = document.createElement('h2');
    heading.textContent = 'התאמה להרכב הגוף וליכולת שלך';
    card.appendChild(heading);

    const fieldMap = [
      { key: 'goal', label: 'מטרת התאמה' },
      { key: 'basedOn', label: 'מבוסס על' },
      { key: 'todayFocus', label: 'דגש להיום' },
      { key: 'personalAdaptation', label: 'התאמה אישית' },
      { key: 'howToProgress', label: 'איך להתקדם' },
      { key: 'howToMeasure', label: 'איך למדוד' },
      { key: 'promiseLimits', label: 'גבולות הבטחה' },
      { key: 'whenToStop', label: 'מתי לעצור' }
    ];

    const list = document.createElement('div');
    list.className = 'adaptation-fields';

    const tpl = report.template || report;
    for (const item of fieldMap) {
      const val = tpl[item.key] || report[item.key] || 'לא ידוע';
      const row = document.createElement('p');
      row.className = 'adaptation-row';
      row.setAttribute('data-field', item.key);

      const strong = document.createElement('strong');
      strong.textContent = `${item.label}: `;
      row.appendChild(strong);

      const span = document.createElement('span');
      span.textContent = val;
      row.appendChild(span);

      list.appendChild(row);
    }
    card.appendChild(list);

    const budget = report.weeklyVolumeBudget || report.volumeBudget;
    if (budget) {
      const budgetSection = document.createElement('div');
      budgetSection.className = 'volume-budget-section';

      const budgetHeading = document.createElement('h3');
      budgetHeading.textContent = 'אומדן נפח שבועי מול עוגן 10 סטים';
      budgetSection.appendChild(budgetHeading);

      const budgetList = document.createElement('ul');
      budgetList.className = 'volume-budget-list';

      const musclesMap = [
        { id: 'chest', label: 'חזה' },
        { id: 'back', label: 'גב' },
        { id: 'legs', label: 'רגליים' },
        { id: 'shoulders', label: 'כתפיים' },
        { id: 'arms', label: 'זרועות' },
        { id: 'biceps', label: 'דו-ראשי' },
        { id: 'triceps', label: 'תלת-ראשי' },
        { id: 'core', label: 'ליבה ובטן' }
      ];

      const byMuscle = budget.byMuscle || budget.muscles || budget;
      for (const mInfo of musclesMap) {
        const mData = byMuscle[mInfo.id];
        if (!mData) continue;
        const direct = typeof mData.direct === 'number' ? mData.direct : 0;
        const indirect = typeof mData.indirect === 'number' ? mData.indirect : 0;
        const total = typeof mData.total === 'number' ? mData.total : direct + indirect;
        const anchor = typeof mData.anchor === 'number' ? mData.anchor : 10;
        const status = mData.status || (total >= anchor ? 'עמד ביעד' : 'בבנייה');

        const li = document.createElement('li');
        li.setAttribute('data-muscle', mInfo.id);
        li.textContent = `${mInfo.label}: ${direct} ישירים + ${indirect} עקיפים = ${total} סטים (עוגן שבועי: ${anchor}) — ${status}`;
        budgetList.appendChild(li);
      }
      budgetSection.appendChild(budgetList);
      card.appendChild(budgetSection);
    }

    container.appendChild(card);
  }

  function renderIngest(ingested) {
    var w = ingested.workout;
    var analysis = w.analysis || (typeof THAnalyzer !== 'undefined' ? THAnalyzer.analyzeSession(w) : null);
    var unmatched = ingested.unmatched || [];
    var wish = (ingested.wishlist || []).map((item) => '<li>' + TH.esc(item.he) + '</li>').join('');
    var notice = unmatched.length
      ? '<div class="card notice" role="status"><p>' +
        // One missing clip read «1 תרגילים בלי סרטון במאגר. הם מוצגים…».
        TH.esc(unmatched.length === 1
          ? 'תרגיל אחד בלי סרטון במאגר. הוא מוצג כטקסט ונוסף לרשימת «סרטונים שכדאי לצלם».'
          : unmatched.length + ' תרגילים בלי סרטון במאגר. הם מוצגים כטקסט ונוספו לרשימת «סרטונים שכדאי לצלם».') +
        '</p><ul class="flags">' + unmatched.map((n) => '<li>' + TH.esc(n) + '</li>').join('') + '</ul></div>'
      : '';
    render({
      workout: w,
      notice: null,
      explanation: analysis ? {
        type: 'אימון שנקלט מטקסט',
        durationMinutes: analysis.durationMinutes,
        primary: analysis.primary,
        secondary: analysis.secondary,
        stimulus: analysis.stimulus,
        flags: analysis.flags,
        reasons: []
      } : { type: 'אימון שנקלט מטקסט', primary: [], secondary: [], stimulus: {}, flags: [], reasons: [] }
    });
    if (notice) $('result').insertAdjacentHTML('afterbegin', notice);
    if (wish) {
      $('result').insertAdjacentHTML('beforeend',
        '<div class="card"><h2>סרטונים שכדאי לצלם</h2><ul class="flags">' + wish +
        '</ul><p class="honest"><a href="./manage.html">ניהול מאגר</a> — הוספת סרטון בלי לגעת בקוד.</p></div>');
    }
  }

  // run() reads the duration and head count from the fields, so a typed
  // «אימון רגליים 45 דקות ל-12 חניכים» used to build 20 minutes for one
  // trainee. When the text names a length or a head count, the field follows
  // it; a field the text does not name keeps whatever the coach set.
  function syncFieldsFromPrompt() {
    var text = $('prompt').value.trim();
    if (!text) return;
    var parsed = THPrompt.parsePrompt(text);
    if (parsed.durationSpecified) $('durationInput').value = Math.max(5, Math.min(180, parsed.duration));
    if (parsed.participantsSpecified) $('participantsInput').value = Math.max(1, Math.min(500, parsed.participants));
    if (parsed.goal && $('goalSelect')) {
      if (parsed.goal === 'strength' || /כוח/.test(text)) $('goalSelect').value = 'כוח ותפקוד';
      else if (/שימור|שומן|חיטוב/.test(text)) $('goalSelect').value = 'שימור שריר בירידה בשומן';
      else if (/שריר|מסה|היפרטרופיה/.test(text)) $('goalSelect').value = 'בניית שריר';
    }
    if ($('muscleSelect')) {
      if (/דחיפה|חזה|כתפיים|שכיבות סמיכה|מקבילים/.test(text)) $('muscleSelect').value = 'push';
      else if (/משיכה|גב|מתח|חתירה/.test(text)) $('muscleSelect').value = 'pull';
      else if (/רגליים|סקוואט|מכרעים|לאנג'|דדליפט/.test(text)) $('muscleSelect').value = 'legs';
      else if (/בטן|ליבה|פלאנק|קראנץ/.test(text)) $('muscleSelect').value = 'core';
    }
  }

  function run(e) {
    if (e) e.preventDefault();
    var text = $('prompt').value.trim();
    var req = THPrompt.parsePrompt(text || 'אימון גוף מלא');
    req.duration = Math.max(5, Math.min(180, Number($('durationInput').value) || 20));
    req.durationSpecified = true;
    req.participants = Math.max(1, Math.min(500, Math.floor(Number($('participantsInput').value) || 1)));
    req.participantsSpecified = true;
    var equipment = $('equipmentInput').value;
    if (equipment !== 'auto') req.equipment = [equipment];
    var goalVal = $('goalSelect') ? $('goalSelect').value : null;
    if (goalVal) req.goal = goalVal;
    render(THEngine.buildSession(req, null, { useSupersets: supersetEnabled }));
  }

  function currentDriveId() {
    var sel = $('segSource').value;
    var entry;
    if (sel) {
      entry = TH.catalog[sel];
      return (entry && entry.driveId) || '';
    }
    return THInfer.parseDriveId($('segUrl').value.trim()) || '';
  }

  function showSegPlayer() {
    var id = currentDriveId();
    var box = $('segPlayer');
    if (!id) {
      box.hidden = true;
      box.innerHTML = '';
      $('segStatus').textContent = 'בחרו סרטון מהמאגר או הדביקו מזהה דרייב.';
      return;
    }
    box.hidden = false;
    box.innerHTML = TH.mediaMarkup({ he: 'סרטון לפיצול', driveId: id, source: 'drive' }, { className: 'ex-media', eager: true });
  }

  function elapsedSec() {
    if (!trackStartedAt) return 0;
    return Math.max(0, Math.round((Date.now() - trackStartedAt) / 1000));
  }

  function fillSegSelect() {
    var sel = $('segSource');
    var opts = ['<option value="">בחרו סרטון מהמאגר…</option>'];
    TH.catalogList().filter((e) => e.driveId && e.startSec == null).forEach((e) => {
      opts.push('<option value="' + TH.esc(e.id) + '">' + TH.esc(e.he) + (e.folder ? ' · ' + TH.esc(e.folder) : '') + '</option>');
    });
    sel.innerHTML = opts.join('');
  }

  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.id.replace('tab-', ''));
    });
    tab.addEventListener('keydown', (e) => {
      var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
      var i = tabs.indexOf(tab);
      var next = -1;
      if (e.key === 'ArrowLeft') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowRight') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      tabs[next].focus();
      switchTab(tabs[next].id.replace('tab-', ''));
    });
  });

  function applyBalancedFocus() {
    var MB = window.THMuscleBalance;
    if (!MB) return;
    var sessions = [];
    var JS = window.THJournalStorage || window.JournalStorage;
    if (JS && typeof JS.listEntries === 'function') {
      sessions = JS.listEntries();
    }
    var balance = MB.computeMuscleGroupBalance(sessions);
    var recommendation = MB.suggestNextFocus(balance);
    var focusGroup = recommendation.group || recommendation.focus || 'all';

    var sel = $('muscleSelect');
    if (sel) {
      sel.value = focusGroup;
      sel.dispatchEvent(new Event('change'));
    }

    var promptEl = $('prompt');
    if (promptEl) {
      var promptText = recommendation.suggestedPrompt || ('אימון ' + (recommendation.shortLabel || focusGroup) + ' 20 דקות');
      promptEl.value = promptText;
      syncFieldsFromPrompt();
    }

    var statusEl = $('balancedFocusStatus');
    if (statusEl) {
      statusEl.textContent = 'הוחל מיקוד מומלץ: ' + (recommendation.shortLabel || focusGroup) + ' (' + (recommendation.reason || '') + ')';
    }
  }

  if ($('applyBalancedFocusBtn')) {
    $('applyBalancedFocusBtn').addEventListener('click', applyBalancedFocus);
  }

  var supersetEnabled = false;
  if ($('supersetModeBtn')) {
    $('supersetModeBtn').addEventListener('click', () => {
      supersetEnabled = !supersetEnabled;
      var btn = $('supersetModeBtn');
      var out = $('supersetPairsOut');
      if (btn) {
        btn.style.background = supersetEnabled ? 'var(--th-teal-soft)' : '';
        btn.style.color = supersetEnabled ? 'var(--th-teal-ink)' : '';
      }
      if (out) {
        out.textContent = supersetEnabled ? 'מצב סופר-סטים מופעל (ישולבו זוגות שרירים אנטגוניסטיים)' : 'מצב סופר-סטים כבוי';
      }
      run();
    });
  }

  $('prompt').addEventListener('input', syncFieldsFromPrompt);
  $('form').addEventListener('submit', run);
  document.querySelectorAll('[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab('prompt');
      var example = btn.getAttribute('data-fill');
      var parsed = THPrompt.parsePrompt(example);
      $('prompt').value = example;
      // The example stands on its own: every field follows the example text, so a
      // group request typed a moment ago (18 חניכים, קונוסים) does not leak into
      // «אימון בטן 20 דקות בלי ציוד». Fields the example does not name go back to
      // the parser defaults (20 דקות, מתאמן אחד, ציוד לפי הבקשה).
      $('durationInput').value = parsed.duration;
      $('participantsInput').value = parsed.participants;
      $('equipmentInput').value = equipmentOption(parsed.equipment);
      $('prompt').focus();
      run();
    });
  });

  $('ingestForm').addEventListener('submit', (e) => {
    e.preventDefault();
    var text = $('ingestText').value.trim();
    if (!text) {
      $('result').innerHTML = '<p class="empty" role="status">הדביקו אימון — למשל «3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה».</p>';
      return;
    }
    renderIngest(THIngest.ingestText(text));
  });

  $('segWatch').addEventListener('click', showSegPlayer);
  $('segTrack').addEventListener('click', () => {
    trackStartedAt = Date.now();
    $('segStatus').textContent = 'מעקב רץ. סמנו התחלה וסוף לפי מה שאתם רואים בנגן.';
  });
  $('segMarkStart').addEventListener('click', () => {
    if (!trackStartedAt) trackStartedAt = Date.now();
    $('segStart').value = elapsedSec();
    $('segStatus').textContent = 'התחלה ב־' + $('segStart').value + ' שנ׳';
  });
  $('segMarkEnd').addEventListener('click', () => {
    if (!trackStartedAt) trackStartedAt = Date.now();
    $('segEnd').value = Math.max(Number($('segStart').value || 0) + 1, elapsedSec());
    $('segStatus').textContent = 'סוף ב־' + $('segEnd').value + ' שנ׳';
  });
  $('segForm').addEventListener('submit', (e) => {
    e.preventDefault();
    var saved = THIngest.saveSegment({
      driveId: currentDriveId(),
      url: $('segUrl').value.trim(),
      he: $('segName').value.trim(),
      startSec: $('segStart').value,
      endSec: $('segEnd').value,
      segmentOf: $('segSource').value || ''
    });
    if (saved.error) {
      $('segStatus').textContent = saved.message;
      return;
    }
    $('segStatus').textContent = 'נשמר מקטע «' + saved.entry.he + '» במאגר המקומי. אפשר לייצא מניהול מאגר.';
    $('segName').value = '';
  });

  function checkSharedCoachPlan() {
    if (typeof window === 'undefined' || !window.location || !window.location.search) {
      return;
    }
    var codec = window.THPlanLinkCodec || (window.TH && window.TH.PlanLinkCodec);
    if (!codec || typeof codec.decodePlanFromQuery !== 'function') {
      return;
    }
    var plan = codec.decodePlanFromQuery(window.location.search);
    if (!plan) {
      return;
    }
    var banner = $('sharedCoachPlanBanner');
    if (banner) {
      banner.style.display = 'block';
      banner.textContent = 'נטענה תוכנית ממאמן';
    }
    if (window.TH && window.TH.store) {
      TH.store.set(TH.KEYS.active, plan);
    }
    render({
      workout: plan,
      notice: 'נטענה תוכנית ממאמן'
    });
  }

  function renderCustomTemplates() {
    var host = $('customTemplatesList');
    if (!host) return;
    host.textContent = '';
    var CT = typeof CustomTemplates !== 'undefined' ? CustomTemplates : (typeof window !== 'undefined' ? window.CustomTemplates : null);
    var list = (CT && typeof CT.listCustomTemplates === 'function') ? CT.listCustomTemplates() : [];
    if (!list.length) {
      if (typeof document.createElement === 'function') {
        var p = document.createElement('p');
        p.className = 'field-help';
        p.textContent = 'אין תבניות אישיות שמורות עדיין.';
        host.appendChild(p);
      }
      return;
    }
    if (typeof document.createElement !== 'function') return;
    var ul = document.createElement('ul');
    ul.className = 'saved-list';

    list.forEach(function (tpl) {
      var li = document.createElement('li');
      li.className = 'saved-item';

      var info = document.createElement('span');
      var b = document.createElement('strong');
      b.textContent = tpl.name;
      info.appendChild(b);

      var actions = document.createElement('span');
      actions.className = 'icon-row';

      var loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'th-btn ghost';
      loadBtn.textContent = 'טען לבונה';
      loadBtn.setAttribute('aria-label', 'טען לבונה: ' + tpl.name);
      loadBtn.addEventListener('click', function () {
        var w = tpl.workout;
        if (!w) return;
        var planToRender = w.phases ? w : {
          title: tpl.name,
          phases: [{ name: 'Main', exercises: Array.isArray(w.exercises) ? w.exercises : [] }]
        };
        activeBuiltWorkout = planToRender;
        if (window.TH && window.TH.store) {
          TH.store.set(TH.KEYS.active, planToRender);
        }
        render({
          workout: planToRender,
          notice: 'נטענה תבנית אישית: ' + tpl.name,
          explanation: {
            type: 'תבנית אישית שמורה',
            primary: [],
            secondary: [],
            stimulus: {},
            flags: [],
            reasons: []
          }
        });
        var status = $('customTemplatesStatus');
        if (status) status.textContent = 'נטענה תבנית «' + tpl.name + '» לבונה האימון.';
      });
      actions.appendChild(loadBtn);

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'th-btn ghost';
      delBtn.textContent = 'מחק';
      delBtn.setAttribute('aria-label', 'מחק: ' + tpl.name);
      delBtn.addEventListener('click', function () {
        if (CT && typeof CT.deleteCustomTemplate === 'function') {
          CT.deleteCustomTemplate(tpl.id);
        }
        renderCustomTemplates();
        var status = $('customTemplatesStatus');
        if (status) status.textContent = 'התבנית «' + tpl.name + '» נמחקה.';
      });
      actions.appendChild(delBtn);

      li.appendChild(info);
      li.appendChild(actions);
      ul.appendChild(li);
    });

    host.appendChild(ul);
  }

  function initCustomTemplates() {
    var saveBtn = $('saveTemplateBtn');
    if (saveBtn && saveBtn.addEventListener) {
      saveBtn.addEventListener('click', function () {
        var w = activeBuiltWorkout;
        var promptVal = $('prompt') ? $('prompt').value.trim() : '';
        var name = (w && w.title && w.title !== 'לא הצלחנו לבנות אימון.') ? w.title : (promptVal || 'תבנית אישית');
        if (!w) {
          w = {
            title: name,
            phases: [{ name: 'Main', exercises: [] }]
          };
        }
        var CT = typeof CustomTemplates !== 'undefined' ? CustomTemplates : (typeof window !== 'undefined' ? window.CustomTemplates : null);
        if (CT && typeof CT.saveCustomTemplate === 'function') {
          var saved = CT.saveCustomTemplate(name, w);
          if (saved) {
            renderCustomTemplates();
            var status = $('customTemplatesStatus');
            if (status) status.textContent = '«' + name + '» נשמר בהצלחה כתבנית אישית.';
          }
        }
      });
    }
    renderCustomTemplates();
  }

  TH.ready(() => {
    fillSegSelect();
    checkSharedCoachPlan();
    initCustomTemplates();
    if ($('prompt').value.trim()) {
      syncFieldsFromPrompt();
      run();
    }
  });

  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        const showUpdateNotice = () => {
          const banner = document.getElementById('pwa-update-notice');
          if (banner) banner.style.display = 'block';
        };

        if (reg.waiting) {
          showUpdateNotice();
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotice();
            }
          });
        });

        const refreshBtn = document.getElementById('pwa-refresh-btn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
          });
        }
      }).catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
})();
