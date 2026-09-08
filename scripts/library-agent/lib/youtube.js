'use strict';
// Library-gap agent — candidate search on YouTube through the official Data API v3 (an authorised
// interface; no scraping). The key lives in GitHub Secrets / the environment, never in browser code.
//
// Cost control: a hard budget of searches per run, a per-query cache with a 7-day TTL, and only two API
// calls per gap (search.list + videos.list). Provider failures are recorded as statuses, never thrown:
//   not-configured    no API key -> nothing is searched, the run still completes
//   budget-exhausted  the per-run budget is spent
//   quota-exceeded    the API answered 403 quotaExceeded -> stop searching for this run
//   provider-failed   any other HTTP/network error (retried once for 5xx)
// Only public, embeddable videos are returned. Nothing here claims to have watched a video.
const API = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;

function parseDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ''));
  if (!m) return null;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

async function getJson(fetchImpl, url, attempt = 0) {
  let res;
  try {
    res = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch (err) {
    return { status: 'provider-failed', error: 'network: ' + (err && err.message ? err.message : String(err)) };
  }
  if (res.status >= 500 && attempt === 0) {
    await new Promise((r) => setTimeout(r, 1500));
    return getJson(fetchImpl, url, 1);
  }
  let body = null;
  try { body = await res.json(); } catch (err) { body = null; }
  if (!res.ok) {
    const reason = body && body.error && Array.isArray(body.error.errors) && body.error.errors[0]
      ? body.error.errors[0].reason : '';
    if (res.status === 403 && /quota/i.test(reason || '')) return { status: 'quota-exceeded', error: reason };
    return { status: 'provider-failed', error: res.status + ' ' + (reason || (body && body.error && body.error.message) || '') };
  }
  return { status: 'ok', body };
}

function mapVideo(item) {
  const sn = item.snippet || {};
  const cd = item.contentDetails || {};
  const st = item.status || {};
  return {
    youtubeId: item.id,
    url: 'https://www.youtube.com/watch?v=' + item.id,
    title: String(sn.title || '').slice(0, 200),
    channelTitle: String(sn.channelTitle || '').slice(0, 120),
    channelId: String(sn.channelId || ''),
    publishedAt: String(sn.publishedAt || ''),
    durationSec: parseDuration(cd.duration),
    embeddable: st.embeddable === true,
    privacyStatus: String(st.privacyStatus || ''),
    license: String(st.license || ''),
    hasCaptions: String(cd.caption || '') === 'true',
    descriptionSnippet: String(sn.description || '').replace(/\s+/g, ' ').trim().slice(0, 300),
  };
}

// budget: { maxSearches, used }   cache: { [query]: { at, items } }   returns { status, items, fromCache? }
async function searchCandidates(gap, opts = {}) {
  const { apiKey, fetchImpl, budget = { maxSearches: 5, used: 0 }, cache = {}, maxResults = 5, now = Date.now() } = opts;
  const query = String(gap && gap.query ? gap.query : '').trim();
  if (!query) return { status: 'no-query', items: [] };
  const cached = cache[query];
  if (cached && (now - Number(cached.at || 0)) < CACHE_TTL_MS && Array.isArray(cached.items)) {
    return { status: 'cached', items: cached.items, fromCache: true };
  }
  if (!apiKey) return { status: 'not-configured', items: [] };
  if (!fetchImpl) return { status: 'provider-failed', items: [], error: 'no fetch implementation' };
  if (budget.used >= budget.maxSearches) return { status: 'budget-exhausted', items: [] };
  budget.used += 1;

  const q = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: String(Math.max(1, Math.min(maxResults, 10))), q: query,
    relevanceLanguage: 'he', safeSearch: 'strict', videoEmbeddable: 'true', key: apiKey,
  });
  const search = await getJson(fetchImpl, API + '/search?' + q.toString());
  if (search.status !== 'ok') return { status: search.status, items: [], error: search.error };
  const ids = ((search.body && search.body.items) || [])
    .map((it) => it && it.id && it.id.videoId).filter(Boolean);
  if (!ids.length) {
    cache[query] = { at: now, items: [] };
    return { status: 'ok', items: [] };
  }
  const v = new URLSearchParams({ part: 'snippet,contentDetails,status', id: ids.join(','), key: apiKey });
  const videos = await getJson(fetchImpl, API + '/videos?' + v.toString());
  if (videos.status !== 'ok') return { status: videos.status, items: [], error: videos.error };
  const items = ((videos.body && videos.body.items) || []).map(mapVideo)
    .filter((it) => it.privacyStatus === 'public' && it.embeddable);
  cache[query] = { at: now, items };
  return { status: 'ok', items };
}

module.exports = { searchCandidates, parseDuration, mapVideo, CACHE_TTL_MS };
