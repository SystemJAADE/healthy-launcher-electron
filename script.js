const { app } = require("electron");
const { Client } = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

window.addEventListener("DOMContentLoaded", () => {
  // Nueva llamada a la función para listar los archivos FTP
  loadFtpFiles();
});

async function loadFtpFiles() {
  await listFtpFiles();
  vaildateJarExistence();
  // downloadLatestFile();
}

async function listFtpFiles() {
  const client = new Client();
  let fileNames = [];
  try {
    await client.access({
      host: "ftp.systemjaade.com",
      port: "21",
      user: "healthy-ant@systemjaade.com",
      password: "healthy.2020",
    });

    const files = await client.list("/Healthy");
    fileNames = files.map((file) => file.name);
    const recentFile = findMostRecentFile(fileNames);
    console.log("recent: ", recentFile);

    const dir = path.join(__dirname, "Healthy");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    console.log('dir',dir);
    
    const localFilePath = path.join(__dirname, "Healthy", recentFile);
    await client.downloadTo(localFilePath, recentFile);
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

function vaildateJarExistence() {
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
      // console.log(stdout); // imprime version actual en sistema
      currentVersion = stdout;
    });
  });
}
