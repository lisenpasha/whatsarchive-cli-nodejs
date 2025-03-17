import fs from 'fs';
import path from 'path';

type FormatType = 'json' | 'txt' | 'html';

export class ChatExporter {
  private outputDir: string;
  private format: FormatType;
  private writeStream: fs.WriteStream | null = null;
  private isFirstMessage: boolean = true;

  constructor(outputDir: string, format: FormatType) {
    this.outputDir = outputDir;
    this.format = format;
  }

  public async initialize() {
    // Ensure output directory exists
    await fs.promises.mkdir(this.outputDir, { recursive: true });
    const outputFilePath = path.join(this.outputDir, `chat.${this.format}`);
    this.writeStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

    // Write format-specific headers
    if (this.format === 'json') {
      this.writeStream.write('{"chatLog":[\n');
    } else if (this.format === 'html') {
      this.writeStream.write('<html><head><title>Chat Export</title></head><body>\n');
    }
  }

  public writeMessage(message: any) {
    if (!this.writeStream) {
      throw new Error('Write stream was not initialized.');
    }

    const content = this.formatMessage(message);

    if (this.format === 'json') {
      if (!this.isFirstMessage) {
        this.writeStream.write(',\n');
      }
      this.isFirstMessage = false;
    }

    this.writeStream.write(content);
  }

  public async finalize() {
    if (!this.writeStream) return;

    // Write format-specific footers
    if (this.format === 'json') {
      this.writeStream.write('\n]\n}');
    } else if (this.format === 'html') {
      this.writeStream.write('</body></html>');
    }

    this.writeStream.end();
  }

  private formatMessage(message: any): string {
    switch (this.format) {
      case 'json':
        return JSON.stringify(message, null, 2);
      case 'txt':
        return `${message.hour} - ${message.person}: ${message.message || message.attachment}\n`;
      case 'html':
        return `<p><strong>${message.hour} - ${message.person}:</strong> ${
          message.message || `<a href="${message.attachment}">Attachment</a>`
        }</p>\n`;
      default:
        throw new Error(`Unsupported format: ${this.format}`);
    }
  }
}
