# Quick Start Guide

Get the Multi-Source Candidate Data Transformer running in 5 minutes.

## Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- (Optional) GitHub Personal Access Token for higher rate limits

## Step 1: Install Dependencies (1 min)

```bash
cd /path/to/project
pnpm install
```

## Step 2: Create Environment File (1 min)

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Optional: Add GitHub token for better rate limiting
```bash
# Edit .env.local
GITHUB_TOKEN=ghp_your_token_here
```

## Step 3: Start Backend Server (1 min)

Terminal 1:
```bash
node server.js
```

You should see:
```
📍 Server: http://localhost:5000
🔗 API:    http://localhost:5000/api
```

## Step 4: Start Frontend (1 min)

Terminal 2:
```bash
pnpm dev
```

You should see:
```
  ▲ Next.js 16.2.6
  - Local:        http://localhost:3000
```

## Step 5: Test the Pipeline (1 min)

**Option A: CSV + Recruiter Notes (recommended for testing merging)**
1. Open browser: http://localhost:3000
2. Click "Load Sample" to populate sample CSV
3. Add some recruiter notes in the notes section (e.g., "5 years experience, skilled in JavaScript")
4. Click "Transform Data"
5. View results with confidence scores!

**Option B: Recruiter Notes Only (test text parsing)**
1. Open browser: http://localhost:3000
2. Skip CSV, paste recruiter notes like: "John Smith, john@example.com, +1-555-1234, 8 years at TechCorp as Senior Engineer, skills in Python and Node.js, educated at Stanford"
3. Click "Transform Data"
4. See recruiter notes transformed with provenance tracking!

**Option C: CSV Only (traditional structured data)**
1. Open browser: http://localhost:3000
2. Click "Load Sample" to populate sample CSV
3. Click "Transform Data" (no recruiter notes needed)

---

## Alternative: Run Both Servers Together

```bash
pnpm dev:both
```

This uses `concurrently` to run both servers in one terminal.

---

## Sample Data

The project includes sample CSV in `data/sample.csv`:

```csv
candidate_id,name,email,phone,current_company,title,location,years_experience,skills
C001,John Smith,john.smith@email.com,+1 (555) 123-4567,TechCorp,Senior Software Engineer,"San Francisco, CA, USA",8,"JavaScript, React, Node.js, Python"
C002,Sarah Johnson,sarah.johnson@email.com,555-987-6543,DataSystems,Data Scientist,"New York, NY, USA",5,"Python, SQL, Machine Learning, Spark"
```

---

## API Endpoints

### Transform Data
```bash
# With CSV + Recruiter Notes
curl -X POST http://localhost:5000/api/transform \
  -H "Content-Type: application/json" \
  -d '{
    "csv_data": "name,email,phone\nJohn,john@example.com,555-1234",
    "recruiter_notes": "5 years experience at TechCorp, skilled in Python"
  }'

# Recruiter Notes Only (no CSV)
curl -X POST http://localhost:5000/api/transform \
  -H "Content-Type: application/json" \
  -d '{
    "recruiter_notes": "Sarah Johnson, sarah@example.com, 8 years at DataSystems"
  }'

# CSV Only (no recruiter notes)
curl -X POST http://localhost:5000/api/transform \
  -H "Content-Type: application/json" \
  -d '{
    "csv_data": "name,email,phone\nJohn,john@example.com,555-1234"
  }'
```

### Get Default Config
```bash
curl http://localhost:5000/api/config/default
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

---

## Features to Try

1. **CSV Only**: Upload CSV, no GitHub/LinkedIn
2. **With GitHub**: Add GitHub URL to enrich data
3. **Custom Config**: Use custom configuration for field selection
4. **Export Results**: Download JSON or CSV of transformed profiles
5. **View Confidence**: See confidence scores for each field
6. **Track Provenance**: See where each field value came from

---

## Common Issues

### Backend won't start
- Check port 5000 not in use: `lsof -i :5000`
- Run `pnpm install` again
- Ensure Node.js 18+: `node --version`

### Frontend can't reach backend
- Verify backend is running: `curl http://localhost:5000/api/health`
- Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:5000`
- Check firewall allows port 5000

### CSV parsing fails
- Ensure CSV has headers in first row
- Try "Load Sample" first to verify format
- Check for special characters

### GitHub rate limit hit
- Add `GITHUB_TOKEN` to `.env.local`
- Get token: https://github.com/settings/tokens

---

## Next Steps

1. Read `README.md` for detailed documentation
2. Explore `lib/` folder to understand transformation pipeline
3. Try custom configurations in UI
4. Integrate with your recruitment system

---

**Happy transforming! 🚀**

For help, check README.md or run sample data through the system.
