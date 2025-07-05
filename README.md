# 🐾 Animal Welfare Policy Monitoring System

An AI-powered web application that monitors Indian government websites for animal welfare policy consultations and generates automated draft responses.

## 🌟 Features

### 🤖 Automated Monitoring
- **Real-time Scraping**: Monitors government websites including Ministry of Environment, PRS India, and e-Gazette
- **Scheduled Checks**: Runs every 6 hours and daily at 9 AM IST
- **Smart Detection**: Uses AI to identify animal welfare-related policies

### 🧠 AI-Powered Analysis
- **Gemini Integration**: Uses Google's Gemini API for policy analysis
- **Relevance Scoring**: Rates policies from 0-100% for animal welfare relevance
- **Multi-tone Drafts**: Generates legal, emotional, and data-backed response drafts

### 📧 Email Notifications
- **Instant Alerts**: Sends formatted emails with policy details and drafts
- **Rich Content**: HTML emails with attachments for easy submission
- **Customizable**: Configure notification preferences and recipients

### 🎨 Modern Dashboard
- **Real-time Updates**: Live policy monitoring dashboard
- **Filtering**: Sort by deadline, ministry, and relevance
- **Mobile Responsive**: Works seamlessly on all devices
- **Dark/Light Mode**: Customizable theme preferences

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/ayushrai1235/PublicPolicyWatch.git
   cd Public policy
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password_here
   ```

3. **Start the Application**
   ```bash
   # Start both frontend and backend
   npm run dev:full
   
   # Or start separately
   npm run server  # Backend on port 3001
   npm run dev     # Frontend on port 5173
   ```
   ## 🔧 Configuration

### Email Setup (Gmail)
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `EMAIL_PASS`

### Gemini API Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`
