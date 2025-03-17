import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { faker } from '@faker-js/faker';

interface CLIArguments {
    output: string;
    messageCount: number;
    textToMediaRatio: number;
    addMedia: boolean;
}

const argv = yargs(hideBin(process.argv))
    .options({
        output: {
            alias: 'o',
            type: 'string',
            description: 'Path to the output file where the mock data will be saved',
            demandOption: true,
        },
        messageCount: {
            alias: 'm',
            type: 'number',
            description: 'Number of messages to generate',
            default: 100,
        },
        textToMediaRatio: {
            alias: 'r',
            type: 'number',
            description: 'Ratio of text messages to media messages',
            default: 5,
        },
        addMedia: {
            alias: 'a',
            type: 'boolean',
            description: 'Add media messages to the chat',
            default: false,
        },
    })
    .help()
    .parseSync() as CLIArguments;

const { output, messageCount, textToMediaRatio, addMedia } = argv;

function createTimestampGenerator() {
    // Start from a random date in the past
    const startDate = new Date(
        Date.now() - Math.floor(Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)
    );
    let currentTimestamp = startDate.getTime();
    const increment = 60 * 1000; // Increment by 1 minute

    return function getNextTimestamp(): string {
        const timestamp = new Date(currentTimestamp);
        const date = timestamp.toLocaleDateString('en-US');
        const time = timestamp.toLocaleTimeString('en-US', { hour12: true });
        currentTimestamp += increment;
        return `${date}, ${time}`;
    };
}

async function createChatFile(
    chatFilePath: string,
    numLines: number,
    addMedia: boolean,
    textToMediaRatio: number,
    mediaFolderPath: string,
    fixtureMediaFiles: string[]
): Promise<void> {
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(chatFilePath, { flags: 'w' });

        let linesGenerated = 0;
        const batchSize = 10000; // Number of lines per batch
        const totalBatches = Math.ceil(numLines / batchSize);
        const getNextTimestamp = createTimestampGenerator();
        const mediaFiles: string[] = [];

        function writeBatch(batchNumber: number) {
            if (batchNumber > totalBatches) {
                // All batches written
                stream.end(() => resolve());
                return;
            }

            let batchData = '';
            for (let i = 0; i < batchSize && linesGenerated < numLines; i++) {
                const sender = faker.person.fullName(); // Generate random name
                const timestamp = getNextTimestamp();

                if (
                    addMedia &&
                    linesGenerated % (textToMediaRatio + 1) === 0 &&
                    fixtureMediaFiles.length > 0
                ) {
                    // Add media message
                    const mediaFileIndex = Math.floor(Math.random() * fixtureMediaFiles.length);
                    const baseMediaFile = fixtureMediaFiles[mediaFileIndex];
                    const ext = path.extname(baseMediaFile);

                    let mediaPrefix: string;
                    if (ext === '.jpg' || ext === '.png') {
                        mediaPrefix = 'IMG';
                    } else if (ext === '.opus' || ext === '.mp3') {
                        mediaPrefix = 'AUD';
                    } else {
                        mediaPrefix = 'FILE';
                    }

                    const sanitizedTimestamp = timestamp.replace(/[^0-9]/g, '');
                    const mediaFileName = `${mediaPrefix}-${sanitizedTimestamp}-${linesGenerated}${ext}`;
                    const mediaFilePath = path.join(mediaFolderPath, mediaFileName);

                    // Copy the base media file to the media folder with the new name
                    fs.copyFileSync(baseMediaFile, mediaFilePath);
                    mediaFiles.push(`media/${mediaFileName}`);
                    batchData += `‎[${timestamp}] ${sender}: ‎<attached: ${mediaFileName}>\n`;
                } else {
                    // Add text message with exotic characters and emojis
                    let message = faker.lorem.sentence();
                    // Include random emojis and exotic characters
                    if (Math.random() < 0.5) {
                        message += ' ' + faker.internet.emoji();
                    }
                    if (Math.random() < 0.3) {
                        message += ' ' + faker.string.alphanumeric(5);
                    }
                    batchData += `[${timestamp}] ${sender}: ${message}\n`;
                }
                linesGenerated++;
            }

            // Write the batch to the stream
            const canWriteMore = stream.write(batchData);

            // Output progress
            const progress = ((linesGenerated / numLines) * 100).toFixed(2);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(`Mock Chat File Creation Progress: ${progress}%`);

            if (!canWriteMore) {
                // Wait for 'drain' event before writing next batch
                stream.once('drain', () => {
                    setImmediate(() => writeBatch(batchNumber + 1));
                });
            } else {
                // Continue writing
                setImmediate(() => writeBatch(batchNumber + 1));
            }
        }

        // Start writing batches
        writeBatch(1);

        stream.on('error', (error) => reject(error));
    });
}

async function createMockZip(
    outputZipPath: string,
    chatFilePath: string,
    mediaFilesFolder: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        /**
         * ADMZip is buggy:
         * An error occurred during the process: RangeError: The value of "size" is out of range. It must be >= 0 && <= 4294967296. Received 6_683_259_921
         * at Function.alloc (node:buffer:390:3)
         * at Object.compressToBuffer (whatsarchive-cli/node_modules/adm-zip/zipFile.js:330:38)
         * at Object.writeZip (whatsarchive-cli/node_modules/adm-zip/adm-zip.js:892:32)
         */
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } }); // Maximum compression

        // Handle archive events
        output.on('close', () => {
            console.log('\n'); // Add newline after progress bar
            console.log(`Mock ZIP file created at: ${outputZipPath}`);
            console.log(`Total bytes: ${archive.pointer()} written to ZIP.`);
            resolve();
        });

        output.on('error', (err) => {
            reject(err);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        // Pipe archive data to the output file
        archive.pipe(output);

        let totalFiles = 1; // Start with 1 for the chat file
        if (fs.existsSync(mediaFilesFolder)) {
            const mediaFiles = fs.readdirSync(mediaFilesFolder);
            totalFiles += mediaFiles.length;
        }

        // Add progress listener
        archive.on('progress', (progress) => {
            const percent = ((progress.entries.processed / totalFiles) * 100).toFixed(2);
            if (progress.entries.processed % 311 === 0 || progress.entries.processed === totalFiles) {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(`ZIP Progress: ${percent}% (${progress.entries.processed}/${totalFiles})`);
            }
        });

        // Add chat file
        archive.file(chatFilePath, { name: path.basename(chatFilePath) });

        // Add media files
        if (fs.existsSync(mediaFilesFolder)) {
            const mediaFiles = fs.readdirSync(mediaFilesFolder);
            for (const file of mediaFiles) {
                const filePath = path.join(mediaFilesFolder, file);
                const zipPath = path.join('media', file);
                archive.file(filePath, { name: zipPath });
            }
        }

        // Finalize the archive
        archive.finalize();
    });
}

async function main() {
    const scriptDir = __dirname;
    const fixturesFolder = path.resolve(scriptDir, '../fixtures'); // Corrected path to 'fixtures' folder
    const mediaFolder = path.join(fixturesFolder, 'media');
    const chatFilePath = path.join(fixturesFolder, '_chat.txt');
    const outputZipPath = path.resolve(output); // Output path from CLI arguments

    // Base files for media (ensure these files exist in your 'fixtures' directory)
    const fixtureMediaFiles = [
        path.join(fixturesFolder, 'sample.jpg'),
        path.join(fixturesFolder, 'sample.opus'),
    ];

    try {
        // Ensure media folder exists
        if (!fs.existsSync(mediaFolder)) {
            fs.mkdirSync(mediaFolder, { recursive: true });
        }

        // Create chat file and media files
        console.log('Generating mock chat data...');
        await createChatFile(
            chatFilePath,
            messageCount,
            addMedia,
            textToMediaRatio,
            mediaFolder,
            fixtureMediaFiles
        );
        console.log('\n'); // Add newline after progress bar

        // Create ZIP file
        console.log('Creating ZIP file...');
        await createMockZip(outputZipPath, chatFilePath, mediaFolder);

        console.log(`Mock Chat data generation completed successfully and saved to: ${outputZipPath}`);

        // Cleanup
        if (fs.existsSync(chatFilePath)) {
            fs.unlinkSync(chatFilePath);
            console.log(`Deleted file: ${chatFilePath}`);
        }

        if (fs.existsSync(mediaFolder)) {
            const files = fs.readdirSync(mediaFolder);
            for (const file of files) {
                fs.unlinkSync(path.join(mediaFolder, file));
            }
            fs.rmdirSync(mediaFolder);
            console.log(`Deleted folder and its contents: ${mediaFolder}`);
        }
    } catch (error) {
        console.error('An error occurred during the process:', error);
    }
}

main();