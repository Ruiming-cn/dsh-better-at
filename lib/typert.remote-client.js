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

// src/typert.remote-client.ts
var TYPERT_REMOTE = {
  package: "dsh-better-at",
  descriptors: BETTER_AT_INVOCATIONS
};
var typert_remote_client_default = TYPERT_REMOTE;
export {
  TYPERT_REMOTE,
  typert_remote_client_default as default
};
