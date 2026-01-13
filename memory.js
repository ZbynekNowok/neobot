/**
 * NeoBot – Session Memory (in-memory)
 */

const MAX_MESSAGES = 10;
const sessions = {};

function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      messages: [],
      state: {},
      data: {}
    };
  }
  return sessions[sessionId];
}

// ---- messages (konverzace) ----
function addMessage(sessionId, role, content) {
  const session = getSession(sessionId);

  session.messages.push({
    role,
    content,
    ts: Date.now()
  });

  if (session.messages.length > MAX_MESSAGES) {
    session.messages.shift();
  }
}

function getContext(sessionId) {
  return getSession(sessionId).messages;
}

// ---- state (decision tree) ----
function setState(sessionId, key, value) {
  getSession(sessionId).state[key] = value;
}

function getState(sessionId, key) {
  return getSession(sessionId).state[key];
}

// ---- data (onboarding answers) ----
function setData(sessionId, key, value) {
  getSession(sessionId).data[key] = value;
}

function getData(sessionId) {
  return getSession(sessionId).data;
}

module.exports = {
  addMessage,
  getContext,
  setState,
  getState,
  setData,
  getData
};

