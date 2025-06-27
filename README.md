# Meeting Transcript Tool

A production-ready CLI tool to automatically transcribe meeting videos/audio and generate intelligent summaries using OpenAI's Whisper API.

## ✨ Features

- 🎥 **Video Processing**: Extract audio from any video format
- 🎵 **Audio Processing**: Process standalone audio files
- 🎤 **High-Quality Transcription**: Uses OpenAI Whisper for accurate transcription
- 🤖 **AI Summaries**: Generate structured meeting summaries with GPT-4
- 📁 **Smart Organization**: Creates folders named `YYYY-MM-DD - Meeting Title`
- 🔄 **Progress Tracking**: Visual progress indicators for all operations
- 💾 **API Key Management**: Secure local storage, enter once and forget
- 🛡️ **Error Recovery**: Saves progress, continues on individual failures
- ⚡ **Interactive CLI**: User-friendly prompts and help system

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **ffmpeg** (for video/audio processing)
- **OpenAI API key** (get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys))

## 🚀 Installation

### Quick Install (macOS)
```bash
# Install Node.js from https://nodejs.org
# Install ffmpeg
brew install ffmpeg

# Clone and install the tool
git clone <your-repo-url>
cd meeting-transcript
npm install
chmod +x index.js
npm install -g .
```

### Quick Install (Windows)
```cmd
REM Install Node.js from https://nodejs.org
REM Install ffmpeg
choco install ffmpeg

REM Clone and install the tool
git clone <your-repo-url>
cd meeting-transcript
npm install
npm install -g .
```

## 🎯 Usage

### Basic Commands
```bash
# Show help
meeting-transcript
meeting-transcript --help

# Process a video file
meeting-transcript --video=./meeting.mp4
meeting-transcript --video="/path/to/board-meeting.mov"

# Process an audio file
meeting-transcript --audio=./recording.mp3
meeting-transcript --audio="/path/to/call.wav"
```

### First Time Setup
On first run, the tool will:
1. **Validate/prompt for OpenAI API key** (saved for future use)
2. **Collect meeting information**:
   - Meeting date (defaults to today)
   - Project/Meeting title
   - Project description
   - Participants (e.g., "Dan, Ben, Claudia")

### Interactive Experience
```bash
$ meeting-transcript --video=team-meeting.mp4

📹 Meeting Transcript Tool

🔑 OpenAI API key required
Enter your OpenAI API key: **********************
Save this API key for future use? (Y/n) y
✅ API key saved successfully
🔍 Validating API key...
✅ API key validated successfully

📝 Meeting Information
Please provide the following details:

? Meeting date (YYYY-MM-DD): 2025-01-15
? Project/Meeting title: Q1 Planning Meeting
? Project description: Quarterly planning and goal setting
? Participants (comma-separated): Dan, Ben, Claudia

🎬 Processing video: team-meeting.mp4
Output directory: /path/to/2025-01-15 - Q1 Planning Meeting

📢 Extracting audio from video...
✅ Audio extracted successfully
✂️  Splitting audio into 10-minute chunks...
✅ Audio chunks created
🎤 Transcribing 3 audio chunks...
✅ Transcribed chunk 1/3 (1,234 chars)
✅ Transcribed chunk 2/3 (987 chars)
✅ Transcribed chunk 3/3 (756 chars)
📊 Generating meeting summary...
✅ Summary generated successfully

✅ Video processing completed!
Files saved to: /path/to/2025-01-15 - Q1 Planning Meeting
```

## 📁 Output Structure

The tool creates organized folders with meaningful names:

```
2025-01-15 - Q1 Planning Meeting/
├── audio/
│   ├── audio_000.mp3        # 10-minute chunks for processing
│   ├── audio_001.mp3
│   ├── audio_002.mp3
│   └── full-audio.mp3       # Complete extracted audio
├── transcript.txt           # Complete transcript with headers
└── summary.txt             # AI-generated structured summary
```

### Sample Transcript Output
```
⸻

Transcript: Q1 Planning Meeting

Date: 2025-01-15
Project: Quarterly planning and goal setting
Participants: Dan, Ben, Claudia

⸻

--- Chunk 1 (audio_000.mp3) ---
[Transcribed content from first 10 minutes...]

--- Chunk 2 (audio_001.mp3) ---
[Transcribed content from next 10 minutes...]
```

### Sample Summary Output
```
## MEETING SUMMARY

### Executive Summary
This quarterly planning meeting covered...

### Key Topics Discussed
• Budget allocation for Q1
• New project priorities
• Team resource planning

### Important Decisions Made
• Approved $50k budget for Project X
• Decided to hire 2 additional developers

### Action Items
• Dan: Prepare budget breakdown by Jan 20
• Ben: Interview candidates for developer roles
• Claudia: Draft project timeline

### Follow-up Timeline
• Budget review: January 20, 2025
• Next planning meeting: February 15, 2025
```

## ⚙️ Configuration

### API Key Management
- **First time**: Tool prompts for API key and saves it securely
- **Storage location**: `~/.meeting-transcript-config.json`
- **Environment override**: Set `OPENAI_API_KEY` to override saved key
- **Key validation**: Tests connection before processing

### Smart Detection
The tool checks for API keys in this order:
1. Environment variable `OPENAI_API_KEY`
2. Saved configuration file
3. Interactive prompt (only if neither exists)

## 💰 Cost Information

**OpenAI API Pricing:**
- **Whisper**: ~$0.006 per minute of audio
- **GPT-4**: varies by summary length

**Examples:**
- 30-minute meeting: ~$0.20-0.40
- 60-minute meeting: ~$0.40-0.80
- 2-hour meeting: ~$0.80-1.60

## 🔧 Troubleshooting

### Common Issues

**1. API Key Problems**
```bash
# Check saved configuration
cat ~/.meeting-transcript-config.json

# Override with environment variable
OPENAI_API_KEY=your-new-key meeting-transcript --video=file.mp4
```

**2. ffmpeg not found**
```bash
# macOS
brew install ffmpeg

# Windows (as Administrator)
choco install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg
```

**3. Permission Issues (macOS/Linux)**
```bash
chmod +x index.js
```

**4. Node.js Issues**
- Ensure Node.js v18+ is installed
- Windows: Reinstall with "Add to PATH" checked
- macOS: Install from [nodejs.org](https://nodejs.org)

**5. Large File Processing**
- Files are automatically split into 10-minute chunks
- Progress is saved after each chunk
- Safe to interrupt and resume

### Getting Help
```bash
meeting-transcript --help          # Show usage information
meeting-transcript                 # Same as --help
```

## 📖 Advanced Usage

### Supported File Formats
- **Video**: MP4, MOV, AVI, MKV, WebM, and more
- **Audio**: MP3, WAV, M4A, FLAC, OGG, and more

### Processing Tips
- **Optimal chunk size**: 10 minutes (automatically handled)
- **Audio quality**: Higher quality = better transcription
- **Language**: Currently optimized for English
- **File size**: No practical limits (chunked processing)

### Customization
The tool can be modified for:
- Different chunk durations
- Custom summary formats
- Additional languages
- Different AI models

## 🛡️ Privacy & Security

- **Local processing**: All video/audio processing happens on your machine
- **API usage**: Only audio chunks sent to OpenAI for transcription
- **Key storage**: API key stored locally in your home directory
- **No data retention**: OpenAI doesn't retain audio after processing

## 📞 Support

### Self-Help
1. Run `meeting-transcript --help`
2. Check this README
3. Verify prerequisites are installed
4. Test with a small file first

### File an Issue
If you encounter bugs or have feature requests, please provide:
- Operating system and version
- Node.js version (`node --version`)
- ffmpeg version (`ffmpeg -version`)
- Error messages (if any)
- Sample file (if possible)

## 📄 License

ISC License - Free for personal and commercial use.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature-name`)
5. Create a Pull Request

---

**Happy transcribing! 🎉** 