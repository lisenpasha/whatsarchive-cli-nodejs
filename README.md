# WhatsArchive CLI Tool

WhatsArchive is a command-line tool to parse and export WhatsApp chat transcripts. It supports exporting data in multiple formats (JSON, TXT, HTML) and includes options for handling media files.

## Table of Contents
1. [Installation](#installation)
2. [Usage](#usage)
3. [Command-Line Options](#command-line-options)
4. [Generating Mock WhatsApp Chat](#generating-mock-whatsapp-chat)
5. [Examples](#examples)

---

## Installation

First, clone the repository and navigate into the project directory. Run the following command to install the required dependencies:

```bash
npm install
```

This tool requires `exiftool` and `ffmpeg` to be installed for media file validation and conversion.

#### Installing `exiftool`

To install `exiftool`, follow these steps:

- **macOS**: Run `brew install exiftool` if you have [Homebrew](https://brew.sh/) installed.
- **Linux**: Run `sudo apt install exiftool` (for Debian/Ubuntu-based systems).
- **Windows**: Download the installer from the official [ExifTool website](https://exiftool.org/) and follow the instructions.

#### Installing `ffmpeg`

To install `ffmpeg`, follow these steps:

- **macOS**: Run `brew install ffmpeg`.
- **Linux**: Run `sudo apt install ffmpeg` (for Debian/Ubuntu-based systems).
- **Windows**: Download the installer from the official [FFmpeg website](https://ffmpeg.org/download.html) and follow the instructions.

Ensure both `exiftool` and `ffmpeg` are accessible from the command line.

-----

## Usage


To use the tool, run the following command:

```bash
npm start -- --input <file_path> --output <output_directory> [options]
```

Replace `<file_path>` with the path to your  `.zip` file containing the WhatsApp chat transcript, and `<output_directory>` with the path where the parsed output will be saved.


## Command-Line Options

#### Option | Description
1. `input` <path>	**Required.**  Specifies the input file path.
2. `--output` <path>	**Required.** Specifies the output directory where the parsed data and/or media will be saved.
3. `--convert-to` <json | txt | html> **DEFAULT: JSON**	Specifies the output format. Supports json, txt, or html.
4. `--convert-opus`	Converts .opus audio files to .mp3 format for compatibility with more audio players. Requires ffmpeg.
5. `--no-media`	Skips downloading media files; only the chat transcript will be saved.

## Generating Mock WhatsApp Chat

The WhatsArchive CLI tool includes a mock data generator (`mocker.ts`) that creates a test `.zip` file containing a simulated WhatsApp chat transcript along with optional media files. This can be useful for testing the tool.

### **Usage**
To generate a mock `.zip` file, run the following command:

```bash
npm run mock -- --output <output_zip_path> [options]
```

- **`--output` `<path>`** (Required) - Specifies the output path where the mock `.zip` file will be saved.
- **`--messageCount` `<number>`** (Optional) - Number of messages to generate (default: `100`).
- **`--textToMediaRatio` `<number>`** (Optional) - Defines the ratio of text messages to media messages (default: `5`).
- **`--addMedia`** (Optional) - Includes media messages in the chat if enabled.

### **Examples**

#### **Generate a mock chat archive with 100 messages and no media**
```bash
npm run mock -- --output test_files/mock_chat.zip
```

#### **Generate a mock chat with 200 messages and media included**
```bash
npm run mock -- --output test_files/mock_chat.zip --messageCount 200 --addMedia
```

#### **Generate a chat with 50 messages where 1 in every 3 messages is a media message**
```bash
npm run mock -- --output test_files/mock_chat.zip --messageCount 50 --textToMediaRatio 3 --addMedia
```

### **How It Works**
- The script generates a chat transcript with realistic timestamps and randomized message content.
- If the `--addMedia` flag is used, the script randomly inserts media messages and includes sample media files (`.jpg`, `.opus`).
- The generated chat and media files are bundled into a `.zip` archive, simulating a real exported WhatsApp chat.

After generating the `.zip` file, you can use it as an input when running the WhatsArchive CLI tool:

```bash
npm start -- --input test_files/mock_chat.zip --output output
```

This will parse the mock chat and process it based on the provided options.

## Examples

#### BASIC USAGE

```bash
npm start -- --input test_files/test_zip.zip --output output
```
This will parse the chat from test_zip.zip, save the output in JSON format, and include all media files.


#### Specifying Output Format

```bash
npm start -- --input test_files/test_zip.zip --output output --convert-to html
```

This will parse the chat and save the output as an HTML file, including media files.

#### Skipping Media Files

```bash
npm start -- --input test_files/test_zip.zip --output output  --convert-to json --noMedia
```

This will parse the chat and save the output without downloading any media files.


#### Converting .opus to .mp3


```bash
npm start -- --input test_files/test_zip_opus.zip --output output  --convert-to json --convertOpus
```

This will parse the chat, convert .opus audio files to .mp3, and download other media files.
