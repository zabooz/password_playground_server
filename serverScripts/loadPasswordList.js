import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();
const dropboxFileUrl = process.env.DROPBOX_FILE_URL 

export async function loadPasswordList() {

    let passwordList

    try {
      const response = await axios.get(dropboxFileUrl, {
        responseType: "text",
      });

      passwordList = response.data.split("\n").filter((line) => line !== "");
  
      console.log("data loaded");
      console.log(typeof passwordList)
  
      
      
    } catch (error) {
        console.error("dropbbox fail", error);
    }
    return passwordList;
  }