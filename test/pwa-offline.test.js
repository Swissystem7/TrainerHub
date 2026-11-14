const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const manifestPath = path.join(ROOT, "manifest.webmanifest");
const swPath = path.join(ROOT, "sw.js");
const indexPath = path.join(ROOT, "index.html");
const reservesPath = path.join(ROOT, "reserves.html");

const swCode = fs.readFileSync(swPath, "utf8");
const indexHtml = fs.readFileSync(indexPath, "utf8");
const reservesHtml = fs.readFileSync(reservesPath, "utf8");

function createSwSandbox(overrides = {}) {
	const listeners = {};
	const mockCacheStore = new Map();
	const deletedKeys = [];
	let skippedWaiting = false;
	let clientsClaimed = false;

	class MockResponse {
		constructor(body, init = {}) {
			this.body = body;
			this.status = init.status || 200;
			this.statusText = init.statusText || "OK";
			this.headers = init.headers || {};
			this.type = init.type || "basic";
		}
		clone() {
			return new MockResponse(this.body, {
				status: this.status,
				statusText: this.statusText,
				headers: this.headers,
				type: this.type,
			});
		}
	}

	const ResponseClass = overrides.Response || MockResponse;

	const mockCache = {
		addAll: async (assets) => {
			for (const asset of assets) {
				mockCacheStore.set(asset, new ResponseClass(`cached: ${asset}`));
			}
			return undefined;
		},
		match: async (req) => {
			const url = typeof req === "string" ? req : req.url;
			return mockCacheStore.get(url) || null;
		},
		put: async (req, res) => {
			const url = typeof req === "string" ? req : req.url;
			mockCacheStore.set(url, res);
		},
	};

	const caches = {
		_openedName: null,
		_keys: ["trainerhub-v1"],
		open: async (name) => {
			caches._openedName = name;
			return mockCache;
		},
		keys: async () => {
			return caches._keys;
		},
		delete: async (name) => {
			deletedKeys.push(name);
			return true;
		},
		match: async (req) => {
			const url = typeof req === "string" ? req : req.url;
			return mockCacheStore.get(url) || null;
		},
	};

	const self = {
		addEventListener: (type, fn) => {
			listeners[type] = fn;
		},
		skipWaiting: () => {
			skippedWaiting = true;
		},
		clients: {
			claim: async () => {
				clientsClaimed = true;
			},
		},
	};

	const sandbox = {
		self,
		caches,
		Response: ResponseClass,
		fetch: overrides.fetch || (async () => new ResponseClass("network ok")),
		console,
		Promise,
		Map,
		Array,
		Object,
		String,
		Boolean,
	};

	vm.createContext(sandbox);
	vm.runInContext(swCode, sandbox);

	return {
		sandbox,
		listeners,
		caches,
		mockCache,
		mockCacheStore,
		deletedKeys,
		getSkippedWaiting: () => skippedWaiting,
		getClientsClaimed: () => clientsClaimed,
	};
}

test("1) manifest.webmanifest is valid JSON with TrainerHub name and standalone display", () => {
	assert.ok(
		fs.existsSync(manifestPath),
		"manifest.webmanifest must exist on disk",
	);
	const raw = fs.readFileSync(manifestPath, "utf8");
	const manifest = JSON.parse(raw);

	assert.equal(
		manifest.name,
		"TrainerHub",
		"manifest name must be 'TrainerHub'",
	);
	assert.equal(
		manifest.display,
		"standalone",
		"manifest display must be 'standalone'",
	);
	assert.ok(
		manifest.start_url,
		"manifest must declare a start_url for installation",
	);
});

test("2) manifest.webmanifest declares RTL direction and Hebrew language", () => {
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	assert.equal(manifest.dir, "rtl", "manifest dir must be 'rtl'");
	assert.equal(manifest.lang, "he", "manifest lang must be 'he'");
});

test("3) sw.js defines required app shell assets for offline caching", () => {
	assert.ok(fs.existsSync(swPath), "sw.js must exist on disk");

	const requiredShellFiles = [
		"index.html",
		"reserves.html",
		"journal.html",
		"exercises.html",
		"js/core.js",
		"js/session-builder.js",
	];

	for (const file of requiredShellFiles) {
		assert.ok(
			swCode.includes(file),
			`sw.js must include ${file} in shell asset list`,
		);
		assert.ok(
			fs.existsSync(path.join(ROOT, file)),
			`Shell file ${file} must exist on disk`,
		);
	}
});

test("4) sw.js install event handler opens cache with caches.open and caches app shell", async () => {
	const harness = createSwSandbox();
	assert.ok(
		typeof harness.listeners.install === "function",
		"sw.js must register an 'install' listener",
	);

	let waitUntilPromise = null;
	const installEvent = {
		waitUntil: (p) => {
			waitUntilPromise = p;
		},
	};

	harness.listeners.install(installEvent);
	assert.ok(waitUntilPromise, "install event must call event.waitUntil");
	await waitUntilPromise;

	assert.ok(harness.caches._openedName, "caches.open must be invoked");
	assert.match(
		harness.caches._openedName,
		/trainerhub/i,
		"cache name should identify TrainerHub",
	);
	assert.ok(
		harness.mockCacheStore.size >= 6,
		"app shell files must be cached during install",
	);
	assert.ok(
		harness.getSkippedWaiting(),
		"install step should call self.skipWaiting()",
	);
});

test("5) sw.js activate event handler cleans up old cache versions", async () => {
	const harness = createSwSandbox();
	assert.ok(
		typeof harness.listeners.activate === "function",
		"sw.js must register an 'activate' listener",
	);

	harness.caches._keys = [
		"trainerhub-old-v0",
		"legacy-cache",
		harness.sandbox.CACHE_NAME || "trainerhub-v1",
	];

	let waitUntilPromise = null;
	const activateEvent = {
		waitUntil: (p) => {
			waitUntilPromise = p;
		},
	};

	harness.listeners.activate(activateEvent);
	assert.ok(waitUntilPromise, "activate event must call event.waitUntil");
	await waitUntilPromise;

	assert.ok(
		harness.deletedKeys.includes("trainerhub-old-v0"),
		"old cache trainerhub-old-v0 must be deleted",
	);
	assert.ok(
		harness.deletedKeys.includes("legacy-cache"),
		"legacy cache legacy-cache must be deleted",
	);
	assert.ok(
		!harness.deletedKeys.includes("trainerhub-v1"),
		"current cache must not be deleted",
	);
	assert.ok(harness.getClientsClaimed(), "activate step should claim clients");
});

test("6) sw.js fetch event responds from cache and provides offline fallback", async () => {
	const harness = createSwSandbox({
		fetch: async () => {
			throw new Error("Network unavailable (offline)");
		},
	});

	assert.ok(
		typeof harness.listeners.fetch === "function",
		"sw.js must register a 'fetch' listener",
	);

	// Pre-populate index.html in cache to test navigate fallback
	harness.mockCacheStore.set(
		"./index.html",
		new harness.sandbox.Response("<html>shell</html>"),
	);
	harness.mockCacheStore.set(
		"index.html",
		new harness.sandbox.Response("<html>shell</html>"),
	);

	let respondWithPromise = null;
	const fetchEventNavigate = {
		request: {
			method: "GET",
			mode: "navigate",
			url: "https://example.com/some-offline-page",
		},
		respondWith: (p) => {
			respondWithPromise = p;
		},
	};

	harness.listeners.fetch(fetchEventNavigate);
	assert.ok(respondWithPromise, "fetch event must call event.respondWith");
	const navResponse = await respondWithPromise;
	assert.ok(navResponse, "navigation while offline must return a fallback");

	// Test non-navigate offline request
	let nonNavPromise = null;
	const fetchEventOther = {
		request: {
			method: "GET",
			mode: "cors",
			url: "https://example.com/api/data",
		},
		respondWith: (p) => {
			nonNavPromise = p;
		},
	};
	harness.listeners.fetch(fetchEventOther);
	const otherResponse = await nonNavPromise;
	assert.ok(otherResponse, "non-navigation offline request returns fallback");
	assert.equal(otherResponse.status, 503, "offline fallback status is 503");
});

test("7) index.html and reserves.html link manifest.webmanifest in <head>", () => {
	const manifestLinkPattern =
		/<link\b[^>]*\brel=["']manifest["'][^>]*\bhref=["'](?:\.\/)?manifest\.webmanifest["']/i;

	const indexHeadMatch = indexHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	assert.ok(indexHeadMatch, "index.html must have a <head> element");
	assert.match(
		indexHeadMatch[1],
		manifestLinkPattern,
		"index.html must link manifest.webmanifest in <head>",
	);

	const reservesHeadMatch = reservesHtml.match(
		/<head[^>]*>([\s\S]*?)<\/head>/i,
	);
	assert.ok(reservesHeadMatch, "reserves.html must have a <head> element");
	assert.match(
		reservesHeadMatch[1],
		manifestLinkPattern,
		"reserves.html must link manifest.webmanifest in <head>",
	);
});

test("8) index.html safely registers sw.js and renders new version update notice", () => {
	assert.match(
		indexHtml,
		/navigator\.serviceWorker\.register\s*\(\s*['"](?:\.\/)?sw\.js['"]\s*\)/,
		"index.html must register sw.js",
	);
	assert.match(
		indexHtml,
		/id=["']pwa-update-notice["']/,
		"index.html must contain pwa-update-notice banner element",
	);
	assert.match(
		indexHtml,
		/role=["']alert["']/,
		"update notice banner must have role='alert' for accessibility",
	);
	assert.match(
		indexHtml,
		/גרסה חדשה זמינה/,
		"update banner must state 'גרסה חדשה זמינה'",
	);
	assert.match(
		indexHtml,
		/updatefound/,
		"index.html must listen for updatefound event to detect new versions",
	);
});

test("9) reserves.html safely registers sw.js and renders new version update notice", () => {
	assert.match(
		reservesHtml,
		/navigator\.serviceWorker\.register\s*\(\s*['"](?:\.\/)?sw\.js['"]\s*\)/,
		"reserves.html must register sw.js",
	);
	assert.match(
		reservesHtml,
		/id=["']pwa-update-notice["']/,
		"reserves.html must contain pwa-update-notice banner element",
	);
	assert.match(
		reservesHtml,
		/role=["']alert["']/,
		"update notice banner must have role='alert' for accessibility",
	);
	assert.match(
		reservesHtml,
		/גרסה חדשה זמינה/,
		"update banner must state 'גרסה חדשה זמינה'",
	);
	assert.match(
		reservesHtml,
		/updatefound/,
		"reserves.html must listen for updatefound event to detect new versions",
	);
});
