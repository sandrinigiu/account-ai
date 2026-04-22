// ══════════════════════════════════════════════════════
// V4 BROWSER AGENT — Storage Utility
// Wrapper around chrome.storage.local
// ══════════════════════════════════════════════════════

var Storage = {
  get: function(keys) {
    return new Promise(function(resolve) {
      chrome.storage.local.get(keys, resolve);
    });
  },

  set: function(obj) {
    return new Promise(function(resolve) {
      chrome.storage.local.set(obj, resolve);
    });
  },

  remove: function(keys) {
    return new Promise(function(resolve) {
      chrome.storage.local.remove(keys, resolve);
    });
  },

  getQueue: async function(type) {
    var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
    var data = await Storage.get([key]);
    return data[key] || [];
  },

  setQueue: async function(type, items) {
    var key = type === 'tasks' ? 'ext_queue_tasks' : 'ext_queue_messages';
    var obj = {};
    obj[key] = items;
    return Storage.set(obj);
  },

  addToQueue: async function(type, newItems) {
    var current = await Storage.getQueue(type);
    var merged = current.concat(newItems);
    await Storage.setQueue(type, merged);
    return merged.length;
  },

  clearQueue: async function(type) {
    return Storage.setQueue(type, []);
  }
};

if (typeof module !== 'undefined') module.exports = Storage;
