const { app } = require("electron");
const { Client } = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const archiver = require("archiver");
const unzipper = require("unzipper");

// Version
let currentVersion = null;

window.addEventListener("DOMContentLoaded", () => {
  // Nueva llamada a la función para listar los archivos FTP
  loadFtpFiles();
});

async function loadFtpFiles() {
  await listFtpFiles();
}

async function listFtpFiles() {
  const client = new Client();
  let fileNames = [];

  await validateJarExistence();
  try {
    await client.access({
      host: "ftp.systemjaade.com",
      port: "21",
      user: "healthy-ant@systemjaade.com",
      password: "healthy.2020",
    });

    const files = await client.list("/Healthy");
    fileNames = files.map((file) => file.name);
    const latestFile = findMostRecentFile(fileNames);

    // si no existe la carpeta Healthy crearlo
    const dir = path.join(__dirname, "Healthy");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Compara la version actual instala y la ultima version disponible
    let updatedVersion = validateVersions(currentVersion, latestFile);
    // Si la version esta desactualizada, descarga la ultima version
    if (!updatedVersion) {
      //validar si existen archivo en servidor para descargar
      if (!latestFile) {
        console.log("No se encontraron archivos para descargar.");
        return;
      }
      // descargar archivo
      const localFilePath = path.join(__dirname, "Healthy", latestFile);
      await client.downloadTo(localFilePath, `/Healthy/${latestFile}`);
      console.log(`Descargado el archivo ${latestFile}.`);

      // descomprimir el archivo descargado
      await new Promise((resolve, reject) => {
        decompressFile(latestFile, () => {
          resolve();
        });
      });
    }
    // Iniciar Aplicacion
    // Ejecutar la aplicación Java
    console.log('gaaa');
    
    const jarPath = path.join(__dirname, "Healthy", "Healthy.jar");
    const java = spawn("java", ["-jar", jarPath]);

    java.on("close", (code) => {
      console.log(`La aplicación Java se cerró con el código ${code}`);
    });
  } catch (error) {
    console.log(error);
  } finally {
    client.close();
  }
}

function findMostRecentFile(fileNames) {
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

function validateJarExistence() {
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
      return null;
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

function validateVersions(currentVersion, webVersion) {
  console.log("currentVersion", currentVersion);
  console.log("webVersion", webVersion);
  // Extraer la parte de la fecha de latestFile utilizando una expresión regular
  const match = webVersion.match(/(\d{2}\.\d{2}\.\d{2})/);
  const latestVersion = match ? match[1].replace(/\./g, "-") : null;

  // Comparar las dos fechas
  if (currentVersion === latestVersion) {
    console.log("La versión actual es la última disponible");
    return true;
  } else {
    console.log("Hay una versión más reciente disponible");
    return false;
  }
}

function decompressFile(fileName) {
  // Ruta del archivo ZIP descargado
  const zipFilePath = path.join(__dirname, "Healthy", fileName);

  // Crear un stream de lectura para el archivo ZIP
  const readStream = fs.createReadStream(zipFilePath);

  // Crear un stream de escritura para extraer los archivos
  const writeStream = unzipper.Extract({
    path: path.join(__dirname, "Healthy"),
  });

  // Escuchar el evento "close" del stream de escritura
  writeStream.on("close", () => {
    console.log("Archivos extraídos exitosamente.");
  });

  // Piping de streams para extraer los archivos
  readStream.pipe(writeStream);

  // Eliminar archivo zip
  fs.unlink(zipFilePath, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log(`${zipFilePath} fue eliminado`);
    }
  });
}

function startApplication() {
  // Lanzar el aplicativo
  const jarFile = "Healthy.jar";
  exec(`java -jar ${jarFile}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}
