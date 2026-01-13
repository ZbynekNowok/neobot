// memory.js
// In-memory session store + TASK 1.1 request tracking (ACK + polling)
// Includes getState/setState for compatibility.

const crypto = require("crypto");

const sessions = new Map();
/*
Session shape:
{
  createdAt: number,
  state: object,
  data: object,
  requests: Map<requestId, { status: "pending"|"done"|"error", payload: any, createdAt: number }>
}
*/

function ensureSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      createdAt: Date.now(),
      state: {},
      data: {},
      requests: new Map(),
    });
  }
  return sessions.get(sessionId);
}

// -------- compatibility expected by existing code --------
function getState(sessionId = "default") {
  return ensureSession(sessionId).state;
}

function setState(sessionId = "default", patch = {}) {
  const s = ensureSession(sessionId);
  s.state = { ...(s.state || {}), ...(patch || {}) };
  return s.state;
}

// -------- generic helpers (safe to keep) --------
function getSession(sessionId) {
  return ensureSession(sessionId);
}

function getSessionData(sessionId) {
  return ensureSession(sessionId).data;
}

function setSessionData(sessionId, patch) {
  const s = ensureSession(sessionId);
  s.data = { ...(s.data || {}), ...(patch || {}) };
  return s.data;
}

function get(sessionId) {
  return getSession(sessionId);
}

function set(sessionId, patch) {
  return setSessionData(sessionId, patch);
}

// -------- TASK 1.1 request lifecycle --------
function createRequest(sessionId) {
  const s = ensureSession(sessionId);
  const requestId = crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");

  s.requests.set(requestId, {
    status: "pending",
    payload: null,
    createdAt: Date.now(),
  });

  return requestId;
}

function getRequest(sessionId, requestId) {
  const s = ensureSession(sessionId);
  return s.requests.get(requestId) || null;
}

function setRequestResult(sessionId, requestId, payload) {
  const s = ensureSession(sessionId);
  if (!s.requests.has(requestId)) return false;

  const createdAt = s.requests.get(requestId)?.createdAt || Date.now();
  s.requests.set(requestId, { status: "done", payload, createdAt });
  return true;
}

function setRequestError(sessionId, requestId, payload) {
  const s = ensureSession(sessionId);
  if (!s.requests.has(requestId)) return false;

  const createdAt = s.requests.get(requestId)?.createdAt || Date.now();
  s.requests.set(requestId, { status: "error", payload, createdAt });
  return true;
}

module.exports = {
  // compatibility
  getState,
  setState,

  // generic
  getSession,
  getSessionData,
  setSessionData,
  get,
  set,

  // TASK 1.1
  createRequest,
  getRequest,
  setRequestResult,
  setRequestError,
};
