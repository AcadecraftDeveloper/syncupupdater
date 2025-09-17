const { contextBridge, shell, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getAppVersion: () => ipcRenderer.sendSync("get-app-version"),
  onNotificationClicked: (callback) => {
    ipcRenderer.on("notification-clicked", (_event, data) => {
      callback(data);
    });
  },

  removeNotificationClicked: (callback) => {
    ipcRenderer.removeListener("notification-clicked", callback);
  },
  getDesktopCapturerSources: (options) => {
    return new Promise((resolve) => {
      ipcRenderer.once(
        "get-desktop-capturer-sources-response",
        (_event, sources) => {
          resolve(sources);
        }
      );
      ipcRenderer.send("get-desktop-capturer-sources", options);
    });
  },
  openDownloads: () => ipcRenderer.send("open-downloads"),
  setBadgeCount: (count) => ipcRenderer.send("set-badge-count", count),
  notifyParent: (message) => ipcRenderer.send("child-to-parent", message),
  onChildNotification: (callback) => {
    ipcRenderer.on("parent-notification", (_event, message) => {
      callback(message);
    });
  },
  removeChildNotification: (callback) => {
    ipcRenderer.removeListener("parent-notification", callback);
  },
  onChildClosed: (callback) => {
    ipcRenderer.on("child-closed", (_, data) => callback(data));
  },
  sendNotification: (title, body, type, matched, isGroup, result, duration) =>
    ipcRenderer.send("show-notification", {
      title,
      body,
      type,
      matched,
      isGroup,
      result,
      duration,
    }),
  sendCallNotification: (title, body, roomId, user) =>
    ipcRenderer.send("show-call-notification", {
      title,
      body,
      roomId,
      user
    }),
  playAudio: (audioPath) => ipcRenderer.send("play-audio", audioPath),
  openExternal: (url) => shell.openExternal(url),
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    removeListener: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    },
  },
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) =>
    ipcRenderer.on(channel, (event, args) => callback(args)),
});
