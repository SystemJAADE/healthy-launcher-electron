const path = require('path');
const { app, BrowserWindow } = require('electron')

// Crear la ventana principal sin marco y sin barra de menú
function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 510,
    height: 430,
    frame: false, // para eliminar la barra de título
    autoHideMenuBar: true, // para ocultar la barra de menú
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Cargar el archivo HTML de la aplicación
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.whenReady().then(() => {
  const iconPath = path.join(__dirname, 'images/Healthy.ico');
  app.dock.setIcon(iconPath);
});