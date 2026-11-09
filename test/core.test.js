const test = require("node:test");
const assert = require("node:assert/strict");

const mem = new Map();

const workingStorage = {
	getItem: (key) => (mem.has(key) ? mem.get(key) : null),
	setItem: (key, value) => {
		mem.set(key, String(value));
	},
	removeItem: (key) => {
		mem.delete(key);
	},
};

global.localStorage = workingStorage;

const TH = require("../js/core.js");
const THClientProfile = require("../js/profile.js");

const makeSecurityError = () => {
	if (typeof DOMException !== "undefined") {
		return new DOMException("Access denied", "SecurityError");
	}
	const error = new Error("Access denied");
	error.name = "SecurityError";
	return error;
};

test("getItem SecurityError: store.get fallback and default profile", () => {
	mem.clear();
	const originalStorage = global.localStorage;
	const getThrowsStorage = {
		getItem: () => {
			throw makeSecurityError();
		},
		setItem: (key, value) => {
			mem.set(key, String(value));
		},
		removeItem: (key) => {
			mem.delete(key);
		},
	};
	global.localStorage = getThrowsStorage;
	try {
		assert.equal(TH.store.get("test_key", "fallback"), "fallback");
		assert.deepEqual(THClientProfile.getProfile("client_x"), {
			equipment: [],
			limitations: [],
		});
	} finally {
		global.localStorage = originalStorage;
	}
});

test("setItem SecurityError: store.set and saveProfile return false", () => {
	mem.clear();
	const originalStorage = global.localStorage;
	const setThrowsStorage = {
		getItem: (key) => (mem.has(key) ? mem.get(key) : null),
		setItem: () => {
			throw makeSecurityError();
		},
		removeItem: (key) => {
			mem.delete(key);
		},
	};
	global.localStorage = setThrowsStorage;
	try {
		assert.equal(TH.store.set("test_key", { ok: true }), false);
		assert.equal(
			THClientProfile.saveProfile("client_x", { equipment: ["dumbbells"] }),
			false,
		);
	} finally {
		global.localStorage = originalStorage;
	}
});

test("blocked storage: store get, set and remove never throw", () => {
	mem.clear();
	const originalStorage = global.localStorage;
	const blockedStorage = {
		getItem: () => {
			throw makeSecurityError();
		},
		setItem: () => {
			throw makeSecurityError();
		},
		removeItem: () => {
			throw makeSecurityError();
		},
	};
	global.localStorage = blockedStorage;
	try {
		assert.equal(TH.store.get("test_key", "fallback"), "fallback");
		assert.equal(TH.store.set("test_key", { ok: true }), false);
		assert.doesNotThrow(() => {
			TH.store.remove("test_key");
		});
	} finally {
		global.localStorage = originalStorage;
	}
});

test("corrupted JSON string: store.get and getProfile return defaults", () => {
	mem.clear();
	mem.set("trainerhub_client_profiles", "{bad:json");
	mem.set("test_key", "{not-json");
	assert.equal(TH.store.get("test_key", "fallback"), "fallback");
	assert.deepEqual(THClientProfile.getProfile("client_x"), {
		equipment: [],
		limitations: [],
	});
});

test("empty or null storage: getProfile returns default profile", () => {
	mem.clear();
	assert.deepEqual(THClientProfile.getProfile("client_x"), {
		equipment: [],
		limitations: [],
	});
	mem.set("trainerhub_client_profiles", "");
	assert.deepEqual(THClientProfile.getProfile("client_x"), {
		equipment: [],
		limitations: [],
	});
	mem.set("trainerhub_client_profiles", "null");
	assert.deepEqual(THClientProfile.getProfile("client_x"), {
		equipment: [],
		limitations: [],
	});
});

test("restored storage: save then load works again", () => {
	mem.clear();
	const originalStorage = global.localStorage;
	const blockedStorage = {
		getItem: () => {
			throw makeSecurityError();
		},
		setItem: () => {
			throw makeSecurityError();
		},
		removeItem: () => {
			throw makeSecurityError();
		},
	};
	global.localStorage = blockedStorage;
	try {
		assert.equal(
			THClientProfile.saveProfile("client_x", { equipment: ["dumbbells"] }),
			false,
		);
	} finally {
		global.localStorage = originalStorage;
	}
	assert.equal(
		THClientProfile.saveProfile("client_x", { equipment: ["dumbbells"] }),
		true,
	);
	assert.deepEqual(THClientProfile.getProfile("client_x"), {
		equipment: ["dumbbells"],
		limitations: [],
	});
	assert.equal(TH.store.set("test_key", { ok: true }), true);
	assert.deepEqual(TH.store.get("test_key", null), { ok: true });
});
