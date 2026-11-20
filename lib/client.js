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
    return {
      sessionId: readString(record, "sessionId", "a session entry"),
      label: typeof record.label === "string" ? record.label : reject(record.label, "has a non-string label"),
      ...cwd === void 0 ? {} : { cwd },
      createdAt,
      mention: readString(record, "mention", "a session entry")
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
var DAY_MS = 24 * HOUR_MS;
var MONTH_MS = 30 * DAY_MS;
var YEAR_MS = 365 * DAY_MS;
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
    const fileRows = rankFiles(snapshot.files, req.query, MAX_FILE_CANDIDATES).flatMap((entry) => fileRow(entry, req.quoted === true, deps.t));
    const sessionRows = req.quoted === true ? [] : rankSessions(
      sessionIndex.entries.filter((entry) => entry.sessionId !== session.sessionId),
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
function fileRow(file, preserveQuote, t) {
  const mention = formatFileMention(file.entry.relative, file.entry.kind, preserveQuote);
  if (mention === void 0) return [];
  return [{
    name: file.isDirectory ? `${file.name}/` : file.name,
    ...file.parent === "" ? {} : { description: file.parent },
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
  if (elapsed < DAY_MS) return t("time.hours", { n: Math.floor(elapsed / HOUR_MS) });
  if (elapsed < MONTH_MS) return t("time.days", { n: Math.floor(elapsed / DAY_MS) });
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
  "time.years": "{n}\u5E74"
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
  "time.years": "{n}y"
};

// src/client/index.ts
var inject = ["inputTriggers", "remote", "connection", "locale"];
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
  const sourceImpl = createBetterAtSource({
    getRemote: () => betterAt,
    t,
    now: () => Date.now()
  });
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
