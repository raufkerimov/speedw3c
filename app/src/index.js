const {app, BrowserWindow} = require('electron');
const path = require('path');
const spawn = require('child_process').spawn
const kill = require('tree-kill')
const validator = spawn('java', ['-cp', __dirname + '/external/vnu.jar', 'nu.validator.servlet.Main', 8888], {detached: true});

if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            contextIsolation: false,
            preload: path.join(__dirname, 'core/preload.js'),
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'html/index.html'));
    mainWindow.maximize();
    mainWindow.removeMenu();
    mainWindow.setResizable(false);
    mainWindow.webContents.openDevTools();
};

//app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
//app.commandLine.appendSwitch('disable-site-isolation-trials');
//app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
app.on('before-quit', () => {
    kill(validator.pid);
});