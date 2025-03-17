/**
 * Returns the command needed to check if a tool is available,
 * based on the operating system.
 *
 * @param command - The command to locate (e.g., "ffmpeg" or "exiftool").
 * @returns The OS-specific command string for locating the tool.
 */
export function getCommandForToolCheck(command: string): string {
    if (process.platform === 'win32') {
      return `where ${command}`;
    } else if (process.platform === 'darwin') {
      return `command -v ${command} || /usr/local/bin/${command}`; // MacOS with Homebrew path check
    } else {
      return `command -v ${command}`; // Default for Linux or other Unix-based OS
    }
  }