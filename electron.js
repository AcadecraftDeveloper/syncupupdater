const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  dialog,
  Notification,
  globalShortcut,
  shell,
  session,
  desktopCapturer,
  systemPreferences,
  screen,
} = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { v4: uuidv4 } = require("uuid");
const sound = require("sound-play");
const screenshot = require("screenshot-desktop");
const os = require("os");

let mainWindow, mainWindow2;
var interval;
let tray = null;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const gotTheLock = app.requestSingleInstanceLock();
const preloadScript = path.join(__dirname, "preload.js");
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  function createWindow2() {
    mainWindow2 = new BrowserWindow({
      width: 1200,
      height: 600,
      icon: path.join(__dirname, "logo.png"),
      webPreferences: {
        spellcheck: true,
        preload: preloadScript,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: true,
        nodeIntegrationInSubFrames: true,
        partition: "persist:share",
      },
    });
    // mainWindow2.loadURL("http://localhost:3000/");
    mainWindow2.loadURL("https://syncupteams.com");

  }
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 600,
      icon: path.join(__dirname, "logo.png"),
      webPreferences: {
        spellcheck: true,
        preload: preloadScript,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: true,
        nodeIntegrationInSubFrames: true,
      },
    });
    mainWindow.webContents.session.setSpellCheckerLanguages(["en-US"]);
    mainWindow.webContents.on("context-menu", (event, params) => {
      try {
        const template = [];
        if (params.misspelledWord) {
          template.push(
            {
              label: "Cut",
              role: "cut",
              accelerator: "Ctrl+X",
              enabled: params.editFlags.canCut,
            },
            {
              label: "Copy",
              role: "copy",
              accelerator: "Ctrl+C",
              enabled: params.editFlags.canCopy,
            },
            {
              label: "Paste",
              role: "paste",
              accelerator: "Ctrl+V",
              enabled: params.editFlags.canPaste,
            },
            {
              label: "Delete",
              click: () => {
                mainWindow.webContents.sendInputEvent({
                  type: "keyDown",
                  keyCode: "Delete",
                });
              },
            },
            { type: "separator" },
            { label: "Select All", role: "selectAll", accelerator: "Ctrl+A" },
            { type: "separator" },
            { label: "Spelling", enabled: false }
          );

          const suggestions = params.dictionarySuggestions || [];
          if (suggestions.length > 0) {
            suggestions.forEach((s) => {
              template.push({
                label: s,
                click: () => mainWindow.webContents.replaceMisspelling(s),
              });
            });
          } else {
            template.push({ label: "No suggestions", enabled: false });
          }

          template.push(
            { type: "separator" },
            {
              label: "Add to dictionary",
              click: () =>
                mainWindow.webContents.session.addWordToSpellCheckerDictionary(
                  params.misspelledWord
                ),
            }
          );

          const menu = Menu.buildFromTemplate(template);
          menu.popup({ window: mainWindow });
        }
      } catch (error) {
        console.error("Context menu error:", error);
      }
    });

    // mainWindow.loadURL("http://localhost:3000/");
    mainWindow.loadURL("https://syncupteams.com");

    mainWindow.removeMenu();

    if (process.env.NODE_ENV === "development") {
      newWindow.webContents.openDevTools({ mode: "undocked" });
    }

    mainWindow.showMessage = function (message) {
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Information",
        message: message,
        buttons: ["OK"],
      });
    };

    mainWindow.on("close", (event) => {
      if (!app.isQuiting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });
  }
  app.on("ready", () => {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: [],
    });
    if (process.platform === 'darwin') {
      systemPreferences.askForMediaAccess('microphone');
      systemPreferences.askForMediaAccess('camera');
    }
    console.log("PATH", process.execPath);
    createWindow();
    // createWindow2();
    const currentVersion = app.getVersion();
    console.log("Current version:", currentVersion);

    autoUpdater.checkForUpdates();
    app.setAppUserModelId("syncupteams.com");

    if (!tray) {
      tray = new Tray(path.join(__dirname, "logo.png"));
      const contextMenu = Menu.buildFromTemplate([
        {
          label: "Show Window",
          click: () => {
            mainWindow.show();
          },
        },
        {
          label: "Quit",
          click: () => {
            app.isQuiting = true;
            app.quit();
          },
        },
      ]);

      tray.setToolTip("Syncup Teams");
      tray.setContextMenu(contextMenu);

      tray.on("click", () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      });
      app.on("before-quit", () => {
        if (tray) tray.destroy();

        process.exit(0);
      });
    }
    const ret = globalShortcut.register("CommandOrControl+Shift+~", () => {
      console.log("CommandOrControl+Shift+~ is pressed");
      mainWindow.webContents.openDevTools({ mode: "undocked" });
      // newWindow?.webContents.openDevTools({ mode: "undocked" });
    });
    if (!ret) {
      console.log("registration failed");
    }
    console.log(globalShortcut.isRegistered("CommandOrControl+Shift+~"));
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    app.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    app.exit(1);
  });
  /*New Update Available*/
  autoUpdater.on("update-available", (info) => {
    const availableVersion = info.version;
    // const currentVersion = app.getVersion();
    console.log("New version available:", availableVersion);
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Available",
        message: `Version ${availableVersion} is available. Do you want to download it now?`,
        buttons: ["Later", "Yes"],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 1) {
          autoUpdater.downloadUpdate().catch((error) => {
            console.error("Error downloading update:", error);
            mainWindow.showMessage(
              `Error downloading update: ${error.message}`
            );
          });
        }
      });
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("No new updates available.");
  });

  /*Download Completion Message*/
  autoUpdater.on("update-downloaded", (info) => {
    dialog
      .showMessageBox({
        type: "question",
        buttons: ["Restart", "Later"],
        defaultId: 0,
        message: "Update downloaded. Restart now to apply it?",
      })
      .then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (info) => {
    mainWindow.showMessage(info);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on("will-quit", () => {
    globalShortcut.unregister("CommandOrControl+Shift+~");
    globalShortcut.unregisterAll();
  });

  ipcMain.on("set-badge-count", (event, count) => {
    console.log("Received badge count:", count);
    app.setBadgeCount(count);
  });
  ipcMain.on("get-desktop-capturer-sources", (event, options) => {
    console.log("Getting desktop capturer sources:", options);
    desktopCapturer
      .getSources(options)
      .then((sources) => {
        event.reply("get-desktop-capturer-sources-response", sources);
      })
      .catch((err) => {
        console.error("Failed to get sources:", err);
        event.reply("get-desktop-capturer-sources-response", []);
      });
  });
  ipcMain.on("get-app-version", (event) => {
    event.returnValue = app.getVersion();
  });
  ipcMain.on("open-downloads", () => {
    const downloadsPath = path.join(os.homedir(), "Downloads");
    shell.openPath(downloadsPath); // Opens in File Explorer
  });
  let newWindow;
  ipcMain.on("start-share", function (event, arg) {
    let { userId, roomId, mode } = arg;

    newWindow = new BrowserWindow({
      width: 800,
      height: 600,
      // parent: mainWindow,
      webPreferences: {
        preload: preloadScript,
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        nativeWindowOpen: true,
        experimentalFeatures: true,
        // **Important for screen sharing**
        media: {
          video: true,
          audio: false,
        },
      },
    });
    if (mode === "Audio") {
      newWindow.loadURL(
        `https://video.syncupteams.com/join?room=${roomId}&name=${userId}&audio=1&video=0&screen=0&chat=0`
      );
    } else {
      newWindow.loadURL(
        `https://video.syncupteams.com/join?room=${roomId}&name=${userId}&audio=1&video=1&screen=0&chat=0`
      );
    }
    newWindow.removeMenu();
    newWindow.on("closed", () => {
      console.log("Child window closed");
      mainWindow.webContents.send("parent-notification", {
        roomId: roomId,
        callType: "end",
      });
    });
    newWindow.webContents.on("did-finish-load", () => {
      newWindow.webContents.send("share-args", arg);
    });
  });
  ipcMain.on("child-to-parent", (event, message) => {
    // event.sender is child window
    if (mainWindow) {
      mainWindow.webContents.send("parent-notification", message);
    }
  });

  ipcMain.on("stop-share", function (event, arg) {
    clearInterval(interval);
  });

  ipcMain.on("call-notification-action", (event, data) => {
    const { action, roomId, user } = data;
    mainWindow.webContents.send("call-notification-action-response", {
      action,
      roomId,
      user,
    });
  });

  // main.js
  ipcMain.on("show-call-notification", (event, data) => {
    const { roomId, title, body, user } = data;
    if (mainWindow) {
      mainWindow.show();
    }
    const { width: screenWidth, height: screenHeight } =
      screen.getPrimaryDisplay().workAreaSize;

    const winWidth = 420;
    const winHeight = 350;
    const callWindow = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      transparent: true,
      backgroundColor: '#00000000', // Important for macOS
      hasShadow: false, // optional, removes weird shadow border on mac
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    // Position bottom-right (with a 10px margin)
    const x = screenWidth - winWidth;
    const y = screenHeight - winHeight + 200;

    callWindow.setBounds({ x, y, width: winWidth, height: winHeight });
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SyncUp Notification</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    body {
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: transparent;
    }

    .toast {
      background: #fff;
      border-radius: 12px;
      padding: 14px 18px;
      width: 280px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: slideIn 0.4s ease forwards;
      position: relative;
      overflow: hidden;
    }

    /* Accent bar for branding */
    .toast::before {
      content: "";
      width: 4px;
      background: linear-gradient(180deg, #3498db, #2980b9);
      border-radius: 4px;
      position: absolute;
      top: 0; left: 0; bottom: 0;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeOut {
      to {
        opacity: 0;
        transform: translateY(-100%);
      }
    }

    .toast-icon {
      width: 28px;
      height: 28px;
      background: #3498db;
      color: #fff;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #34495e;
      margin: 0;
    }

    .toast-body {
      font-size: 0.85rem;
      color: #5d6d7e;
      margin: 4px 0 0 0;
    }

    .toast-buttons {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

    .toast-buttons button {
      flex: 1;
      padding: 6px 0;
      border: none;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .accept-btn {
      background: #27ae60;
      color: #fff;
    }
    .accept-btn:hover { background: #2ecc71; }

    .reject-btn {
      background: #e74c3c;
      color: #fff;
    }
    .reject-btn:hover { background: #c0392b; }
  </style>
</head>
<body>
  <div class="toast" id="toast">
    <div class="toast-icon">🔔</div>
    <div class="toast-content">
      <p class="toast-title">${title}</p>
      <p class="toast-body">${body}</p>
      <div class="toast-buttons">
        <button class="accept-btn" onclick="handleAction('accept')">Accept</button>
        <button class="reject-btn" onclick="handleAction('reject')">Mute</button>
      </div>
    </div>
  </div>

  <script>
    let autoClose = setTimeout(() => {
      closeToast();
      handleAction('timeout');
    }, 10000); // auto close after 10s

    function handleAction(action) {
      clearTimeout(autoClose);
      require('electron').ipcRenderer.send('call-notification-action', {
        action,
        roomId: '${roomId}',
        user: ${JSON.stringify(user) || null}
      });
      closeToast();
    }

    function closeToast() {
      const toast = document.getElementById("toast");
      toast.style.animation = "fadeOut 0.4s forwards";
      setTimeout(() => window.close(), 400);
    }
  </script>
</body>
</html>


`;

    // callWindow.loadFile(path.join(__dirname, "callNotification.html"));
    callWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );
    // Pass data to renderer
    callWindow.webContents.once("did-finish-load", () => {
      callWindow.webContents.send("call-data", { roomId, title, body });
    });

    // Listen for user actions
    ipcMain.once("call-response", (e, action) => {
      if (action === "accept") {
        mainWindow.webContents.send("call-action", {
          roomId,
          action: "accept",
        });
      } else {
        mainWindow.webContents.send("call-action", {
          roomId,
          action: "reject",
        });
      }
      callWindow.close();
    });
  });

  ipcMain.on("show-notification", (event, data) => {
    const {
      title,
      body,
      type,
      silent,
      icon,
      duration,
      matched,
      isGroup,
      result,
    } = data;
    console.log("Showing notification:", data);
    if (type) {
      body = `📄 Uploaded file\n\n${body}`;
    }
    const roomId = result?.roomId || uuidv4();
    if (matched) {
      const isMinimized = mainWindow.isMinimized();
      const isHidden = !mainWindow.isVisible();
      const isFocused = mainWindow.isFocused();
      if (!isMinimized && !isHidden && isFocused) {
        return;
      }
    }

    // Create notification with proper format
    const notificationOptions = {
      title: title,
      body: duration === 10000 ? "Incoming Call..." : body,
      icon: icon || path.join(__dirname, "logo.png"),
      silent: silent || false,
    };

    // Only add actions for call notifications
    if (duration === 10000) {
      notificationOptions.actions = [
        { type: "button", text: "✅ Accept" },
        { type: "button", text: "❌ Reject" },
      ];
      notificationOptions.closeButtonText = "Dismiss";
    }

    const notification = new Notification(notificationOptions);

    notification.show();

    // Handle action button clicks
    notification.on("action", (event, index) => {
      console.log("Action clicked:", index);
      const action = index === 0 ? "accept" : "reject";

      if (mainWindow) {
        mainWindow.focus();
        mainWindow.webContents.send("call-action", {
          roomId,
          action: action,
          type: "button-click",
        });
      }
    });

    // Handle notification body click
    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("notification-clicked", {
          roomId,
          title,
          body,
          isGroup,
          result,
        });
      }
    });

    // Handle notification close
    notification.on("close", () => {
      if (duration === 10000) {
        mainWindow.webContents.send("call-action", {
          roomId,
          action: "dismissed",
          type: "closed",
        });
      }
    });

    // Auto-close only for non-call notifications
    if (duration !== 10000) {
      setTimeout(() => {
        notification.close();
      }, duration || 5000);
    }
  });
  ipcMain.on("play-audio", (event, audioPath) => {
    const basePath = app.getAppPath();
    const resolvedPath = path.join(basePath, audioPath);
    sound.play(resolvedPath);
  });

  ipcMain.on("quit-app", (event, arg) => {
    app.quit();
  });
}
