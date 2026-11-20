window.__ModuleLoader__.load({ id: 'dsh-better-at', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/contract.ts
function reject(value, problem) {
  throw new TypeError(`dsh-better-at: wire value ${problem} (received ${JSON.stringify(value)})`);
}
function asRecord(value, subject) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) reject(value, `must be an object for ${subject}`);
  return value;
}
function readString(source, key, subject) {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0) reject(value, `needs a non-empty "${key}" for ${subject}`);
  return value;
}
var sessionIdSchema = {
  parse(value) {
    if (typeof value !== "string" || value.length === 0) reject(value, "must be a non-empty session id");
    return value;
  }
};
var betterAtFileEntrySchema = {
  parse(value) {
    const record = asRecord(value, "a workspace entry");
    const kind = record.kind;
    if (kind !== "file" && kind !== "directory") reject(kind, "has an unknown entry kind");
    return {
      path: readString(record, "path", "a workspace entry"),
      relative: readString(record, "relative", "a workspace entry"),
      kind
    };
  }
};
var betterAtFileIndexSchema = {
  parse(value) {
    const record = asRecord(value, "the workspace index");
    if (!Array.isArray(record.entries)) reject(record.entries, "needs an entries array");
    if (typeof record.truncated !== "boolean") reject(record.truncated, "needs a boolean truncated flag");
    return {
      root: readString(record, "root", "the workspace index"),
      entries: record.entries.map((entry) => betterAtFileEntrySchema.parse(entry)),
      truncated: record.truncated
    };
  }
};
var betterAtSessionEntrySchema = {
  parse(value) {
    const record = asRecord(value, "a session entry");
    const createdAt = record.createdAt;
    if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) reject(createdAt, "needs a numeric createdAt");
    const cwd = record.cwd;
    if (cwd !== void 0 && typeof cwd !== "string") reject(cwd, "has a non-string cwd");
    const origin = record.origin;
    if (origin !== void 0 && origin !== "subagent") reject(origin, "has an unknown session origin");
    const parentSession = record.parentSession;
    if (parentSession !== void 0 && (typeof parentSession !== "string" || parentSession.length === 0)) {
      reject(parentSession, "has an invalid parentSession");
    }
    if (typeof record.archived !== "boolean") reject(record.archived, "needs a boolean archived flag");
    return {
      sessionId: readString(record, "sessionId", "a session entry"),
      label: typeof record.label === "string" ? record.label : reject(record.label, "has a non-string label"),
      ...cwd === void 0 ? {} : { cwd },
      createdAt,
      mention: readString(record, "mention", "a session entry"),
      ...origin === void 0 ? {} : { origin },
      ...parentSession === void 0 ? {} : { parentSession },
      archived: record.archived
    };
  }
};
var betterAtSessionIndexSchema = {
  parse(value) {
    const record = asRecord(value, "the session index");
    if (!Array.isArray(record.entries)) reject(record.entries, "needs an entries array");
    return { entries: record.entries.map((entry) => betterAtSessionEntrySchema.parse(entry)) };
  }
};
var BETTER_AT_INVOCATIONS = [
  {
    id: "dsh-better-at#betterAt/listFiles",
    service: "betterAt",
    namespace: "betterAt",
    method: "listFiles",
    invocation: { kind: "direct" },
    scope: {
      context: "agent",
      wire: "agentId"
    },
    parameters: [
      {
        name: "agent",
        wire: "agentId",
        source: "lookup",
        lookup: "agent",
        codec: {
          mode: "strict",
          typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
          create: () => sessionIdSchema
        }
      }
    ],
    cancellation: { parameter: "signal" },
    result: {
      mode: "strict",
      typeSymbol: "dsh-better-at#BetterAtFileIndex",
      create: () => betterAtFileIndexSchema
    }
  },
  {
    id: "dsh-better-at#betterAt/listSessions",
    service: "betterAt",
    namespace: "betterAt",
    method: "listSessions",
    invocation: { kind: "direct" },
    parameters: [],
    cancellation: { parameter: "signal" },
    result: {
      mode: "strict",
      typeSymbol: "dsh-better-at#BetterAtSessionIndex",
      create: () => betterAtSessionIndexSchema
    }
  }
];

// src/client/remote.ts
var BETTER_AT_REMOTE = {
  package: "dsh-better-at",
  descriptors: BETTER_AT_INVOCATIONS
};

// src/client/filters.ts
var DAY_MS = 864e5;
function scopeSessions(entries, options) {
  const { settings, now, currentSessionId, summaries } = options;
  const conversation = conversationSessions(entries, currentSessionId);
  const staleBefore = settings.staleSessionDays > 0 ? now - settings.staleSessionDays * DAY_MS : void 0;
  return entries.filter((entry) => {
    if (entry.sessionId === currentSessionId) return false;
    if (settings.hideArchivedSessions && entry.archived) return false;
    if (settings.hideForeignSubagents && entry.origin === "subagent" && !conversation.has(entry.sessionId)) return false;
    if (staleBefore !== void 0) {
      const summary = summaries?.[entry.sessionId];
      if (summary?.running !== true) {
        const updatedAt = summary?.updatedAt ?? entry.createdAt;
        if (updatedAt < staleBefore) return false;
      }
    }
    return true;
  });
}
function conversationSessions(entries, currentSessionId) {
  const members = /* @__PURE__ */ new Set([currentSessionId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of entries) {
      if (entry.origin !== "subagent" || entry.parentSession === void 0) continue;
      if (members.has(entry.sessionId) || !members.has(entry.parentSession)) continue;
      members.add(entry.sessionId);
      changed = true;
    }
  }
  return members;
}

// src/client/search.ts
var MAX_FILE_CANDIDATES = 20;
var MAX_SESSION_CANDIDATES = 20;
function prepareFiles(files) {
  return files.map((entry) => {
    const segments = entry.relative.split("/");
    const name = segments.at(-1) ?? entry.relative;
    return {
      entry,
      name,
      lowerName: name.toLocaleLowerCase(),
      isDirectory: entry.kind === "directory",
      hidden: segments.some((segment) => segment.startsWith(".")),
      parent: segments.slice(0, -1).join("/")
    };
  });
}
function rankFiles(files, query, limit = MAX_FILE_CANDIDATES) {
  const q = query.trim().replaceAll("\\", "/");
  if (q === "" || q.includes("/")) return listDirectoryEntries(files, q, limit);
  const includeHidden = q.startsWith(".");
  const needle = q.toLocaleLowerCase();
  const ranked = [];
  for (const file of files) {
    if (!includeHidden && file.hidden) continue;
    const score = scoreName(file.name, file.lowerName, needle);
    if (score < 0) continue;
    ranked.push({ file, score: score + (file.isDirectory ? 50 : 0) });
  }
  return selectTop(ranked, limit, compareRanked).map((row) => row.file);
}
function listDirectoryEntries(files, query, limit = MAX_FILE_CANDIDATES) {
  const normalized = query.replaceAll("\\", "/");
  const prefix = normalized === "" || normalized.endsWith("/") ? normalized : normalized.slice(0, normalized.lastIndexOf("/") + 1);
  const fragment = normalized.endsWith("/") || normalized === "" ? "" : normalized.slice(normalized.lastIndexOf("/") + 1);
  const includeHidden = fragment.startsWith(".");
  const children = [];
  for (const file of files) {
    if (!file.entry.relative.startsWith(prefix)) continue;
    const rest = file.entry.relative.slice(prefix.length);
    if (rest === "" || rest.includes("/")) continue;
    if (file.name.startsWith(".") && !includeHidden) continue;
    children.push(file);
  }
  if (fragment === "") {
    return [...children].sort((a, b) => kindRank(a) - kindRank(b) || (a.entry.relative < b.entry.relative ? -1 : 1)).slice(0, limit);
  }
  const needle = fragment.toLocaleLowerCase();
  const ranked = [];
  for (const file of children) {
    const score = scoreName(file.name, file.lowerName, needle);
    if (score < 0) continue;
    ranked.push({ file, score: score + (file.isDirectory ? 25 : 0) });
  }
  return selectTop(ranked, limit, compareRanked).map((row) => row.file);
}
function rankSessions(sessions, query, currentCwd, limit = MAX_SESSION_CANDIDATES) {
  const needle = query.trim().toLocaleLowerCase();
  const matched = needle === "" ? sessions : sessions.filter((session) => session.sessionId.toLocaleLowerCase().includes(needle) || (session.cwd?.toLocaleLowerCase().includes(needle) ?? false) || session.label.toLocaleLowerCase().includes(needle));
  return matched.map((session, index) => ({ session, index, affinity: affinity(session.cwd, currentCwd) })).sort((a, b) => a.affinity - b.affinity || a.index - b.index).slice(0, limit).map((row) => row.session);
}
function selectTop(items, limit, compare) {
  if (items.length <= limit) return items.sort(compare);
  const top = [];
  for (const item of items) {
    if (top.length === limit && compare(item, top[limit - 1]) >= 0) continue;
    let low = 0;
    let high = top.length;
    while (low < high) {
      const middle = low + high >> 1;
      if (compare(item, top[middle]) < 0) high = middle;
      else low = middle + 1;
    }
    top.splice(low, 0, item);
    if (top.length > limit) top.pop();
  }
  return top;
}
function compareRanked(a, b) {
  return b.score - a.score || kindRank(a.file) - kindRank(b.file) || a.file.entry.relative.length - b.file.entry.relative.length || (a.file.entry.relative < b.file.entry.relative ? -1 : 1);
}
function scoreName(name, lowerName, lowerQuery) {
  if (lowerName === lowerQuery) return 5e3;
  if (lowerName.startsWith(lowerQuery)) return 4500 - name.length;
  const contained = lowerName.indexOf(lowerQuery);
  if (contained >= 0) return 4e3 - contained * 10 - name.length;
  let first = -1;
  let previous = -1;
  let gaps = 0;
  let at = 0;
  for (const ch of lowerQuery) {
    const found = lowerName.indexOf(ch, at);
    if (found < 0) return -1;
    if (first < 0) first = found;
    if (previous >= 0) gaps += found - previous - 1;
    previous = found;
    at = found + 1;
  }
  return 3e3 - first * 10 - gaps * 5 - name.length;
}
function kindRank(file) {
  return file.isDirectory ? 0 : 1;
}
function affinity(candidateCwd, targetCwd) {
  if (candidateCwd !== void 0 && targetCwd !== void 0 && candidateCwd === targetCwd) return 0;
  if (candidateCwd === void 0) return 1;
  return 2;
}

// src/client/source.ts
var FILE_TTL_MS = 3e4;
var SESSION_TTL_MS = 3e5;
var FILE_CACHE_MAX_SESSIONS = 100;
var MINUTE_MS = 6e4;
var HOUR_MS = 60 * MINUTE_MS;
var DAY_MS2 = 24 * HOUR_MS;
var MONTH_MS = 30 * DAY_MS2;
var YEAR_MS = 365 * DAY_MS2;
function createBetterAtSource(deps) {
  const now = deps.now ?? (() => Date.now());
  const fileCaches = /* @__PURE__ */ new Map();
  let sessionCache;
  const startFileFetch = (sessionId) => {
    const remote = deps.getRemote();
    if (remote === void 0) throw new Error("dsh-better-at: betterAt Remote not mounted");
    const abort = new AbortController();
    const entry = {
      promise: remote.listFiles(sessionId, abort.signal).then((result) => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
        return { index: result.value, files: prepareFiles(result.value.entries) };
      }),
      abort,
      at: now()
    };
    fileCaches.set(sessionId, entry);
    if (fileCaches.size > FILE_CACHE_MAX_SESSIONS) {
      const oldest = fileCaches.keys().next().value;
      if (oldest !== void 0) {
        const old = fileCaches.get(oldest);
        old?.abort.abort();
        fileCaches.delete(oldest);
      }
    }
    entry.promise.then(
      (value) => {
        entry.settled = value;
      },
      () => {
        if (fileCaches.get(sessionId) === entry) fileCaches.delete(sessionId);
      }
    );
    return entry;
  };
  const getFileIndex = (sessionId) => {
    const existing = fileCaches.get(sessionId);
    if (existing !== void 0) {
      if (existing.settled !== void 0) {
        if (now() - existing.at < FILE_TTL_MS) return Promise.resolve(existing.settled);
        void startFileFetch(sessionId).promise.catch(() => {
        });
        return Promise.resolve(existing.settled);
      }
      return existing.promise;
    }
    return startFileFetch(sessionId).promise;
  };
  const startSessionFetch = () => {
    const remote = deps.getRemote();
    if (remote === void 0) throw new Error("dsh-better-at: betterAt Remote not mounted");
    const abort = new AbortController();
    const entry = {
      promise: remote.listSessions(abort.signal).then((result) => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
        return result.value;
      }),
      abort,
      at: now()
    };
    sessionCache = entry;
    entry.promise.then(
      (value) => {
        entry.settled = value;
      },
      () => {
        if (sessionCache === entry) sessionCache = void 0;
      }
    );
    return entry;
  };
  const getSessionIndex = () => {
    const existing = sessionCache;
    if (existing !== void 0) {
      if (existing.settled !== void 0) {
        if (now() - existing.at < SESSION_TTL_MS) return Promise.resolve(existing.settled);
        void startSessionFetch().promise.catch(() => {
        });
        return Promise.resolve(existing.settled);
      }
      return existing.promise;
    }
    return startSessionFetch().promise;
  };
  const candidates = async (session, req) => {
    const [snapshot, sessionIndex] = await Promise.all([
      getFileIndex(session.sessionId),
      getSessionIndex()
    ]);
    if (req.signal.aborted) return [];
    const at = now();
    const scope = deps.settings.get();
    const fileRows = rankFiles(snapshot.files, req.query, MAX_FILE_CANDIDATES).flatMap((entry) => fileRow(entry, req.quoted === true, scope, deps.t));
    const sessionRows = req.quoted === true ? [] : rankSessions(
      scopeSessions(sessionIndex.entries, {
        settings: scope,
        now: at,
        currentSessionId: session.sessionId,
        summaries: deps.getSessionSummaries?.()
      }),
      req.query,
      snapshot.index.root,
      MAX_SESSION_CANDIDATES
    ).map((entry) => sessionRow(entry, snapshot.index.root, at, deps.t));
    return [...fileRows, ...sessionRows];
  };
  const prewarm = (session) => {
    void getFileIndex(session.sessionId).catch(() => {
    });
    void getSessionIndex().catch(() => {
    });
  };
  const invalidateAll = () => {
    for (const [key, entry] of fileCaches) {
      fileCaches.delete(key);
      entry.abort.abort();
    }
    if (sessionCache !== void 0) {
      sessionCache.abort.abort();
      sessionCache = void 0;
    }
  };
  return { candidates, prewarm, invalidateAll };
}
function fileRow(file, preserveQuote, settings, t) {
  const mention = formatFileMention(file.entry.relative, file.entry.kind, preserveQuote);
  if (mention === void 0) return [];
  const name = file.isDirectory ? `${file.name}/` : file.name;
  const tree = settings.fileDisplay === "tree";
  const depth = tree ? file.entry.relative.split("/").length - 1 : 0;
  return [{
    name: tree ? `${"  ".repeat(depth)}${name}` : name,
    ...file.parent === "" ? {} : { description: tree ? file.entry.relative : file.parent },
    icon: file.isDirectory ? "folder" : "file",
    section: t("section.files"),
    ...file.isDirectory ? { drill: true } : {},
    value: JSON.stringify({ kind: "file", fileKind: file.entry.kind, label: file.name, mention })
  }];
}
function sessionRow(entry, root, now, t) {
  const age = formatAge(entry.createdAt, now, t);
  const location = entry.cwd === void 0 ? t("candidate.noCwd") : entry.cwd === root ? void 0 : entry.cwd;
  return {
    name: entry.label,
    description: location === void 0 ? age : `${location} \xB7 ${age}`,
    icon: "session",
    section: t("section.sessions"),
    value: JSON.stringify({ kind: "session", label: entry.label, mention: entry.mention })
  };
}
function formatAge(createdAt, now, t) {
  const elapsed = Math.max(0, now - createdAt);
  if (elapsed < MINUTE_MS) return t("time.now");
  if (elapsed < HOUR_MS) return t("time.minutes", { n: Math.floor(elapsed / MINUTE_MS) });
  if (elapsed < DAY_MS2) return t("time.hours", { n: Math.floor(elapsed / HOUR_MS) });
  if (elapsed < MONTH_MS) return t("time.days", { n: Math.floor(elapsed / DAY_MS2) });
  if (elapsed < YEAR_MS) return t("time.months", { n: Math.floor(elapsed / MONTH_MS) });
  return t("time.years", { n: Math.floor(elapsed / YEAR_MS) });
}
function formatFileMention(path, kind, preserveQuote) {
  const text = kind === "directory" ? `${path}/` : path;
  if (/[\u0000-\u001f\u007f-\u009f"]/u.test(text)) return void 0;
  const quoted = preserveQuote || /\s/u.test(text);
  if (!quoted) return `@${text}`;
  if (kind === "directory") return `@"${text}`;
  return `@"${text}"`;
}

// src/client/settings.ts
var DEFAULT_SETTINGS = {
  hideArchivedSessions: true,
  staleSessionDays: 7,
  hideForeignSubagents: true,
  fileDisplay: "flat"
};
var MAX_STALE_DAYS = 3650;
var STORAGE_KEY = "dsh-better-at:scope:v1";
function normalizeSettings(value) {
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
  const record = value;
  const days = record.staleSessionDays;
  return {
    hideArchivedSessions: typeof record.hideArchivedSessions === "boolean" ? record.hideArchivedSessions : DEFAULT_SETTINGS.hideArchivedSessions,
    staleSessionDays: typeof days === "number" && Number.isInteger(days) && days >= 0 && days <= MAX_STALE_DAYS ? days : DEFAULT_SETTINGS.staleSessionDays,
    hideForeignSubagents: typeof record.hideForeignSubagents === "boolean" ? record.hideForeignSubagents : DEFAULT_SETTINGS.hideForeignSubagents,
    fileDisplay: record.fileDisplay === "tree" || record.fileDisplay === "flat" ? record.fileDisplay : DEFAULT_SETTINGS.fileDisplay
  };
}
function createSettingsStore(storage = browserStorage()) {
  let current = readStored(storage);
  const listeners = /* @__PURE__ */ new Set();
  const emit = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        console.error("[dsh-better-at] settings listener failed:", error);
      }
    }
  };
  return {
    get: () => current,
    update(patch) {
      current = normalizeSettings({ ...current, ...patch });
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch (error) {
        console.warn("[dsh-better-at] could not persist the @ search scope:", error);
      }
      emit();
    },
    reset() {
      current = DEFAULT_SETTINGS;
      try {
        storage?.removeItem?.(STORAGE_KEY);
      } catch {
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
function readStored(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw === null || raw === void 0 ? DEFAULT_SETTINGS : normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function browserStorage() {
  try {
    return typeof localStorage === "undefined" ? void 0 : localStorage;
  } catch {
    return void 0;
  }
}

// src/client/settings-view.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var styles = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "4px 0",
    color: "var(--dsw-alias-label-primary, #1f1f1f)",
    font: "inherit"
  },
  title: { margin: 0, fontSize: "16px", lineHeight: "24px", fontWeight: 600 },
  description: { margin: 0, fontSize: "13px", lineHeight: "20px", color: "var(--dsw-alias-label-secondary, #555)" },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "10px 12px",
    border: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.2))",
    borderRadius: "10px"
  },
  control: { marginTop: "2px", flex: "none" },
  body: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
  label: { fontSize: "13px", lineHeight: "20px", fontWeight: 500 },
  hint: { fontSize: "12px", lineHeight: "18px", color: "var(--dsw-alias-label-tertiary, #8a8a8e)" },
  number: {
    width: "72px",
    padding: "4px 6px",
    border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4))",
    borderRadius: "6px",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "13px"
  },
  group: { display: "flex", gap: "14px", marginTop: "2px" },
  radioRow: { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" },
  reset: {
    alignSelf: "flex-start",
    padding: "6px 12px",
    border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4))",
    borderRadius: "8px",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "13px",
    cursor: "pointer"
  }
};
function Row(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.row, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.control, children: props.children }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.body, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.label, children: props.label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.hint, children: props.hint })
    ] })
  ] });
}
function ScopeSection({ store, t }) {
  const settings = (0, import_react.useSyncExternalStore)(store.subscribe, store.get);
  const setDays = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_STALE_DAYS) return;
    store.update({ staleSessionDays: parsed });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: styles.section, "aria-label": t("settings.title"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: styles.title, children: t("settings.title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.description, children: t("settings.description") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: t("settings.archived"), hint: t("settings.archivedHint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "checkbox",
        checked: settings.hideArchivedSessions,
        "aria-label": t("settings.archived"),
        onChange: (event) => store.update({ hideArchivedSessions: event.currentTarget.checked })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: t("settings.staleDays"), hint: t("settings.staleDaysHint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "number",
        min: 0,
        max: MAX_STALE_DAYS,
        step: 1,
        value: settings.staleSessionDays,
        "aria-label": t("settings.staleDays"),
        style: styles.number,
        onChange: (event) => setDays(event.currentTarget.value)
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: t("settings.foreignSubagents"), hint: t("settings.foreignSubagentsHint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "checkbox",
        checked: settings.hideForeignSubagents,
        "aria-label": t("settings.foreignSubagents"),
        onChange: (event) => store.update({ hideForeignSubagents: event.currentTarget.checked })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: t("settings.fileDisplay"), hint: t("settings.fileDisplayHint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.group, role: "radiogroup", "aria-label": t("settings.fileDisplay"), children: ["flat", "tree"].map((mode) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: styles.radioRow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "radio",
          name: "dsh-better-at-file-display",
          checked: settings.fileDisplay === mode,
          onChange: () => store.update({ fileDisplay: mode })
        }
      ),
      t(mode === "flat" ? "settings.flat" : "settings.tree")
    ] }, mode)) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.reset, onClick: () => store.reset(), children: t("settings.reset") })
  ] });
}

// src/client/locales.ts
var NS = "better-at";
var zh = {
  "section.files": "\u6587\u4EF6\u4E0E\u6587\u4EF6\u5939",
  "section.sessions": "\u5BF9\u8BDD",
  "candidate.noCwd": "\uFF08\u65E0\u5DE5\u4F5C\u76EE\u5F55\uFF09",
  "time.now": "\u521A\u521A",
  "time.minutes": "{n}\u5206\u949F",
  "time.hours": "{n}\u5C0F\u65F6",
  "time.days": "{n}\u5929",
  "time.months": "{n}\u4E2A\u6708",
  "time.years": "{n}\u5E74",
  "settings.title": "@ \u641C\u7D22\u8303\u56F4",
  "settings.description": "\u89C4\u5219\u5728\u6D4F\u89C8\u5668\u5185\u5E94\u7528\uFF0C\u6539\u5B8C\u7ACB\u5373\u751F\u6548\uFF0C\u4E0D\u4F1A\u91CD\u65B0\u626B\u63CF\u5DE5\u4F5C\u533A\u3002",
  "settings.archived": "\u4E0D\u641C\u7D22\u5DF2\u5F52\u6863\u7684\u5BF9\u8BDD",
  "settings.archivedHint": "\u5F52\u6863\u53EA\u9690\u85CF\u5BF9\u8BDD\uFF0C\u4E0D\u5220\u9664\u6570\u636E\u3002",
  "settings.staleDays": "\u4E0D\u641C\u7D22 N \u5929\u5185\u672A\u7EF4\u62A4\u7684\u5BF9\u8BDD",
  "settings.staleDaysHint": "\u9ED8\u8BA4 7 \u5929\uFF1B\u586B 0 \u5173\u95ED\u8FD9\u6761\u89C4\u5219\u3002\u6B63\u5728\u8FD0\u884C\u7684\u5BF9\u8BDD\u59CB\u7EC8\u4FDD\u7559\u3002",
  "settings.foreignSubagents": "\u4E0D\u641C\u7D22\u4E0D\u5C5E\u4E8E\u5F53\u524D\u5BF9\u8BDD\u7684\u5B50\u667A\u80FD\u4F53",
  "settings.foreignSubagentsHint": "\u7531\u5F53\u524D\u5BF9\u8BDD\u6D3E\u751F\u51FA\u7684\u5B50\u667A\u80FD\u4F53\u4F1A\u8BDD\u4ECD\u7136\u4FDD\u7559\u3002",
  "settings.fileDisplay": "\u6587\u4EF6\u8DEF\u5F84\u5C55\u793A",
  "settings.fileDisplayHint": "\u5E73\u94FA\u4E3A\u300C\u6587\u4EF6\u540D + \u7236\u76EE\u5F55\u300D\uFF0C\u6811\u5F62\u6309\u5DE5\u4F5C\u533A\u6DF1\u5EA6\u7F29\u8FDB\u5E76\u663E\u793A\u5B8C\u6574\u76F8\u5BF9\u8DEF\u5F84\u3002",
  "settings.flat": "\u5E73\u94FA",
  "settings.tree": "\u6811\u5F62",
  "settings.reset": "\u6062\u590D\u9ED8\u8BA4"
};
var en = {
  "section.files": "Files & folders",
  "section.sessions": "Sessions",
  "candidate.noCwd": "(no cwd)",
  "time.now": "now",
  "time.minutes": "{n}min",
  "time.hours": "{n}h",
  "time.days": "{n}d",
  "time.months": "{n}mo",
  "time.years": "{n}y",
  "settings.title": "@ search scope",
  "settings.description": "Rules apply inside the browser: a change affects the next @ immediately and never rescans the workspace.",
  "settings.archived": "Skip archived sessions",
  "settings.archivedHint": "Archiving hides a session without deleting its data.",
  "settings.staleDays": "Skip sessions idle for N days",
  "settings.staleDaysHint": "Defaults to 7. Use 0 to keep every session; a running session is always kept.",
  "settings.foreignSubagents": "Skip subagents outside this conversation",
  "settings.foreignSubagentsHint": "Subagent sessions descended from the current conversation stay listed.",
  "settings.fileDisplay": "File path display",
  "settings.fileDisplayHint": "Flat shows the name plus its parent directory; tree indents by workspace depth and shows the full relative path.",
  "settings.flat": "Flat",
  "settings.tree": "Tree",
  "settings.reset": "Reset to defaults"
};

// src/client/index.ts
var inject = ["inputTriggers", "remote", "connection", "locale", "sessions", "slots"];
function asDisposer(value) {
  if (typeof value === "function") return value;
  const disposable = value;
  return () => {
    disposable?.dispose?.();
  };
}
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-better-at: dictionaries");
  let betterAt;
  ctx.effect(async () => {
    const dispose = await ctx.remote.$mount(BETTER_AT_REMOTE);
    betterAt = ctx.reflect.get("remote.betterAt");
    if (betterAt === void 0) {
      throw new Error("dsh-better-at: the betterAt Remote namespace did not mount");
    }
    return () => {
      betterAt = void 0;
      void dispose();
    };
  }, "dsh-better-at: remote");
  const inputTriggers = ctx.get("inputTriggers");
  const t = ctx.locale.bind(NS);
  const settings = createSettingsStore();
  const sessions = ctx.get("sessions");
  const getSessionSummaries = () => {
    try {
      return sessions?.list.getSnapshot().byId;
    } catch (error) {
      console.error("[dsh-better-at] could not read the client session list:", error);
      return void 0;
    }
  };
  const sourceImpl = createBetterAtSource({
    getRemote: () => betterAt,
    t,
    settings,
    getSessionSummaries,
    now: () => Date.now()
  });
  const slots = ctx.slots;
  if (slots !== void 0) {
    ctx.effect(() => asDisposer(
      slots.inject("settings.section", () => slots.register(
        {
          name: "settings.section",
          id: "dsh-better-at-scope",
          order: 860,
          locale: NS,
          label: () => t("settings.title"),
          inject: () => ({ store: settings, t })
        },
        ScopeSection
      ))
    ), "dsh-better-at: settings section");
  }
  const wrapped = /* @__PURE__ */ new Set();
  const restore = /* @__PURE__ */ new Map();
  const wrapReference = (raw) => {
    if (raw === void 0 || raw.__dshBetterAtWrapped || typeof raw.candidates !== "function") return;
    const originalCandidates = raw.candidates;
    const originalWarm = raw.warm;
    raw.candidates = async (session, req) => {
      if (betterAt === void 0) {
        return originalCandidates ? originalCandidates.call(raw, session, req) : [];
      }
      try {
        return await sourceImpl.candidates(session, req);
      } catch (error) {
        console.error("[dsh-better-at] candidates failed, falling back to native:", error);
        return originalCandidates ? originalCandidates.call(raw, session, req) : [];
      }
    };
    if (typeof originalWarm === "function") {
      raw.warm = (session) => {
        try {
          originalWarm.call(raw, session);
        } catch (error) {
          console.error("[dsh-better-at] native warm failed:", error);
        }
        sourceImpl.prewarm(session);
      };
    } else {
      raw.warm = (session) => sourceImpl.prewarm(session);
    }
    raw.__dshBetterAtWrapped = true;
    wrapped.add(raw);
    restore.set(raw, { candidates: originalCandidates, warm: originalWarm });
  };
  const service = inputTriggers;
  if (Array.isArray(service.live?.sources)) {
    const reference = service.live.sources.find((source) => source.trigger === "@" && source.name === "reference");
    if (reference !== void 0) wrapReference(reference);
  }
  const registerSource = service.registerSource.bind(service);
  service.registerSource = (src) => {
    if (src.trigger === "@" && src.name === "reference") wrapReference(src);
    return registerSource(src);
  };
  ctx.effect(() => () => {
    service.registerSource = registerSource;
    for (const source of wrapped) {
      const original = restore.get(source);
      if (original === void 0) continue;
      source.candidates = original.candidates;
      source.warm = original.warm;
      delete source.__dshBetterAtWrapped;
    }
    wrapped.clear();
    restore.clear();
  }, "dsh-better-at: source wrapper");
  ctx.on("connection/reset", () => {
    sourceImpl.invalidateAll();
  });
}
return module.exports; } });
//# sourceMappingURL=client.js.map
