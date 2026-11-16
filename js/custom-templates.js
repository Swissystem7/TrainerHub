((root, factory) => {
  const exp = factory();
  if (root) {
    root.CustomTemplates = exp;
    root.saveCustomTemplate = exp.saveCustomTemplate;
    root.listCustomTemplates = exp.listCustomTemplates;
    root.deleteCustomTemplate = exp.deleteCustomTemplate;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = exp;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const STORAGE_KEY = 'trainerhub_custom_templates';

  function resolveStorage(storage) {
    if (storage) return storage;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (_err) {}
    return null;
  }

  function getRaw(storage, key) {
    if (!storage || typeof storage.getItem !== 'function') return null;
    try {
      return storage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function setRaw(storage, key, value) {
    if (!storage || typeof storage.setItem !== 'function') {
      throw new Error('Storage not available');
    }
    storage.setItem(key, value);
  }

  function listCustomTemplates(storage) {
    const s = resolveStorage(storage);
    if (!s) return [];
    try {
      const raw = getRaw(s, STORAGE_KEY);
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function saveCustomTemplate(name, workout, storage) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return null;
    }
    const s = resolveStorage(storage);
    if (!s) return null;

    const trimmedName = name.trim();
    const now = new Date().toISOString();
    const tplId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      let workoutCopy;
      if (workout && typeof workout === 'object') {
        workoutCopy = JSON.parse(JSON.stringify(workout));
      } else {
        workoutCopy = { title: trimmedName, exercises: [] };
      }
      const template = {
        id: tplId,
        name: trimmedName,
        workout: workoutCopy,
        createdAt: now,
        updatedAt: now
      };
      const list = listCustomTemplates(s);
      let existingIdx = -1;
      if (workoutCopy?.id) {
        existingIdx = list.findIndex((item) => item && item.id === workoutCopy.id);
      }
      if (existingIdx >= 0) {
        template.id = list[existingIdx].id;
        template.createdAt = list[existingIdx].createdAt || now;
        list[existingIdx] = template;
      } else {
        list.unshift(template);
      }
      setRaw(s, STORAGE_KEY, JSON.stringify(list));
      return template;
    } catch (_err) {
      return null;
    }
  }

  function deleteCustomTemplate(templateId, storage) {
    if (!templateId) return false;
    const s = resolveStorage(storage);
    if (!s) return false;

    try {
      const list = listCustomTemplates(s);
      const targetId = String(templateId);
      const filtered = list.filter((item) => item && String(item.id) !== targetId);
      if (filtered.length === list.length) {
        return false;
      }
      setRaw(s, STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (_err) {
      return false;
    }
  }

  return {
    STORAGE_KEY,
    saveCustomTemplate,
    listCustomTemplates,
    deleteCustomTemplate
  };
});
