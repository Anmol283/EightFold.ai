# Setup & Verification Checklist

Use this checklist to verify the project is set up correctly and working.

## ✅ Pre-Setup

- [ ] Node.js 18+ installed: `node --version`
- [ ] pnpm installed: `pnpm --version`
- [ ] Project cloned/downloaded
- [ ] Working internet connection (for GitHub API calls)

## ✅ Installation

- [ ] Navigated to project directory: `cd /path/to/project`
- [ ] Installed dependencies: `pnpm install`
- [ ] No errors during installation

## ✅ Environment Setup

- [ ] Copied `.env.example` to `.env.local`
- [ ] (Optional) Added GitHub token to `.env.local` for rate limiting
- [ ] Set `NEXT_PUBLIC_API_URL=http://localhost:5000` in `.env.local`

## ✅ Backend Verification

### Start Backend
```bash
node server.js
```

- [ ] Server starts without errors
- [ ] See message: "Backend Server Running"
- [ ] Port 5000 is available (no "address already in use" error)

### Test Backend Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{ "status": "ok", "timestamp": "..." }
```

- [ ] Health check returns 200 OK

### Test API
```bash
curl http://localhost:5000/api/config/default
```

- [ ] Returns configuration JSON
- [ ] Configuration has "fields" array with 13+ items

## ✅ Frontend Verification

### Start Frontend
In new terminal:
```bash
pnpm dev
```

- [ ] Next.js starts without errors
- [ ] See message: "Local: http://localhost:3000"
- [ ] Port 3000 is available

### Test Frontend
Open browser: http://localhost:3000

- [ ] Page loads without errors
- [ ] See title: "Multi-Source Candidate Data Transformer"
- [ ] "Load Sample" button is clickable
- [ ] Form has: CSV upload, GitHub URL input, LinkedIn URL input

## ✅ Data Processing

### Test with Sample Data

1. Click "Load Sample" button
   - [ ] CSV content appears in upload area
   - [ ] Shows "CSV loaded: N records"

2. Click "Transform Data" button
   - [ ] Transforms without errors
   - [ ] See results summary (e.g., "Successfully Processed: 5")

3. View Results
   - [ ] See candidate list with names and confidence scores
   - [ ] Confidence scores are between 0-1 (e.g., 0.87)
   - [ ] Can expand rows to see details

4. Export Results
   - [ ] Click "Download JSON" - downloads transformed-candidates-*.json
   - [ ] Click "Download CSV" - downloads transformed-candidates-*.csv
   - [ ] Files are readable and contain candidate data

## ✅ Edge Case Testing

### Test 1: Missing Email
1. Create CSV:
   ```csv
   name,email,phone
   John,,555-1234
   ```
2. Upload and transform
   - [ ] Shows error: "No email in CSV record"
   - [ ] Gracefully handles missing email

### Test 2: Malformed Phone
1. Create CSV:
   ```csv
   name,email,phone
   John,john@example.com,abc123
   ```
2. Upload and transform
   - [ ] Transforms successfully
   - [ ] Phone becomes null or is skipped
   - [ ] Doesn't crash

### Test 3: Multiple Date Formats
1. Create CSV:
   ```csv
   name,email,phone,start_date
   John,john@example.com,555-1234,Jan 15 2023
   ```
2. Check output
   - [ ] Date normalizes to YYYY-MM format (2023-01)

## ✅ GitHub Integration

### Test GitHub API
1. Click "Load Sample"
2. Enter GitHub URL: `https://github.com/torvalds`
3. Click "Transform Data"
   - [ ] Transforms without errors (may take a few seconds)
   - [ ] See GitHub-enriched data if available
   - [ ] If rate limited, see informative error message

## ✅ Configuration Testing

### Test Custom Config
1. Load Sample CSV
2. Click "Use Custom Configuration"
3. Paste this config:
   ```json
   {
     "fields": [
       { "path": "full_name", "from": ["full_name", "name"], "type": "string", "required": true },
       { "path": "emails", "from": ["emails", "email"], "type": "string[]", "required": true }
     ],
     "on_missing": "omit",
     "merge_strategy": "source_priority"
   }
   ```
4. Transform
   - [ ] Only full_name and emails in output
   - [ ] Other fields omitted (not null)
   - [ ] No errors

## ✅ Documentation

- [ ] README.md exists and is readable
- [ ] QUICKSTART.md exists with setup instructions
- [ ] RECRUITER_WALKTHROUGH.md exists for interview prep
- [ ] PROJECT_SUMMARY.md explains project components

## ✅ Code Quality

### Check File Structure
```bash
ls -la lib/
ls -la components/
ls -la config/
ls -la data/
```

- [ ] lib/transformer.js exists (400+ lines)
- [ ] lib/normalizers.js exists (250+ lines)
- [ ] lib/merger.js exists (320+ lines)
- [ ] lib/validation.js exists (350+ lines)
- [ ] lib/sources/github.js exists
- [ ] lib/sources/linkedin.js exists
- [ ] components/TransformUploader.tsx exists
- [ ] components/ResultsView.tsx exists
- [ ] config/default-config.json exists
- [ ] data/sample.csv exists

### Check Code Comments
```bash
grep -n "^//" lib/transformer.js | head -5
```

- [ ] Code has descriptive comments and JSDoc
- [ ] Functions have clear purposes
- [ ] Complex logic is explained

## ✅ Package.json

- [ ] Has "type": "module" (for ES modules)
- [ ] Has all required dependencies:
  - [ ] express
  - [ ] csv-parse
  - [ ] axios
  - [ ] octokit
  - [ ] node-fetch
  - [ ] cors
  - [ ] joi
  - [ ] dotenv

- [ ] Has scripts:
  - [ ] "dev": next dev
  - [ ] "server": node server.js
  - [ ] "dev:both": concurrently ...

## ✅ Environment Variables

- [ ] .env.local exists
- [ ] Has NEXT_PUBLIC_API_URL set
- [ ] (Optional) Has GITHUB_TOKEN set

## ✅ Performance

### Load Time
1. Transform sample data
   - [ ] Response time < 5 seconds
   - [ ] No timeouts

### Data Processing
1. Upload sample.csv (5 records)
   - [ ] Processes in < 1 second
   - [ ] Handles scale well

## ✅ Error Messages

### Check Error Handling
Try to:
1. Upload empty CSV
   - [ ] Clear error: "CSV contains no valid records"

2. Upload malformed JSON config
   - [ ] Clear error: "Invalid JSON in custom configuration"

3. Call API with bad data
   - [ ] Returns error with "code" field
   - [ ] Error is JSON formatted

## ✅ Browser Compatibility

Test in:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

All should:
- [ ] Load page correctly
- [ ] Upload files without issues
- [ ] Display results properly
- [ ] Export works

## ✅ Demo Readiness

- [ ] Can explain the 6-step pipeline
- [ ] Can show edge case handling
- [ ] Can explain confidence scoring
- [ ] Can show data provenance
- [ ] Can demonstrate configuration changes
- [ ] Can explain merge strategies

## ✅ Troubleshooting (If Issues)

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Try different port
PORT=5001 node server.js
```

- [ ] Backend runs on custom port

### Frontend can't reach backend
```bash
# Check API is accessible
curl http://localhost:5000/api/health
```

- [ ] Backend responds to requests
- [ ] Update NEXT_PUBLIC_API_URL if needed

### CSV parsing fails
- [ ] Check CSV has headers in first row
- [ ] Check data is comma-separated
- [ ] Try with sample.csv first

### GitHub rate limit
- [ ] Add GITHUB_TOKEN to .env.local
- [ ] Get token: https://github.com/settings/tokens

## ✅ Final Verification

```bash
# All the following should work:

# 1. Backend runs
node server.js  # Should see "Server Running"

# 2. Frontend runs (new terminal)
pnpm dev  # Should see "Local: http://localhost:3000"

# 3. Load page
open http://localhost:3000  # Should load cleanly

# 4. Process sample data
# Click "Load Sample" → "Transform Data" → see results

# 5. Export works
# Click "Download JSON" → file downloads

# 6. API works
curl http://localhost:5000/api/health  # Should return {"status":"ok",...}
```

- [ ] All 6 steps work without errors

## ✅ Ready for Interview!

If all above checks pass:
- [ ] Project is fully functional
- [ ] Ready to demonstrate to recruiters
- [ ] Can explain all components
- [ ] Edge cases are handled
- [ ] Code is clean and documented

**Next Step**: Review RECRUITER_WALKTHROUGH.md for interview talking points

---

## 📝 Notes

- First run may be slower (Next.js compilation)
- GitHub API calls may take 1-2 seconds
- Sample CSV has 5 test records
- Results are shown with confidence scores (0-1)

## 🆘 Still Having Issues?

1. Check README.md troubleshooting section
2. Review QUICKSTART.md for setup steps
3. Check console logs (Ctrl+Shift+J in browser)
4. Check terminal output for error messages
5. Verify .env.local is in project root
6. Ensure Node.js version is 18+

---

**Checklist created**: Keep this for reference during setup and interviews!
