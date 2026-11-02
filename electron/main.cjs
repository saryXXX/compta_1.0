/**
 * Electron Main Process for Finance Tunisie Desktop Application.
 * - Manages persistent SQLite accounting database in AppData (UserData).
 * - Starts internal Express REST/RPC server.
 * - Creates frameless/native Windows desktop application window.
 * 
 * STRICT COMPLIANCE: ZERO TYPE NULL.
 */

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

let mainWindow = null;
let serverInstance = null;

/**
 * Finds an available local port starting from preferredPort.
 */
function getAvailablePort(preferredPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      // Preferred port occupied, try next
      resolve(getAvailablePort(preferredPort + 1));
    });
    server.listen(preferredPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Sets up the persistent SQLite accounting database in UserData.
 * Ensures updates or reinstalls NEVER erase user financial data!
 */
function setupDatabase() {
  const isPackaged = app.isPackaged;
  const userDataDir = app.getPath('userData');
  const databaseDir = path.join(userDataDir, 'database');

  if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir, { recursive: true });
  }

  const targetDbPath = path.join(databaseDir, 'finance-tunisie.db');

  // If database does not exist yet in AppData, copy the pre-seeded SCE template
  if (!fs.existsSync(targetDbPath)) {
    const possibleTemplatePaths = [
      path.join(__dirname, '../prisma/dev.db'),
      path.join(process.resourcesPath || '', 'prisma/dev.db'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked/prisma/dev.db'),
      path.join(app.getAppPath(), 'prisma/dev.db'),
    ];

    let copied = false;
    for (const templatePath of possibleTemplatePaths) {
      if (fs.existsSync(templatePath)) {
        try {
          fs.copyFileSync(templatePath, targetDbPath);
          console.log(`[Database] Initialized new persistent accounting database from template: ${templatePath}`);
          copied = true;
          break;
        } catch (err) {
          console.error(`[Database] Failed to copy template from ${templatePath}:`, err);
        }
      }
    }

    if (!copied) {
      console.log(`[Database] No template found, creating blank database at ${targetDbPath}`);
    }
  }

  // Configure Prisma Query Engine native library path
  const possibleEnginePaths = [
    path.join(process.resourcesPath || '', 'app.asar.unpacked/prisma/client/query_engine-windows.dll.node'),
    path.join(app.getAppPath(), '..', 'app.asar.unpacked/prisma/client/query_engine-windows.dll.node'),
    path.join(__dirname, '../prisma/client/query_engine-windows.dll.node'),
  ];
  for (const engPath of possibleEnginePaths) {
    if (fs.existsSync(engPath)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = engPath;
      console.log(`[Prisma] Native Query Engine found at: ${engPath}`);
      break;
    }
  }

  // If running in development, use local dev.db unless explicitly forced
  if (!isPackaged && fs.existsSync(path.join(__dirname, '../prisma/dev.db'))) {
    const localDbPath = path.join(__dirname, '../prisma/dev.db').replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${localDbPath}`;
    console.log(`[Database] Development mode: using local ${process.env.DATABASE_URL}`);
    return;
  }

  const normalizedDbPath = targetDbPath.replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${normalizedDbPath}`;
  console.log(`[Database] Production database active at: ${process.env.DATABASE_URL}`);
}

/**
 * Starts the backend Express server.
 */
async function startBackendServer(port) {
  process.env.PORT = String(port);

  const cjsServerPath = path.join(__dirname, '../dist-server/index.cjs');
  const esmServerPath = path.join(__dirname, '../dist-server/index.js');

  if (fs.existsSync(cjsServerPath)) {
    require(cjsServerPath);
    console.log(`[Backend] Express Server started (CommonJS) on http://127.0.0.1:${port}`);
    return;
  }

  if (fs.existsSync(esmServerPath)) {
    const serverModuleUrl = `file://${esmServerPath.replace(/\\/g, '/')}`;
    await import(serverModuleUrl);
    console.log(`[Backend] Express Server started (ESM) on http://127.0.0.1:${port}`);
    return;
  }

  throw new Error(`Le serveur d'application est introuvable. Veuillez exécuter 'npm run build:server'.`);
}

/**
 * Creates the native desktop application window.
 */
function createMainWindow(port) {
  const iconPath = path.join(__dirname, '../assets/icon.png');

  mainWindow = new BrowserWindow({
    title: 'Finance Tunisie - Comptabilité & Fiscalité (Loi 96-112)',
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    backgroundColor: '#0F172A', // Slate-900
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const appUrl = `http://127.0.0.1:${port}`;
  mainWindow.loadURL(appUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Open external links in default browser instead of electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createApplicationMenu();
}

/**
 * Native Windows application menu.
 */
function createApplicationMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Nouvelle Fenêtre',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        { type: 'separator' },
        {
          label: 'Dossier de Données (AppData)',
          click: () => {
            shell.openPath(path.join(app.getPath('userData'), 'database'));
          },
        },
        { type: 'separator' },
        {
          label: 'Quitter Finance Tunisie',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', role: 'undo' },
        { label: 'Rétablir', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', role: 'cut' },
        { label: 'Copier', role: 'copy' },
        { label: 'Coller', role: 'paste' },
        { label: 'Sélectionner tout', role: 'selectAll' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Actualiser', role: 'reload' },
        { label: 'Forcer l\'actualisation', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' },
        { label: 'Zoom +', role: 'zoomIn' },
        { label: 'Zoom -', role: 'zoomOut' },
        { label: 'Taille normale', role: 'resetZoom' },
      ],
    },
    {
      label: 'Aide & Conformité',
      submenu: [
        {
          label: 'Normes Comptables NCT & Loi 96-112',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Conformité Légale Tunisienne',
              message: 'Finance Tunisie v1.0.0',
              detail: 'Système Comptable des Entreprises (Loi 96-112 du 30/12/1996).\n' +
                      'Normes Comptables Tunisiennes (NCT 01, NCT 05, NCT 08).\n' +
                      'Déclarations DGI : G50 (Bordereau 10 taxes), Acomptes AP1/2/3, Déclaration Employeur TEJ.',
            });
          },
        },
        {
          label: 'À propos de Finance Tunisie',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'À propos',
              message: 'Finance Tunisie Desktop',
              detail: 'Application de bureau officielle pour cabinets comptables, directeurs financiers et gestionnaires en Tunisie.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Single Instance Lock: Prevent multiple copies running simultaneously
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      setupDatabase();
      const port = await getAvailablePort(3001);
      await startBackendServer(port);
      createMainWindow(port);
    } catch (err) {
      console.error('[Startup Error]', err);
      dialog.showErrorBox('Erreur de Démarrage', `Impossible de lancer l'application : ${err.message}`);
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
        // Re-create window if clicked on dock/tray
        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
        createMainWindow(port);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

