#!/usr/bin/env node
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

const execPromise = promisify(exec);

// Config file path
const CONFIG_FILE = path.join(homedir(), '.meeting-transcript-config.json');

// Load config from file
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Warning: Could not read config file, will prompt for API key'));
  }
  return {};
}

// Save config to file
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log(chalk.green('✅ API key saved successfully'));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Warning: Could not save config file. You may need to enter your API key again next time.'));
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const parsed = {
    video: null,
    audio: null,
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg.startsWith('--video=')) {
      parsed.video = arg.split('=')[1];
    } else if (arg.startsWith('--audio=')) {
      parsed.audio = arg.split('=')[1];
    }
  }

  return parsed;
}

// Show help message
function showHelp() {
  console.log(chalk.blue.bold('\n📹 Meeting Transcript Tool'));
  console.log(chalk.gray('A production-ready CLI tool to process meeting videos/audio and generate transcripts using OpenAI Whisper\n'));
  
  console.log(chalk.yellow.bold('Usage:'));
  console.log('  meeting-transcript --video=/path/to/video.mp4');
  console.log('  meeting-transcript --audio=/path/to/audio.mp3');
  console.log('  meeting-transcript --help\n');
  
  console.log(chalk.yellow.bold('Options:'));
  console.log('  --video=<path>    Process a video file (extracts audio, transcribes, summarizes)');
  console.log('  --audio=<path>    Process an audio file (chunks, transcribes, summarizes)');
  console.log('  --help, -h        Show this help message\n');
  
  console.log(chalk.yellow.bold('Examples:'));
  console.log('  meeting-transcript --video=./meeting.mp4');
  console.log('  meeting-transcript --audio=~/recordings/call.mp3');
  console.log('  meeting-transcript --video=/Users/john/Documents/board-meeting.mov\n');
  
  console.log(chalk.yellow.bold('Requirements:'));
  console.log('  • OpenAI API key (will be saved after first use)');
  console.log('  • ffmpeg installed for video/audio processing');
  console.log('  • Node.js v18 or higher\n');
  
  console.log(chalk.yellow.bold('Configuration:'));
  console.log('  API key is saved to: ~/.meeting-transcript-config.json');
  console.log('  You can also set OPENAI_API_KEY environment variable\n');
  
  console.log(chalk.green('For more information, visit: https://github.com/your-repo/meeting-transcript'));
}

// Validate and setup OpenAI API key
async function setupOpenAIKey() {
  let apiKey = process.env.OPENAI_API_KEY;
  let config = loadConfig();
  let keySource = null;
  
  // Check environment variable first
  if (apiKey) {
    keySource = 'environment variable';
  } 
  // Then check saved config
  else if (config.openaiApiKey) {
    apiKey = config.openaiApiKey;
    keySource = 'saved configuration';
  }
  
  if (apiKey) {
    // Show masked API key and ask for confirmation
    const maskedKey = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(chalk.green(`🔑 Found OpenAI API key from ${keySource}: ${maskedKey}`));
    
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Use this API key?',
        default: true
      }
    ]);
    
    if (!confirmed) {
      apiKey = null;
      // If rejecting saved key, offer to delete it
      if (keySource === 'saved configuration') {
        const { deleteSaved } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'deleteSaved',
            message: 'Delete the saved API key?',
            default: true
          }
        ]);
        
        if (deleteSaved) {
          delete config.openaiApiKey;
          saveConfig(config);
          console.log(chalk.green('🗑️  Saved API key deleted'));
        }
      }
    }
  }
  
  if (!apiKey) {
    console.log(chalk.yellow('\n🔑 OpenAI API key required'));
    console.log(chalk.gray('You can get one at: https://platform.openai.com/api-keys\n'));
    
    const { inputKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'inputKey',
        message: 'Enter your OpenAI API key:',
        mask: '*',
        validate: (input) => {
          if (!input || input.length < 20) {
            return 'Please enter a valid OpenAI API key';
          }
          return true;
        }
      }
    ]);
    
    apiKey = inputKey;
    
    // Ask if user wants to save the API key
    const { saveKey } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saveKey',
        message: 'Save this API key for future use?',
        default: true
      }
    ]);
    
    if (saveKey) {
      config.openaiApiKey = apiKey;
      saveConfig(config);
    }
  }
  
  // Validate API key
  console.log(chalk.blue('🔍 Validating API key...'));
  const spinner = ora('Testing API connection').start();
  
  try {
    const openai = new OpenAI({ apiKey });
    await openai.models.list();
    spinner.succeed('API key validated successfully');
    return openai;
  } catch (error) {
    spinner.fail('Invalid API key or connection failed');
    console.error(chalk.red('Error:', error.message));
    
    // If this was a saved key that failed, offer to delete it
    if (keySource === 'saved configuration') {
      console.log(chalk.yellow('\n⚠️  The saved API key appears to be invalid.'));
      const { deleteBadKey } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deleteBadKey',
          message: 'Delete the invalid saved API key?',
          default: true
        }
      ]);
      
      if (deleteBadKey) {
        delete config.openaiApiKey;
        saveConfig(config);
        console.log(chalk.green('🗑️  Invalid API key deleted'));
      }
    }
    
    process.exit(1);
  }
}

// Collect meeting information from user
async function collectMeetingInfo() {
  console.log(chalk.blue('\n📝 Meeting Information'));
  console.log(chalk.gray('Please provide the following details:\n'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'date',
      message: 'Meeting date (YYYY-MM-DD):',
      default: new Date().toISOString().split('T')[0],
      validate: (input) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          return 'Please enter date in YYYY-MM-DD format';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'title',
      message: 'Project/Meeting title:',
      validate: (input) => {
        if (!input.trim()) {
          return 'Please enter a title';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      validate: (input) => {
        if (!input.trim()) {
          return 'Please enter a description';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'participants',
      message: 'Participants (comma-separated, e.g., Dan, Ben, Claudia):',
      validate: (input) => {
        if (!input.trim()) {
          return 'Please enter at least one participant';
        }
        return true;
      }
    }
  ]);
  
  return {
    date: answers.date,
    title: answers.title,
    description: answers.description,
    participants: answers.participants.split(',').map(p => p.trim()).join(', ')
  };
}

// Generate transcript header
function generateTranscriptHeader(meetingInfo) {
  return `⸻

Transcript: ${meetingInfo.title}

Date: ${meetingInfo.date}
Project: ${meetingInfo.description}
Participants: ${meetingInfo.participants}

⸻

`;
}

// Sanitize filename for filesystem compatibility
function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces
}

// Generate output folder name
function generateOutputFolderName(meetingInfo) {
  const sanitizedTitle = sanitizeFilename(meetingInfo.title);
  return `${meetingInfo.date} - ${sanitizedTitle}`;
}

// Process video file
async function processVideoFile(videoPath, meetingInfo, openai) {
  const absoluteVideoPath = path.resolve(videoPath);
  
  if (!fs.existsSync(absoluteVideoPath)) {
    console.error(chalk.red(`❌ Video file not found: ${absoluteVideoPath}`));
    process.exit(1);
  }
  
  const videoDir = path.dirname(absoluteVideoPath);
  const outputFolderName = generateOutputFolderName(meetingInfo);
  const outputDir = path.join(videoDir, outputFolderName);
  const audioDir = path.join(outputDir, 'audio');
  
  // Create output directories
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  console.log(chalk.blue(`\n🎬 Processing video: ${path.basename(absoluteVideoPath)}`));
  console.log(chalk.gray(`Output directory: ${outputDir}\n`));
  
  // 1. Extract full audio
  console.log(chalk.yellow('📢 Extracting audio from video...'));
  const fullAudioPath = path.join(audioDir, 'full-audio.mp3');
  const extractSpinner = ora('Extracting audio track').start();
  
  try {
    const extractCommand = `ffmpeg -i "${absoluteVideoPath}" -q:a 0 -map a "${fullAudioPath}" -y`;
    await execPromise(extractCommand);
    extractSpinner.succeed('Audio extracted successfully');
  } catch (error) {
    extractSpinner.fail('Failed to extract audio');
    console.error(chalk.red('Error:', error.message));
    process.exit(1);
  }
  
  // 2. Split audio into chunks
  console.log(chalk.yellow('\n✂️  Splitting audio into 10-minute chunks...'));
  const chunkSpinner = ora('Creating audio chunks').start();
  
  try {
    const chunkDuration = '600'; // 10 minutes
    const chunkOutputPattern = path.join(audioDir, 'audio_%03d.mp3');
    const splitCommand = `ffmpeg -i "${fullAudioPath}" -f segment -segment_time ${chunkDuration} -q:a 0 -map a "${chunkOutputPattern}" -y`;
    await execPromise(splitCommand);
    chunkSpinner.succeed('Audio chunks created');
  } catch (error) {
    chunkSpinner.fail('Failed to create audio chunks');
    console.error(chalk.red('Error:', error.message));
    process.exit(1);
  }
  
  // 3. Process audio chunks
  await processAudioChunks(audioDir, outputDir, meetingInfo, openai);
  
  console.log(chalk.green(`\n✅ Video processing completed!`));
  console.log(chalk.gray(`Files saved to: ${outputDir}`));
}

// Process audio file
async function processAudioFile(audioPath, meetingInfo, openai) {
  const absoluteAudioPath = path.resolve(audioPath);
  
  if (!fs.existsSync(absoluteAudioPath)) {
    console.error(chalk.red(`❌ Audio file not found: ${absoluteAudioPath}`));
    process.exit(1);
  }
  
  const audioDir = path.dirname(absoluteAudioPath);
  const outputFolderName = generateOutputFolderName(meetingInfo);
  const outputDir = path.join(audioDir, outputFolderName);
  const chunksDir = path.join(outputDir, 'audio');
  
  // Create output directories
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }
  
  console.log(chalk.blue(`\n🎵 Processing audio: ${path.basename(absoluteAudioPath)}`));
  console.log(chalk.gray(`Output directory: ${outputDir}\n`));
  
  // Split audio into chunks
  console.log(chalk.yellow('✂️  Splitting audio into 10-minute chunks...'));
  const chunkSpinner = ora('Creating audio chunks').start();
  
  try {
    const chunkDuration = '600'; // 10 minutes
    const chunkOutputPattern = path.join(chunksDir, 'audio_%03d.mp3');
    const splitCommand = `ffmpeg -i "${absoluteAudioPath}" -f segment -segment_time ${chunkDuration} -q:a 0 -map a "${chunkOutputPattern}" -y`;
    await execPromise(splitCommand);
    chunkSpinner.succeed('Audio chunks created');
  } catch (error) {
    chunkSpinner.fail('Failed to create audio chunks');
    console.error(chalk.red('Error:', error.message));
    process.exit(1);
  }
  
  // Process audio chunks
  await processAudioChunks(chunksDir, outputDir, meetingInfo, openai);
  
  console.log(chalk.green(`\n✅ Audio processing completed!`));
  console.log(chalk.gray(`Files saved to: ${outputDir}`));
}

// Transcribe audio chunk using Whisper
async function transcribeAudioChunk(audioChunkPath, openai) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioChunkPath),
      model: "whisper-1",
      language: "en",
      response_format: "text",
      temperature: 0.0
    });
    
    return transcription;
  } catch (error) {
    console.error(chalk.red(`Error transcribing ${path.basename(audioChunkPath)}:`, error.message));
    throw error;
  }
}

// Process audio chunks (transcription and summary)
async function processAudioChunks(audioDir, outputDir, meetingInfo, openai) {
  // Find all audio chunks
  const audioChunks = fs.readdirSync(audioDir)
    .filter(file => file.endsWith('.mp3') && file.startsWith('audio_'))
    .sort();
  
  if (audioChunks.length === 0) {
    console.error(chalk.red('❌ No audio chunks found'));
    process.exit(1);
  }
  
  console.log(chalk.blue(`\n🎤 Transcribing ${audioChunks.length} audio chunks...`));
  
  let fullTranscript = generateTranscriptHeader(meetingInfo);
  let allTranscriptText = "";
  
  // Process each chunk
  for (let i = 0; i < audioChunks.length; i++) {
    const audioChunk = audioChunks[i];
    const audioChunkPath = path.join(audioDir, audioChunk);
    
    const transcribeSpinner = ora(`Transcribing chunk ${i + 1}/${audioChunks.length}: ${audioChunk}`).start();
    
    try {
      const transcriptText = await transcribeAudioChunk(audioChunkPath, openai);
      
      if (!transcriptText || transcriptText.trim() === '') {
        transcribeSpinner.warn(`No content in ${audioChunk}`);
        continue;
      }
      
      // Add to full transcript
      const sectionHeader = `\n--- Chunk ${i + 1} (${audioChunk}) ---\n`;
      fullTranscript += `${sectionHeader}${transcriptText}\n\n`;
      allTranscriptText += `${transcriptText}\n\n`;
      
      transcribeSpinner.succeed(`Transcribed chunk ${i + 1}/${audioChunks.length} (${transcriptText.length} chars)`);
      
      // Save progress
      const transcriptPath = path.join(outputDir, 'transcript.txt');
      fs.writeFileSync(transcriptPath, fullTranscript, 'utf8');
    } catch (error) {
      transcribeSpinner.fail(`Failed to transcribe ${audioChunk}`);
      console.error(chalk.red('Error:', error.message));
    }
  }
  
  // Generate summary
  console.log(chalk.blue('\n📊 Generating meeting summary...'));
  const summarySpinner = ora('Creating AI summary').start();
  
  try {
    const summaryResult = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert meeting summarizer. Generate clear, well-structured meeting summaries from transcripts."
        },
        {
          role: "user",
          content: `Based on the following transcript, generate a well-structured meeting summary with these sections:
1. Executive Summary (2-3 paragraphs)
2. Key Topics Discussed (bullet points)
3. Important Decisions Made (bullet points)
4. Action Items (bullet points with assignee names if mentioned)
5. Follow-up Timeline (bullet points with dates if available)

Meeting Context:
- Title: ${meetingInfo.title}
- Date: ${meetingInfo.date}
- Project: ${meetingInfo.description}
- Participants: ${meetingInfo.participants}

Transcript:
${allTranscriptText}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });
    
    const summary = summaryResult.choices[0].message.content;
    
    // Save files
    const transcriptPath = path.join(outputDir, 'transcript.txt');
    const summaryPath = path.join(outputDir, 'summary.txt');
    
    fs.writeFileSync(transcriptPath, fullTranscript, 'utf8');
    fs.writeFileSync(summaryPath, `## MEETING SUMMARY\n\n${summary}`, 'utf8');
    
    summarySpinner.succeed('Summary generated successfully');
  } catch (error) {
    summarySpinner.fail('Failed to generate summary');
    console.error(chalk.red('Error:', error.message));
    
    // Save transcript even if summary fails
    const transcriptPath = path.join(outputDir, 'transcript.txt');
    fs.writeFileSync(transcriptPath, fullTranscript, 'utf8');
  }
}

// Main function
async function main() {
  try {
    console.log(chalk.blue.bold('\n📹 Meeting Transcript Tool\n'));
    
    const args = parseArguments();
    
    // Show help if requested or no arguments
    if (args.help || (!args.video && !args.audio)) {
      showHelp();
      return;
    }
    
    // Setup OpenAI
    const openai = await setupOpenAIKey();
    
    // Collect meeting information
    const meetingInfo = await collectMeetingInfo();
    
    // Process video or audio
    if (args.video) {
      await processVideoFile(args.video, meetingInfo, openai);
    } else if (args.audio) {
      await processAudioFile(args.audio, meetingInfo, openai);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ An error occurred:'), error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});