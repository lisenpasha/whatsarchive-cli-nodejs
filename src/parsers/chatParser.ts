export interface ChatMessage {
    type: "msg";
    index: number;
    tstamp: number;
    hour: string;
    person: string;
    message?: string;
    attachment?: string;
  }

import { ZipHandler } from '../utils/ZipHandler';
  
  
  /**
   * Parses a WhatsApp chat transcript and returns an array of structured chat messages.
   * Read the file line-by-line without loading it all at once.
   * @param lineStram - The readline interface for line-by-line reading.
   * @param mediaPath - The base path where media files should be stored.
   * @returns A Promise that resolves with an array of structured chat messages.
   */
  export async function* parseChat(zipHandler: ZipHandler, mediaPath: string | null): AsyncGenerator<ChatMessage>  {
    let messageIndex = 1;
    const lineStream = zipHandler.getTextFileLineStream();
  
    //  Asynchronously iterate over an async iterable, such as a stream. 
    // Each time a new line is available in the lineStream, it’s processed by the loop.
    for await (const line of lineStream) {
      try {
        const message = parseLine(line, messageIndex, mediaPath);
        if (message) {
          yield message; // Yield each parsed message
          messageIndex++;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.warn(`Skipping invalid line due to error: ${error.message}`);
        } else {
          console.warn("Skipping invalid line due to unknown error");
        }
      }
    }
  }
  
  
  /**
   * Parses a single line from the chat transcript and converts it into a ChatMessage.
   * @param line - A single line of text from the chat transcript.
   * @param index - The message index for tracking the order.
   * @param mediaPath - The base path where media files should be stored.
   * @returns A structured ChatMessage or null if the line is not a valid message.
   */
  function parseLine(line: string, index: number, mediaPath: string | null): ChatMessage | null {
    if (typeof line !== 'string') return null;
  
    // Check if the line contains a date or is an attachment line
    const isDateLine = line.startsWith('[') && line.indexOf(']') !== -1;
    const isAttachmentLine = line.includes('<attached:');
  
    if (!isDateLine && !isAttachmentLine) {
      console.log("Skipping line as it doesn't start with a date or attachment format:", line);
      return null;
    }
  
    try {
      // Extract date-time and message parts for date lines
      const closingBracketIndex = line.indexOf(']');
      const dateTimePart = isDateLine ? line.substring(1, closingBracketIndex).trim() : null;
      const messagePart = line.substring(closingBracketIndex + 1).trim();
    
      let date = "", timeWithPeriod = "", person = "", content = "";
      if (isDateLine && dateTimePart) {
        // Split dateTimePart into date and time
        [date, timeWithPeriod] = dateTimePart.split(',').map(part => part.trim());
        const colonIndex = messagePart.indexOf(':');
        if (colonIndex === -1) return null;
        person = messagePart.substring(0, colonIndex).trim();
        content = messagePart.substring(colonIndex + 1).trim();
      } else if (isAttachmentLine) {
        // Handle attachment lines with date-time parsing
        const dateMatch = line.match(/\[(.*?)\]/);
        if (dateMatch) {
          const [attachmentDate, attachmentTimeWithPeriod] = dateMatch[1].split(',').map(part => part.trim());
          date = attachmentDate;
          timeWithPeriod = attachmentTimeWithPeriod;
        }
        const attachmentIndex = line.indexOf('<attached:');
        person = line.substring(line.indexOf(']') + 1, attachmentIndex).trim();
        content = line.substring(attachmentIndex + 10, line.indexOf('>')).trim(); // Extract attachment name
        
        // Directly remove the last two characters of person
        person = person.slice(0, -3);
      }
    
      const tstamp = date && timeWithPeriod ? new Date(`${date} ${timeWithPeriod}`).getTime() / 1000 : 0;
      const isAttachment = /\.(jpg|jpeg|png|mp3|opus|mp4)$/.test(content);

      // Dynamically set attachment path, based if noMedia is true or false
      let attachmentPath : string = ""

      if(isAttachment){
        if (mediaPath){ // Not null
          attachmentPath = `${mediaPath}/${content}`
        }
        else {
          attachmentPath = content
        }
      }
    
      return {
        type: "msg",
        index,
        tstamp,
        hour: timeWithPeriod,
        person,
        message: isAttachment ? undefined : content,
        attachment: isAttachment ? attachmentPath : undefined,
      };
    }
    catch (error) {
      if (error instanceof Error) {
        console.warn(`Failed to parse line: ${line}. Error: ${error.message}`);
      } else {
        console.warn("Failed to parse line due to an unknown error.");
      }
      return null; // Skip this line and continue processing others
    }
  }
  
  
  
  
  