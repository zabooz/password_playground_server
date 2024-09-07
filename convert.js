import fs from 'fs/promises';
import { parse } from 'json2csv';

// Pfade zu den Dateien
const jsonFilePath = 'data/passwords.json';
const csvFolderPath = 'data/split-csv'; // Folder for split CSV files

const rowsPerFile = 1000000; // Anzahl der Zeilen pro CSV-Datei

async function convertJsonToCsv() {
  try {
    // Lese die JSON-Datei
    const data = await fs.readFile(jsonFilePath, 'utf8');
    
    // Parsen der JSON-Daten
    const jsonData = JSON.parse(data);

    // Überprüfe, ob die JSON-Daten leer sind
    if (!jsonData.length) {
      throw new Error('Die JSON-Daten sind leer.');
    }

    // Konvertiere JSON in CSV und splitte
    for (let i = 0; i < jsonData.length; i += rowsPerFile) {
      const chunk = jsonData.slice(i, i + rowsPerFile);

      // Erstelle ein Array von Objekten mit dem Schlüssel 'password'
      const formattedData = chunk.map(password => ({ password }));

      // Konvertiere das Array von Objekten in CSV
      const csvChunk = parse(formattedData, { fields: ['password'], header: true });

      const filePath = `${csvFolderPath}/passwords_part${Math.floor(i / rowsPerFile) + 1}.csv`;
      await fs.writeFile(filePath, csvChunk);
      console.log(`CSV file successfully written to ${filePath}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

convertJsonToCsv();


