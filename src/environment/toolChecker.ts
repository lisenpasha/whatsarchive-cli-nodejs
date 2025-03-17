import { execSync } from 'child_process';
import { getCommandForToolCheck } from './os';

/**
 * Checks if a given command-line tool is available on the system.
 * This function adapts to the user's OS, checking if the specified tool 
 * is accessible within the PATH or a known install location.
 * 
 * @param command - The command to check (e.g., "ffmpeg" or "exiftool").
 * @returns true if the command is available, false otherwise.
 */
export function isToolAvailable(command: string): boolean {
  try {
    // Determine command based on OS
    const cmd = getCommandForToolCheck(command)
    
    // Run the command and capture output
    const toolPath = execSync(cmd, { stdio: 'pipe' }).toString().trim();
    
    // If output is empty, tool not found
    if (!toolPath) {
      console.error(`🔴 ${command} is not installed or accessible in PATH on this ${process.platform} system.`);
      return false;
    }
    
    // Tool found, logging path for confirmation
    console.log(`✅ ${command} found at: ${toolPath}`);
    return true;

  } catch (error) {
    // Enhanced error handling with OS-specific instructions
    if (process.platform === 'win32') {
      console.error(`🔴 ${command} is not installed or accessible on Windows. Please install it and ensure it's in the PATH.`);
    } else if (process.platform === 'darwin') {
      console.error(`🔴 ${command} is not installed or accessible on macOS. Install it using Homebrew with \`brew install ${command}\` and ensure it's in PATH.`);
    } else {
      console.error(`🔴 ${command} is not installed or accessible on Linux. Try installing it with your package manager, e.g., \`sudo apt install ${command}\`.`);
    }
    return false;
  }
}
