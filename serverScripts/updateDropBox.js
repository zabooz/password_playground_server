import fs from "fs";
import { Dropbox } from "dropbox";
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const DROPBOX_TOKEN = process.env.DROPBOX_TOKEN;
const DROPBOX_FILE_PATH =  process.env.DROPBOX_FILE_PATH



const dbx = new Dropbox({ accessToken: DROPBOX_TOKEN, fetch });


export async function updatePasswordList(passwordList) {
    try {
      // Füge neue Passwörter hinzu
      
      
  
      // Speichere die aktualisierte Liste in eine lokale Datei
      const updatedFilePath = './updated_password_list.txt';
      fs.writeFileSync(updatedFilePath, passwordList.join('\n'));
  
      // Lade die aktualisierte Datei zu Dropbox hoch
      const fileContent = fs.readFileSync(updatedFilePath);
      await dbx.filesUpload({
        path: DROPBOX_FILE_PATH,
        contents: fileContent,
        mode: 'overwrite', // überschreibe die vorhandene Datei
      });
  
      console.log('File updated successfully');
    } catch (error) {
      console.error('Update fail', error);
    }
  }