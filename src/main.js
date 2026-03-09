const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const https = require('https');

let mainWindow;
let tray;
let savedApiKey = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    resizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'J.A.R.V.I.S.'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'tray.png'));
  tray.setToolTip('J.A.R.V.I.S. — Online');
  const menu = Menu.buildFromTemplate([
    { label: 'Show JARVIS', click: () => mainWindow.show() },
    { label: 'Hide', click: () => mainWindow.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.exit(0) }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
}

ipcMain.handle('ask-claude', async (event, { messages, apiKey }) => {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are J.A.R.V.I.S., Tony Stark's AI assistant. Female personality — elegant, brilliant, witty, precise.

Rules:
1. Single word or short phrase (not a question): Say "What do you have in mind today, sir?" then ask ONE sharp probing question about what they might be thinking. Be clever.
2. Question or request: Answer fully, intelligently, concisely.
3. Always: sophisticated tone, call user "sir" occasionally, max 3 sentences for simple things.`,
      messages
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content?.[0]?.text || 'Neural disruption, sir. Please try again.');
        } catch {
          resolve('Error processing response, sir.');
        }
      });
    });

    req.on('error', (e) => resolve(`Connection error: ${e.message}`));
    req.write(body);
    req.end();
  });
});

ipcMain.handle('save-api-key', (e, key) => { savedApiKey = key; });
ipcMain.handle('get-api-key', () => savedApiKey);
ipcMain.handle('minimize', () => mainWindow.hide());
ipcMain.handle('quit', () => app.exit(0));
ipcMain.handle('open-url', (e, url) => shell.openExternal(url));

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', (e) => e.preventDefault());
