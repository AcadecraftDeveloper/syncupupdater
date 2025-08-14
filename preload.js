const { contextBridge, shell, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  onNotificationClicked: (callback) => {
    ipcRenderer.on("notification-clicked", (_event, data) => {
      callback(data);
    });
  },
  removeNotificationClicked: (callback) => {
    ipcRenderer.removeListener("notification-clicked", callback);
  },
  openDownloads: () => ipcRenderer.send("open-downloads"),
  setBadgeCount: (count) => ipcRenderer.send("set-badge-count", count),
  sendNotification: (title, body, type, matched, isGroup) =>
    ipcRenderer.send("show-notification", {
      title,
      body,
      type,
      matched,
      isGroup,
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
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    },
  },
});
