import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
/**
 * Converts an OPUS file to MP3 format.
 * @param opusFilePath - The path of the OPUS file to be converted.
 * @param outputDir - The directory where the MP3 file should be saved.
 * @returns The path of the converted MP3 file, or null if conversion fails.
 */
export function convertOpusToMp3(opusFilePath: string, outputDir: string): void {
  
    const mp3FilePath = opusFilePath.replace(/\.opus$/, '.mp3');
    const outputFilePath = path.join(outputDir, path.basename(mp3FilePath));
  
    try {
      // Run ffmpeg command to convert OPUS to MP3
      execSync(`ffmpeg -i "${opusFilePath}" -acodec libmp3lame "${outputFilePath}"`, { stdio: 'pipe' });
      
      console.log(`Converted OPUS to MP3: ${outputFilePath}`);
      fs.unlinkSync(opusFilePath); // Delete the original OPUS file after conversion
    } catch (error) {
      console.error(`Failed to convert OPUS to MP3: ${opusFilePath}`, error);
    }
  }