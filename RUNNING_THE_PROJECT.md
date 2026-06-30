# How to Run the Multi-Source Candidate Data Transformer

## 🚀 TL;DR - Quick Start (2 Minutes)

```bash
# Terminal 1: Backend
node server.js

# Terminal 2: Frontend (open new terminal)
pnpm dev

# Then open: http://localhost:3000
```

---

## 📋 Prerequisites

Before starting, ensure you have:

```bash
# Check Node.js (need 18+)
node --version

# Check pnpm (or npm/yarn)
pnpm --version
```

If not installed:
- Node.js: https://nodejs.org (v18+)
- pnpm: `npm install -g pnpm`

---

## 🔧 One-Time Setup (First Time Only)

### 1. Install Dependencies
```bash
cd /path/to/project
pnpm install
```

Takes ~1-2 minutes. You should see:
```
Packages: +55
Done in X.Xs
```

### 2. Create Environment File
```bash
cp .env.example .env.local
```

Then optionally edit `.env.local` to add GitHub token:
```
GITHUB_TOKEN=your_github_token_here
```

Get a token: https://github.com/settings/tokens (no special permissions needed)

**Done!** Now you can run it.

---

## 🎬 Running the Project

### Option 1: Two Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
node server.js
```

You should see:
```
╔════════════════════════════════════════════════════════════════╗
║  Multi-Source Candidate Data Transformer                      ║
║  Backend Server Running                                        ║
╚════════════════════════════════════════════════════════════════╝

📍 Server: http://localhost:5000
🔗 API:    http://localhost:5000/api
```

**Terminal 2 - Frontend:**
```bash
pnpm dev
```

You should see:
```
  ▲ Next.js 16.2.6
  - Local:        http://localhost:3000
  - Environments: .env.local
```

**Then open your browser:** http://localhost:3000

---

### Option 2: One Terminal (Concurrent)

If you want both in one terminal:
```bash
pnpm dev:both
```

This uses `concurrently` to run both servers. You'll see output from both, prefixed with `[0]` and `[1]`.

**Still open browser:** http://localhost:3000

---

### Option 3: Individual Development

If you're only developing frontend:
```bash
# Terminal 1 (keep running)
node server.js

# Terminal 2 (restart as needed)
pnpm dev
```

If you're only developing backend:
```bash
# Terminal 1 (keep running, restart after code changes)
node server.js

# Terminal 2 (optional - for testing)
# Make API calls with curl or Postman
```

---

## 🧪 Testing After Startup

### Check Backend Health
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{ "status": "ok", "timestamp": "2024-01-15T..." }
```

### Check Frontend Loads
Open browser: http://localhost:3000

Should see:
- Title: "Multi-Source Candidate Data Transformer"
- "Load Sample" button
- Upload form

### Test Data Processing
1. Click "Load Sample"
2. Click "Transform Data"
3. See results with confidence scores

If all three work → **Project is running correctly!**

---

## 📊 Using the Application

### Basic Workflow

1. **Upload Data**
   - Click "Load Sample" (or upload your own CSV)
   - CSV must have headers: name, email, phone, company, etc.

2. **(Optional) Add GitHub URL**
   - Example: `https://github.com/torvalds`
   - Or: `https://api.github.com/users/torvalds`

3. **(Optional) Configure**
   - Default config works for most cases
   - Custom config: select fields, set normalization rules

4. **Transform**
   - Click "Transform Data"
   - Wait for results (usually < 5 seconds)

5. **Review Results**
   - See candidate list with confidence scores
   - Expand rows for details
   - Check "Provenance" tab to see data sources

6. **Export**
   - Download as JSON or CSV
   - Save for import into your system

---

## 🔄 Development Workflow

### Frontend Changes (React)

1. Edit files in `components/` or `app/`
2. Save file
3. Browser auto-refreshes (Hot Module Reload)
4. See changes immediately

Example:
```bash
# Edit: components/TransformUploader.tsx
# Save
# Browser refreshes automatically ← Fast feedback!
```

### Backend Changes (Express)

1. Edit files in `lib/` or `server.js`
2. Save file
3. **Manually restart backend** (Ctrl+C, then `node server.js`)
4. Test with API call

Example:
```bash
# Terminal 1:
# Edit: lib/normalizers.js
# Save
# Ctrl+C to stop server
# node server.js to restart
```

### No Restart Needed For:
- Frontend HTML/CSS changes
- Frontend component props
- Frontend state updates

### Restart Needed For:
- Backend code changes
- Config file changes
- Dependencies added/removed

---

## 🐛 Debugging

### Backend Issues

Check logs in terminal where `node server.js` is running:

```bash
# Look for errors like:
# Error: Cannot find module 'express'
# → Solution: pnpm install

# Error: listen EADDRINUSE: address already in use :::5000
# → Solution: Kill process on port 5000, or use different port

# Error: GITHUB_TOKEN not set
# → Solution: Optional, but add it to .env.local for higher rate limits
```

### Frontend Issues

Check console in browser (Ctrl+Shift+J):

```bash
# Common errors:
# Failed to fetch: Cannot reach backend
# → Solution: Ensure node server.js is running

# CSV parse error
# → Solution: Check CSV format (headers, comma-separated)

# JSON parsing error
# → Solution: Check custom config JSON is valid
```

### API Issues

Test directly with curl:

```bash
# Test health
curl http://localhost:5000/api/health

# Test transform
curl -X POST http://localhost:5000/api/transform \
  -H "Content-Type: application/json" \
  -d '{"csv_data":"name,email\nJohn,john@example.com"}'

# See detailed error
curl http://localhost:5000/api/config/default | jq
```

---

## 🚦 Common Startup Issues

### Issue: "Cannot find module 'express'"

**Problem:** Dependencies not installed

**Solution:**
```bash
pnpm install
```

### Issue: "EADDRINUSE: address already in use :::5000"

**Problem:** Port 5000 already in use

**Solutions:**
```bash
# Option 1: Kill the process on port 5000
lsof -i :5000  # Find process ID
kill -9 <PID>

# Option 2: Use different port
PORT=5001 node server.js
```

### Issue: "Cannot reach backend from frontend"

**Problem:** CORS or port issue

**Check:**
```bash
# 1. Backend is running
curl http://localhost:5000/api/health

# 2. .env.local has correct API URL
cat .env.local | grep NEXT_PUBLIC_API_URL

# 3. Firewall allows port 5000
```

### Issue: "TypeError: Cannot read property 'csv_data' of undefined"

**Problem:** Request body is empty

**Solution:** Check that you're sending JSON data properly

---

## 📝 Environment Variables

### Required (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Optional
```bash
GITHUB_TOKEN=ghp_your_token_here  # For higher rate limits
PORT=5000                         # Custom backend port
NODE_ENV=development              # Or "production"
```

### How to Get GitHub Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" (classic)
3. Select scopes: `public_repo` (only need read access)
4. Copy token
5. Paste in `.env.local`

---

## 📊 Example Workflow

### Step-by-Step Example

```bash
# 1. Start backend in Terminal 1
$ node server.js
# → See "Server Running" message

# 2. Start frontend in Terminal 2
$ pnpm dev
# → See "Local: http://localhost:3000"

# 3. Open browser
$ open http://localhost:3000
# → See upload form

# 4. Load sample
Click "Load Sample" button
# → CSV loads (5 test records)

# 5. Transform
Click "Transform Data"
# → Processing...
# → Results show in 2-3 seconds

# 6. Review
Click first result to expand
# → See full candidate data

# 7. Export
Click "Download JSON"
# → File: transformed-candidates-2024-01-15.json
```

---

## 🛑 Stopping the Project

### Clean Shutdown

```bash
# Terminal 1 (Backend)
Ctrl+C

# Terminal 2 (Frontend)
Ctrl+C
```

No data loss - state is in-memory only (can add database later)

---

## 🔄 Restarting

### After Stopping

```bash
# Terminal 1
node server.js

# Terminal 2 (new terminal)
pnpm dev
```

Logs will show clean restart.

---

## 📚 Testing Commands

### Backend API
```bash
# Health check
curl http://localhost:5000/api/health

# Get default config
curl http://localhost:5000/api/config/default

# Get sample data
curl http://localhost:5000/api/sample

# Transform data
curl -X POST http://localhost:5000/api/transform \
  -H "Content-Type: application/json" \
  -d '{
    "csv_data": "name,email\nJohn,john@example.com",
    "github_url": "https://github.com/torvalds"
  }'
```

### Frontend
- http://localhost:3000 - Main UI
- http://localhost:3000/api/transform - Next.js API proxy (via frontend)

---

## 🎯 Performance Tips

### Fast Development
- Keep backend running, only restart when needed
- Frontend auto-refreshes (very fast)
- Test small changes before full data

### Faster Testing
1. Load Sample CSV (quick)
2. No GitHub URL (saves API call)
3. Use default config (no custom validation)
4. Transform just 1-2 records instead of full CSV

---

## 📖 Next Steps After Running

1. **Understand the Pipeline**
   - Read README.md section: "Pipeline Walkthrough"
   - Trace through one example

2. **Try Edge Cases**
   - Missing email (shows error)
   - Malformed phone (normalizes or nulls)
   - Multiple date formats (normalizes all)

3. **Explore Configuration**
   - Edit custom config
   - Change field selection
   - Try different merge strategies

4. **Review Code**
   - Start with lib/transformer.js (main pipeline)
   - Then lib/normalizers.js (field normalization)
   - Then lib/merger.js (conflict resolution)

---

## 🚀 Ready to Run!

You're all set. Run these two commands:

```bash
# Terminal 1
node server.js

# Terminal 2 (new terminal)
pnpm dev
```

Then open: **http://localhost:3000**

Click "Load Sample" → "Transform Data" → Done! 🎉

---

## 📞 Need Help?

If something doesn't work:

1. **Check QUICKSTART.md** - 5-minute setup guide
2. **Check Setup Checklist** - Verify all components
3. **Check README.md** - Troubleshooting section
4. **Check console logs** - Browser (Ctrl+Shift+J) or terminal

---

**Happy coding!** 🚀
