const path = require("path");
const { app, BrowserWindow } = require("electron");

// Crear la ventana principal sin marco y sin barra de menú
function createWindow() {
  const mainWindow = new BrowserWindow({
    // width: 510,
    // height: 430,
    width: 900,
    height: 430,
    frame: false, // para eliminar la barra de título
    autoHideMenuBar: true, // para ocultar la barra de menú
    icon: path.join(__dirname, "/Healthy.ico"), // icono de la aplicacion
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Configurar la política de seguridad de contenido
      contentSecurityPolicy: "default-src 'self' https://systemjaade.com",
    },
  });

  // Cargar el archivo HTML de la aplicación
  mainWindow.loadFile("index.html");
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
