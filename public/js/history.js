(function (global) {
  "use strict";

  var STORAGE_KEY = "neobot_history";
  var MAX_ITEMS = 100;

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      var trimmed = list.slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (_) {}
  }

  function addHistory(item) {
    if (!item || typeof item !== "object") return;
    item.id = item.id || "h_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    item.timestamp = item.timestamp || new Date().toISOString();
    var list = loadHistory();
    list.unshift(item);
    saveHistory(list);
    return item.id;
  }

  function getHistoryById(id) {
    var list = loadHistory();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  global.NeoBotHistory = {
    loadHistory: loadHistory,
    addHistory: addHistory,
    getHistoryById: getHistoryById,
  };
})(typeof window !== "undefined" ? window : this);
