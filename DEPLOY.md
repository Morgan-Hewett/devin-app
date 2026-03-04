# DEVIN AI Companion — Deployment

## Quick Deploy Options

### Option 1: Vercel (Recommended — Free, 30 seconds)
1. Push this folder to a GitHub repo
2. Go to vercel.com → Import → Select the repo
3. It auto-deploys. Done.

### Option 2: Run Locally
```bash
cd devin-app
npm install
node server.js
# Open http://localhost:3000
```

### Option 3: Replit
1. Create a new Node.js Repl
2. Upload all files from this folder
3. Run `node server.js`

## Environment Variables
- `XAI_API_KEY` — Your xAI API key for Grok Voice Agent

## Structure
```
devin-app/
├── server.js          # Express + WebSocket proxy to xAI
├── public/
│   ├── index.html     # Main app (all screens)
│   ├── styles.css     # Dark theme + pink accents
│   └── app.js         # App logic, navigation, voice
├── package.json
└── DEPLOY.md
```
