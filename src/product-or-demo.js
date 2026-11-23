var PROJECT_PURPOSE = 'בונה תוכניות אימון שבועיות למאמנים אישיים — במקום אקסל — עם ספריית וידאו';

function projectPurpose() {
  return PROJECT_PURPOSE;
}

function classifyProductOrDemo(customEntitlement) {
  var ent = customEntitlement;
  if (!ent && typeof window !== 'undefined' && window.TH && typeof window.TH.entitlement === 'function') {
    try {
      ent = window.TH.entitlement();
    } catch (_) {
      ent = null;
    }
  }
  var isTrainer = !!(ent && ent.tier === 'trainer');
  return {
    purpose: PROJECT_PURPOSE,
    isProduct: isTrainer,
    isDemo: !isTrainer,
    kind: isTrainer ? 'product' : 'demo',
    label: isTrainer ? 'מוצר' : 'הדגמה',
    verdict: 'PARK',
    hasServer: false,
    noPaymentGate: true,
    statusText: isTrainer
      ? 'מוצר — גרסת מאמן פעילה במכשיר (שיתוף אימונים והדפסה ממותגת ללא שרת)'
      : 'הדגמה — בונה אימונים מקומי בדפדפן (ללא שרת ענן וללא סליקה)',
    capabilities: [
      { id: 'builder', label: 'בונה אימונים שבועי בדפדפן', available: true },
      { id: 'library', label: 'ספריית תרגילים וסרטונים בעברית', available: true },
      { id: 'journal', label: 'יומן ביצוע ומדידות מקומי', available: true },
      { id: 'share', label: 'שיתוף קישורי אימון ללקוח (ללא שרת)', available: isTrainer },
      { id: 'brand_pdf', label: 'הדפסה ממותגת וייצוא דף אימון', available: isTrainer },
      { id: 'cloud_sync', label: 'סנכרון ענן ומסד נתונים מרוחק', available: false },
      { id: 'payment_gate', label: 'סליקה ותשלומים באתר', available: false }
    ]
  };
}

function renderProductStatus(container, customEntitlement) {
  if (!container || typeof container.appendChild !== 'function') {
    return false;
  }
  var info = classifyProductOrDemo(customEntitlement);
  var i;
  var cap;
  var li;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  if (typeof document === 'undefined') {
    return true;
  }
  var badge = document.createElement('span');
  badge.className = `status-badge ${info.kind}`;
  badge.textContent = info.label;
  container.appendChild(badge);

  var desc = document.createElement('p');
  desc.className = 'status-desc';
  desc.textContent = info.statusText;
  container.appendChild(desc);

  var list = document.createElement('ul');
  list.className = 'status-capabilities';
  for (i = 0; i < info.capabilities.length; i++) {
    cap = info.capabilities[i];
    li = document.createElement('li');
    li.textContent = `${cap.available ? '✔ ' : '✖ '}${cap.label}`;
    list.appendChild(li);
  }
  container.appendChild(list);
  return true;
}

var exported = {
  PROJECT_PURPOSE: PROJECT_PURPOSE,
  projectPurpose: projectPurpose,
  classifyProductOrDemo: classifyProductOrDemo,
  renderProductStatus: renderProductStatus
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.THProductOrDemo = exported;
}
