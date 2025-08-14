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
} = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { v4: uuidv4 } = require("uuid");
const sound = require("sound-play");
const screenshot = require("screenshot-desktop");
const os = require("os");
var socket = require("socket.io-client")("https://backend.syncupteams.com");

let mainWindow;
var interval;
let tray = null;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const gotTheLock = app.requestSingleInstanceLock();

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

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      icon: path.join(__dirname, "logo.png"),
      webPreferences: {
        spellcheck: true,
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: true,
      },
    });
    mainWindow.webContents.session.setSpellCheckerLanguages(["en-US"]);
    mainWindow.webContents.on("context-menu", (event, params) => {
      try {
        const template = [];
        if (params.misspelledWord) {
          // Cut, Copy, Paste, Delete
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
            { type: "separator" }
          );

          // Select All
          template.push(
            {
              label: "Select All",
              role: "selectAll",
              accelerator: "Ctrl+A",
            },
            { type: "separator" }
          );

          // Spelling section
          template.push({ label: "Spelling", enabled: false });

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

          template.push({ type: "separator" });
          template.push({
            label: "Add to dictionary",
            click: () => {
              mainWindow.webContents.session.addWordToSpellCheckerDictionary(
                params.misspelledWord
              );
            },
          });
          const menu = Menu.buildFromTemplate(template);
          menu.popup({ window: mainWindow });
        }
      } catch (error) {
        console.error("Context menu error:", error);
      }
    });
    // mainWindow.loadURL("http://localhost:3000/");
    mainWindow.loadURL("https://syncupteams.com/");
    mainWindow.removeMenu();
    if (process.env.NODE_ENV === "development") {
      mainWindow.webContents.openDevTools({ mode: "undocked" });
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
    createWindow();
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
        buttons: ["Yes", "Later"],
      })
      .then((result) => {
        if (result.response === 0) {
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

  ipcMain.on("open-downloads", () => {
    const downloadsPath = path.join(os.homedir(), "Downloads");
    shell.openPath(downloadsPath); // Opens in File Explorer
  });

  ipcMain.on("start-share", function (event, arg) {
    newWindow = new BrowserWindow({
      width: 400,
      height: 300,
      parent: mainWindow,
    });
    newWindow.loadFile(path.join(__dirname, "screen.html"));
    newWindow.removeMenu();
    var uuid = uuidv4();
    socket.emit("join-message", uuid);
    newWindow.webContents.send("uuidChield", uuid);
    interval = setInterval(function () {
      screenshot().then((img) => {
        var imgStr = new Buffer(img).toString("base64");
        var obj = {};
        obj.room = uuid;
        obj.image = imgStr;
        socket.emit("screen-data", JSON.stringify(obj));
      });
    }, 100);
  });

  ipcMain.on("stop-share", function (event, arg) {
    clearInterval(interval);
  });

  ipcMain.on(
    "show-notification",
    (
      event,
      {
        title,
        body,
        type,
        silent,
        icon,
        duration,
        roomId,
        user,
        matched,
        isGroup,
      }
    ) => {
      if (type) {
        body = `📄 Uploaded file\n\n${body}`;
      }
      if (matched) {
        const isMinimized = mainWindow.isMinimized();
        const isHidden = !mainWindow.isVisible();
        const isFocused = mainWindow.isFocused();
        if (!isMinimized && !isHidden && isFocused) {
          return;
        }
      }
      const notification = new Notification({
        title,
        body,
        icon: icon || path.join(__dirname, "logo.png"),
        silent: silent || false,
      });

      notification.show();

      setTimeout(() => {
        notification.close();
      }, duration || 5000);

      notification.on("click", () => {
        if (mainWindow) {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }

          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }

          mainWindow.focus();

          mainWindow.setAlwaysOnTop(true);
          mainWindow.setAlwaysOnTop(false);

          mainWindow.webContents.send("notification-clicked", {
            roomId,
            user,
            title,
            body,
            isGroup,
          });
        }
      });
    }
  );

  ipcMain.on("play-audio", (event, audioPath) => {
    const basePath = app.getAppPath();
    const resolvedPath = path.join(basePath, audioPath);
    sound.play(resolvedPath);
  });

  ipcMain.on("quit-app", (event, arg) => {
    app.quit();
  });
}
