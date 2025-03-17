import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { parseChat } from './parsers/chatParser';
import path from 'path';
import { ChatExporter } from './exporters/chatExporter';
import { ZipHandler } from './utils/ZipHandler';
import { isToolAvailable } from './environment/toolChecker';


interface CLIArguments {
  input: string;
  output: string;
  convertTo: 'json' | 'txt' | 'html';
  convertOpus: boolean;
  noMedia: boolean;
}

const argv = yargs(hideBin(process.argv))
  .options({
    input: {
      alias: 'i',
      type: 'string',
      description: 'Path to the ZIP archive or text file containing the chat transcript',
      demandOption: true,
    },
    output: {
      alias: 'o',
      type: 'string',
      description: 'Path to the output folder where the processed files will be saved',
      demandOption: true,
    },
    convertTo: {
      alias: 'c',
      type: 'string',
      choices: ['json', 'txt', 'html'] as const,
      description: 'Output format for the chat transcript (json, txt, html)',
      default: 'json',
    },
    convertOpus: {
      type: 'boolean',
      description: 'Convert OPUS files to MP3 format',
      default: false,
    },
    noMedia: {
      type: 'boolean',
      description: 'Skip saving media files, only process chat transcript',
      default: false,
    },
  })
  .help()
  .parseSync() as CLIArguments;

const { input, output, convertTo, convertOpus, noMedia } = argv;

async function main() {
  try {
    
    const zipHandler = new ZipHandler(input);
    // Thoroughly check the validity of zip file and the text file inside, before consuming any operation.
    if (!zipHandler.isValidZip()) {
      return;
    }

    console.log(`Output directory: ${output}`);
    if (convertOpus) console.log("OPUS-to-MP3 conversion enabled.");
    if (noMedia) console.log("Skipping media file processing.");

    const outputMediaPath = noMedia ? null : path.resolve(output, 'media');
    const chatFileTypeCount = zipHandler.listFileTypes();
    
    // If convertOpus is true but there are no opus entries, even if ffmpeg is missing, we don't have to fail. 
    if (convertOpus && chatFileTypeCount.opus > 0 ){ 
      if (!isToolAvailable('ffmpeg')) {
        console.error("Cannot convert OPUS to MP3 because ffmpeg is not available.");
        return;
      }
    }

    // If media download is required but there are no media entries inside the zip, even if exiftool is missing, we don't have to fail. 
    if (!noMedia && outputMediaPath && zipHandler.countTotalFiles() > 0 ) {
      if (!isToolAvailable('exiftool')){
        console.error("Cannot validate media files because exiftool is not available.");
        return;
      }
      // Only trigger download when there are available files for download and exiftool is available.
      zipHandler.downloadMedia(outputMediaPath,convertOpus);
    }

    // Use the ChatExporter class to save the output in the specified format
    const exporter = new ChatExporter(output, convertTo);
    await exporter.initialize();

    const generator = parseChat(zipHandler, outputMediaPath);

    // Use the generator to process and export messages incrementally
    for await (const message of generator) {
      exporter.writeMessage(message); // Write each message as it's parsed
    }

    await exporter.finalize()

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
