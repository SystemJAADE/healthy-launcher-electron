const { Client } = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const JSZip = require("jszip");

// Version
let currentVersion = null;
let appStatus = null;
let progressBar;

window.addEventListener("DOMContentLoaded", async () => {
  appStatus = document.querySelector(".app-status");
  progressBar = document.querySelector(".progress");
  await validateJarExistence();
  // Nueva llamada a la función para listar los archivos FTP
  await listFtpFiles();
});

async function listFtpFiles() {
  const client = new Client();
  let fileNames = [];

  try {
    appStatus.innerHTML = `version disponible: ${currentVersion}`;
    await client.access({
      host: "ftp.systemjaade.com",
      port: "21",
      user: "healthy-ant@systemjaade.com",
      password: "healthy.2020",
    });

    const files = await client.list("/Healthy");
    fileNames = files.map((file) => file.name);
    const latestFile = await findMostRecentFile(fileNames);

    // si no existe la carpeta Healthy crearlo
    const dir = path.join(__dirname, "Healthy");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Compara la version actual instala y la ultima version disponible
    let updatedVersion = await validateVersions(currentVersion, latestFile);
    // Si la version esta desactualizada, descarga la ultima version
    console.log('dupted', updatedVersion);

    if (!updatedVersion) {
      //validar si existen archivo en servidor para descargar
      if (!latestFile) {
        console.log("No se encontraron archivos para descargar.");
        appStatus.innerHTML = "No se encontraron archivos para descargar.";
        return;
      }
      // descargar archivo
      const localFilePath = path.join(__dirname, "Healthy", latestFile);
      const remoteFilePath = `/Healthy/${latestFile}`;
      //mostrar en progressbar el estado de descarga
      await client.downloadTo(localFilePath, remoteFilePath);
      console.log(`Descargado el archivo ${latestFile}.`);
      appStatus.innerHTML = `Descargado el archivo ${latestFile}.`;

      // descomprimir el archivo descargado
      await extractFile(latestFile);
    }
    await initApp();
  } catch (error) {
    console.log(error);
  } finally {
    client.close();
  }
}

async function initApp() {
  console.log("entrando funcions");

  // Iniciar Aplicacion
  const jarPath = path.join(__dirname, "Healthy", "Healthy.jar");
  console.log("jarPath", jarPath);

  exec(`java -jar '${jarPath}'`);
  
  console.log("este ya paso");
  console.log(`java -jar '${jarPath}'`);

  java.on("close", (code) => {
    console.log(`La aplicación Java se cerró con el código ${code}`);
    appStatus.innerHTML = `La aplicación Java se cerró con el código ${code}`;
  });
}

async function findMostRecentFile(fileNames) {
  let mostRecentFile = null;
  let mostRecentDate = new Date(0);

  fileNames.forEach((fileName) => {
    const dateMatch = fileName.match(/(\d{2})\.(\d{2})\.(\d{2})/);

    if (dateMatch) {
      const year = parseInt(`20${dateMatch[1]}`);
      const month = parseInt(dateMatch[2]) - 1; // meses en objetos Date van de 0 a 11
      const day = parseInt(dateMatch[3]);
      const fileDate = new Date(year, month, day);

      if (fileDate > mostRecentDate) {
        mostRecentDate = fileDate;
        mostRecentFile = fileName;
      }
    }
  });

  return mostRecentFile;
}

async function validateJarExistence() {
  // Ruta de la carpeta "Healthy"
  const healthyFolderPath = path.join(__dirname, "Healthy");

  // Leer la carpeta "Healthy" para encontrar un archivo .jar
  fs.readdir(healthyFolderPath, (err, files) => {
    if (err) {
      console.log(err);
      return;
    }

    // Encontrar el primer archivo .jar en la carpeta
    const jarFile = files.find((file) => path.extname(file) === ".jar");

    if (!jarFile) {
      console.log("No se encontró ningún archivo .jar en la carpeta Healthy.");
      appStatus.innerHTML =
        "No se encontró ningún archivo .jar en la carpeta Healthy.";
      return;
    }

    // Ejecutar el comando "java -jar nombre-del-archivo.jar -version" en una terminal
    const command = `java -jar "${path.join(
      healthyFolderPath,
      jarFile
    )}" -version`;
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
      currentVersion = stdout;
      return stdout;
    });
  });
  return currentVersion;
}

async function validateVersions(currentVersion, webVersion) {
  // Extraer la parte de la fecha de latestFile utilizando una expresión regular
  const match = webVersion.match(/(\d{2}\.\d{2}\.\d{2})/);
  const latestVersion = match ? match[1].replace(/\./g, "-") : null;

  // Comparar las dos fechas
  if (currentVersion === latestVersion) {
    console.log("La versión actual es la última disponible");
    appStatus.innerHTML = "La versión actual es la última disponible";
    return true;
  } else {
    console.log("Hay una versión más reciente disponible");
    appStatus.innerHTML = "Hay una versión más reciente disponible";
    return false;
  }
}

async function extractFile(zipFileName) {
  const zipFilePath = path.join(__dirname, "Healthy", zipFileName);

  fs.readFile(zipFilePath, async function (err, data) {
    if (err) {
      console.error(err);
      return;
    }

    const zip = await JSZip.loadAsync(data);

    const progressTotal = Object.keys(zip.files).length;
    let progressCurrent = 0;

    // Iterar sobre todas las entradas del archivo ZIP
    zip.forEach(async function (relativePath, file) {
      // Verificar si es un archivo o una carpeta
      if (!file.dir) {
        // Calcular la ruta absoluta del archivo en el sistema de archivos
        const filePath = path.join(__dirname, "Healthy", relativePath);

        // Crear la carpeta padre del archivo, si no existe
        const folderPath = path.dirname(filePath);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        // Extraer el archivo y escribir su contenido en el sistema de archivos
        const content = await file.async("nodebuffer");
        fs.writeFileSync(filePath, content);

        // Actualizar el progreso en la barra de progreso
        progressCurrent++;
        let progressBar = document.querySelector(".progress");
        let extractionPercentage = Math.floor(
          (progressCurrent / progressTotal) * 100
        );
        progressBar.style.width = `${extractionPercentage}%`;
      }
    });
    // Eliminar archivo zip
    fs.unlink(zipFilePath, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`${zipFilePath} fue eliminado`);
        appStatus.innerHTML = `${zipFilePath} fue eliminado`;
        window.close();
      }
    });
    console.log("Archivos extraídos exitosamente.");
    appStatus.innerHTML = "Archivos extraídos exitosamente.";
  });
}
