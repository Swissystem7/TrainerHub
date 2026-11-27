((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.LiveMediaPanel = api;
    root.THLiveMediaPanel = api;
    if (root.TH && typeof root.TH === 'object') {
      root.TH.LiveMediaPanel = api;
      root.TH.resolveExerciseMedia = api.resolveExerciseMedia;
      root.TH.renderMediaPanel = api.renderMediaPanel;
    }
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const DEFAULT_FALLBACK_POSTER = 'assets/posters/fallback.jpg';

  function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;

    if (/^javascript\s*:/i.test(trimmed)) return false;
    if (/^data\s*:/i.test(trimmed)) return false;
    if (/^vbscript\s*:/i.test(trimmed)) return false;
    if (/^file\s*:/i.test(trimmed)) return false;

    if (
      /instagram\.com|youtube\.com|youtu\.be|ytimg\.com|facebook\.com|tiktok\.com|drive\.google\.com|googlevideo\.com/i.test(
        trimmed
      )
    ) {
      return false;
    }

    if (/^https:\/\/[^\s"'<>]+$/i.test(trimmed)) return true;

    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;

    if (/^\/\//.test(trimmed)) return false;

    if (/(^|\/)\.\.(\/|$)/.test(trimmed)) return false;

    if (/^[a-zA-Z0-9_.\-/]+(?:\?[a-zA-Z0-9_.=&%-]*)?(?:#[a-zA-Z0-9_%-]*)?$/.test(trimmed)) {
      return true;
    }

    return false;
  }

  function resolveExerciseMedia(exercise, reelCatalog) {
    let exObj = {};
    if (typeof exercise === 'string') {
      exObj = { id: exercise, name: exercise };
    } else if (exercise && typeof exercise === 'object') {
      exObj = exercise;
    }

    const targetId = String(exObj.id || exObj.exerciseId || exObj.file_id || exObj.fileId || '').trim();
    const targetName = String(exObj.name_he || exObj.he || exObj.name || exObj.title || '').trim();

    let catalogList = [];
    if (Array.isArray(reelCatalog)) {
      catalogList = reelCatalog;
    } else if (reelCatalog && Array.isArray(reelCatalog.exercises)) {
      catalogList = reelCatalog.exercises;
    } else if (reelCatalog && typeof reelCatalog === 'object') {
      const keys = Object.keys(reelCatalog);
      for (let k = 0; k < keys.length; k++) {
        const val = reelCatalog[keys[k]];
        if (val && typeof val === 'object') catalogList.push(val);
      }
    }

    let matched = null;
    if (targetId && catalogList.length > 0) {
      for (let i = 0; i < catalogList.length; i++) {
        const item = catalogList[i];
        if (!item) continue;
        const itemId = String(item.id || item.file_id || item.fileId || '').trim();
        if (
          itemId &&
          (itemId === targetId ||
            `drive-${itemId}` === targetId ||
            itemId === `drive-${targetId}` ||
            `ig-${itemId}` === targetId ||
            itemId === `ig-${targetId}`)
        ) {
          matched = item;
          break;
        }
      }
    }

    if (!matched && targetName && catalogList.length > 0) {
      for (let j = 0; j < catalogList.length; j++) {
        const it = catalogList[j];
        if (!it) continue;
        const itNameHe = it.name_he ? String(it.name_he).trim() : it.he ? String(it.he).trim() : '';
        const itName = it.name ? String(it.name).trim() : '';
        const itTitle = it.source_title ? String(it.source_title).trim() : it.title ? String(it.title).trim() : '';
        if (
          (itNameHe && itNameHe === targetName) ||
          (itName && itName === targetName) ||
          (itNameHe && targetName && (itNameHe.includes(targetName) || targetName.includes(itNameHe))) ||
          (itTitle && targetName && (itTitle.includes(targetName) || targetName.includes(itTitle)))
        ) {
          matched = it;
          break;
        }
      }
    }

    let rawVideoUrl = '';
    if (matched) {
      rawVideoUrl =
        matched.source_url || matched.preview_url || matched.video_url || matched.videoUrl || matched.file || '';
    }
    if (!rawVideoUrl) {
      rawVideoUrl = exObj.videoUrl || exObj.video_url || exObj.source_url || exObj.preview_url || exObj.file || '';
    }
    // Prefer a TrainerHub-owned MP4. Drop Instagram, YouTube, and Drive links.
    const host = typeof globalThis !== 'undefined' ? globalThis : null;
    if (host && host.TH && typeof host.TH.findExercise === 'function' && typeof host.TH.mediaMarkup === 'function') {
      try {
        const entry = host.TH.findExercise({ id: targetId, name: targetName });
        if (entry) {
          const html = root.TH.mediaMarkup(entry, { className: 'ex-media', eager: true });
          const owned = /src="(https:\/\/[^"]+\.mp4)/.exec(html || '');
          if (owned) rawVideoUrl = owned[1];
          else if (
            entry.original ||
            entry.thirdParty ||
            entry.source === 'metaai' ||
            entry.source === 'youtube' ||
            entry.source === 'drive' ||
            entry.source === 'drive-reel'
          ) {
            rawVideoUrl = '';
          }
        }
      } catch (err) {}
    }

    let rawPoster = '';
    if (matched) {
      rawPoster = matched.poster || matched.poster_url || matched.posterUrl || '';
    }
    if (!rawPoster) {
      rawPoster = exObj.poster || exObj.poster_url || exObj.posterUrl || '';
    }

    const safeVideo = isSafeUrl(rawVideoUrl) ? String(rawVideoUrl).trim() : null;
    const safePoster = isSafeUrl(rawPoster) ? String(rawPoster).trim() : null;

    let finalPoster = safePoster;
    let isFallbackPoster = false;
    if (!finalPoster || !safeVideo) {
      if (!finalPoster) {
        finalPoster = DEFAULT_FALLBACK_POSTER;
      }
      isFallbackPoster = true;
    }

    let cues = [];
    if (matched) {
      if (Array.isArray(matched.steps_he) && matched.steps_he.length > 0) {
        cues = matched.steps_he.slice();
      } else if (Array.isArray(matched.techniqueCues) && matched.techniqueCues.length > 0) {
        cues = matched.techniqueCues.slice();
      } else if (typeof matched.source_notes === 'string' && matched.source_notes.trim()) {
        cues = [matched.source_notes.trim()];
      }
    }
    if (!cues.length) {
      if (Array.isArray(exObj.steps_he) && exObj.steps_he.length > 0) {
        cues = exObj.steps_he.slice();
      } else if (Array.isArray(exObj.techniqueCues) && exObj.techniqueCues.length > 0) {
        cues = exObj.techniqueCues.slice();
      } else if (Array.isArray(exObj.cues) && exObj.cues.length > 0) {
        cues = exObj.cues.slice();
      } else if (typeof exObj.notes === 'string' && exObj.notes.trim()) {
        cues = [exObj.notes.trim()];
      }
    }

    const safety = (matched && (matched.safety_he || matched.safety)) || exObj.safety_he || exObj.safety || null;
    const resolvedId = matched?.id || targetId || null;
    const resolvedName = (matched && (matched.name_he || matched.name)) || targetName || 'תרגיל ללא שם';

    return {
      id: resolvedId,
      name: resolvedName,
      name_he: resolvedName,
      title: resolvedName,
      videoUrl: safeVideo,
      source_url: safeVideo,
      hasVideo: Boolean(safeVideo),
      posterUrl: finalPoster,
      poster: finalPoster,
      isFallbackPoster: isFallbackPoster,
      techniqueCues: cues,
      cues: cues,
      steps_he: cues,
      safetyNotes: safety ? String(safety).trim() : null,
      safety_he: safety ? String(safety).trim() : null,
      muscleGroup: matched?.muscle_group || exObj.muscle_group || null
    };
  }

  function renderMediaPanel(container, mediaData) {
    if (!container || typeof container !== 'object') return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const posterWrap = document.createElement('div');
    posterWrap.className = 'live-media-poster-wrap';

    const posterImg = document.createElement('img');
    posterImg.className = 'live-media-poster';
    const rawPoster = (mediaData && (mediaData.posterUrl || mediaData.poster)) || DEFAULT_FALLBACK_POSTER;
    posterImg.src = isSafeUrl(rawPoster) ? rawPoster : DEFAULT_FALLBACK_POSTER;
    const altText = (mediaData && (mediaData.name || mediaData.name_he)) || 'הדגמת תרגיל';
    posterImg.alt = String(altText);
    posterWrap.appendChild(posterImg);
    container.appendChild(posterWrap);

    const btnWrap = document.createElement('div');
    btnWrap.className = 'live-media-action-wrap';

    const videoBtn = document.createElement('button');
    videoBtn.type = 'button';
    videoBtn.className = 'live-media-video-btn';

    const hasValidVideo = Boolean(mediaData?.videoUrl && isSafeUrl(mediaData.videoUrl));
    if (hasValidVideo) {
      videoBtn.textContent = 'צפייה בסרטון';
      videoBtn.setAttribute('data-url', mediaData.videoUrl);
      videoBtn.setAttribute('data-video-url', mediaData.videoUrl);
      videoBtn.href = mediaData.videoUrl;
      videoBtn.addEventListener('click', () => {
        if (typeof window !== 'undefined' && typeof window.open === 'function') {
          window.open(mediaData.videoUrl, '_blank', 'noopener,noreferrer');
        }
      });
    } else {
      videoBtn.disabled = true;
      videoBtn.setAttribute('aria-disabled', 'true');
      videoBtn.textContent = 'הסרטון יעלה בקרוב';
    }
    btnWrap.appendChild(videoBtn);
    container.appendChild(btnWrap);

    let cues = (mediaData && (mediaData.techniqueCues || mediaData.cues || mediaData.steps_he)) || [];
    if (typeof cues === 'string') {
      cues = [cues];
    }
    if (Array.isArray(cues) && cues.length > 0) {
      const cuesSection = document.createElement('div');
      cuesSection.className = 'live-media-cues';

      const heading = document.createElement('h4');
      heading.className = 'live-media-cues-title';
      heading.textContent = 'דגשי ביצוע:';
      cuesSection.appendChild(heading);

      const list = document.createElement('ul');
      list.className = 'live-media-cues-list';
      for (let i = 0; i < cues.length; i++) {
        const itemText = cues[i];
        if (itemText != null && String(itemText).trim()) {
          const li = document.createElement('li');
          li.className = 'live-media-cue-item';
          li.textContent = String(itemText);
          list.appendChild(li);
        }
      }
      cuesSection.appendChild(list);
      container.appendChild(cuesSection);
    }

    const safetyText = mediaData && (mediaData.safetyNotes || mediaData.safety_he || mediaData.safety);
    if (safetyText && String(safetyText).trim()) {
      const safetyEl = document.createElement('p');
      safetyEl.className = 'live-media-safety';
      safetyEl.textContent = `בטיחות: ${String(safetyText).trim()}`;
      container.appendChild(safetyEl);
    }
  }

  return {
    DEFAULT_FALLBACK_POSTER: DEFAULT_FALLBACK_POSTER,
    isSafeUrl: isSafeUrl,
    resolveExerciseMedia: resolveExerciseMedia,
    renderMediaPanel: renderMediaPanel
  };
});
