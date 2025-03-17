import fs from 'fs';
import fsSync from 'fs'
import path from 'path';
import AdmZip, { IZipEntry } from 'adm-zip';
import { execSync } from 'child_process';
import { convertOpusToMp3 } from './audioConverter';
import { Readable } from 'stream';
import readline from 'readline';

/**
 * A class to handle ZIP file operations.
 */
export class ZipHandler {
  private filePath: string;
  private zipEntries: IZipEntry[] = []; // Store ZIP entries once validated

  /**
   * Initializes the ZipHandler with the file path.
   * @param filePath - The path to the ZIP file to operate on.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    this.zipEntries = []
  }

  /**
   * Checks if the file is a valid ZIP archive.
   * @returns true if the file is a valid ZIP archive, false otherwise.
   */
  public isValidZip(): boolean {
    try {
      // Check if the file exists
      if (!fsSync.existsSync(this.filePath)) {
        console.error("File does not exist.");
        return false;
      }

      const ext = path.extname(this.filePath).toLowerCase();

      // Basic check done early, so we don't consume unnecessary memory.
      if (ext === '.zip') {
        // Try to open the file as a ZIP archive
        const zip = new AdmZip(this.filePath);
        this.zipEntries = zip.getEntries(); // This will throw an error if the file isn't a valid ZIP

        // Check the validity of the text file inside the ZIP
        if (!this.isValidTextFileInZip()) {
          console.error("ZIP file does not contain a valid text file.");
          return false;
        }

        return true;
      }
      else {
        throw new Error("Unsupported file type. Only .zip files are allowed.");
      }
    } catch (error) {
      console.error("Invalid ZIP file:", error);
      return false;
    }
  }

  /**
   * Lists the types of files in the ZIP archive and counts specific file types.
   * @returns An object containing the count of each specified file type.
   */
  public listFileTypes(): { jpg: number, jpeg: number, png: number, mp3: number, opus: number, mp4: number, txt: number } {
    const fileCounts = { jpg: 0, jpeg: 0, png: 0, mp3: 0, opus: 0, mp4: 0, txt: 0 };

    this.zipEntries.forEach(entry => {
      const ext = path.extname(entry.entryName).toLowerCase();
      switch (ext) {
        case '.jpg':
          fileCounts.jpg++;
          break;
        case '.jpeg':
          fileCounts.jpeg++;
          break;
        case '.png':
          fileCounts.png++;
          break;
        case '.mp3':
          fileCounts.mp3++;
          break;
        case '.opus':
          fileCounts.opus++;
          break;
        case '.mp4':
          fileCounts.mp4++;
          break;
        case '.txt':
          fileCounts.txt++;
          break;
        default:
          break;
      }
    });

    return fileCounts;
  }

  /**
   * Checks the validity of the text file in the ZIP archive.
   * Ensures there is exactly one .txt file named '_chat.txt'.
   * @returns true if the ZIP file contains a valid text file, false otherwise.
   */
  public isValidTextFileInZip(): boolean {
    const fileCounts = this.listFileTypes();

    // Check if there is exactly one .txt file
    if (fileCounts.txt === 0) {
      console.error("No .txt file found inside the ZIP archive.");
      return false;
    }

    if (fileCounts.txt > 1) {
      console.error("More than one .txt file found inside the ZIP archive.");
      return false;
    }

    // At this point, we know there is exactly one .txt file.
    const textFileEntry = this.zipEntries.find(entry => entry.entryName === '_chat.txt');

    if (!textFileEntry) {
      console.error("The .txt file is not named '_chat.txt'.");
      return false;
    }

    return true;
  }

  /**
   * Reads and returns a line-by-line stream of the `_chat.txt` file in the ZIP archive.
   * The goal is to read a potentially large _chat.txt file from a ZIP archive, line-by-line, in a memory-efficient way. 
   * We accomplish this using streaming rather than loading the entire file into memory at once.
   * Assumes that all necessary checks have already been performed.
   * @returns A readable line-by-line stream of the `_chat.txt` file.
   */
  public getTextFileLineStream(): readline.Interface {
     // Find the `_chat.txt` file entry directly from the stored zipEntries
     const textFileEntry = this.zipEntries.find(entry => entry.entryName === '_chat.txt');
    //  Contains the entire content of _chat.txt as a buffer.
     const fileDataBuffer = textFileEntry ? textFileEntry.getData(): null
     // Creates a new stream object of type Readable so we can convert the file data to a readable stream, since AdmZip doesn’t directly support streaming.
     const fileStream = new Readable();
    //  This makes the file's content available to the stream, so we can process it line-by-line later.
     fileStream.push(fileDataBuffer);
     fileStream.push(null); // End the stream

     // Use readline to read the stream line-by-line
    return readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity // Handle different newline formats
    });
  }

  /**
 * Counts the total number of files in the ZIP archive.
 * @returns The total count of files in the ZIP archive.
 */
  public countTotalFiles(): number {
    // Return the total count of files in the ZIP archive, excluding '_chat.txt'
    // since it is considered metadata and does not need to be processed as media.
    return this.zipEntries.filter(entry => entry.entryName !== '_chat.txt').length;
  }

  public getZipEntries(): IZipEntry[] {
    return this.zipEntries;
  }

  /**
     * Verifies if a media file is valid by checking its metadata with exiftool.
     * @param filePath - The path to the media file.
     * @returns true if the media file is valid, false otherwise.
     */
  private isValidMedia(filePath: string): boolean {
    try {
      // Run exiftool to validate the file's metadata
      execSync(`exiftool "${filePath}"`);
      return true;
    } catch (error) {
      console.error(`Invalid media file detected: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Extracts and saves media files from the ZIP archive to the specified directory.
   * @param mediaPath - The base path where media files should be stored.
   * @param convertOpus - Whether to convert OPUS files to MP3.
   */
  public downloadMedia(mediaPath: string, convertOpus: boolean): void {
    // Iterate through each file in the ZIP archive
    this.zipEntries.forEach((entry) => {
      const fileName = entry.entryName;

      // Check if the entry is a supported media file by extension and is not a directory
      if (/\.(jpg|jpeg|png|mp3|opus|mp4)$/.test(fileName) && !entry.isDirectory) {
        const filePath = path.join(mediaPath, fileName);

        // Ensure the directory exists, if not, create it
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file temporarily to verify its integrity
        fs.writeFileSync(filePath, entry.getData());

        // Validate the media file with exiftool
        if (!this.isValidMedia(filePath)) {
          console.error(`Invalid media file skipped: ${filePath}`);
          fs.unlinkSync(filePath); // Delete invalid media file
        } else {
          console.log(`Extracted and validated media file: ${filePath}`);
        }

        // Convert OPUS to MP3 if convertOpus is true and file is an OPUS file
        if (convertOpus && /\.opus$/.test(fileName)) {
           convertOpusToMp3(filePath, mediaPath);
        }
      }
    });
  }
}
