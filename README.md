# Candidate Data Transformer

A sophisticated data transformation pipeline that merges candidate information from multiple sources (CSV, Recruiter Notes) into a unified, normalized profile with confidence scoring and data provenance tracking.

**Built with:** Next.js 16, Express.js, Node.js | **For:** Eightfold Engineering Internship

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Pipeline Walkthrough](#pipeline-walkthrough)
- [Configuration](#configuration)
- [Edge Cases Handled](#edge-cases-handled)
- [Examples](#examples)
- [Development](#development)

---

## 🎯 Overview

### Problem Statement

Recruiters manage candidate information from many sources—CSV exports and recruiter notes. These sources are often:
- **Incomplete** - Missing fields across sources
- **Inconsistent** - Conflicting data (different company names, phone formats)
- **Unstructured** - Notes contain valuable data mixed with narrative text
- **Untrustworthy** - Wrong-but-confident data pollutes hiring decisions

### Solution

This transformer implements a **deterministic, explainable pipeline** that:

1. **Detects** which fields are available in each source
2. **Extracts** data with type preservation
3. **Normalizes** to canonical formats (E.164 phones, YYYY-MM dates, ISO country codes, skill canonicalization)
4. **Merges** across sources with smart conflict resolution
5. **Scores** confidence based on data completeness and multi-source agreement
6. **Validates** output and tracks provenance (where each field came from)

### Key Features

✅ **Multiple source types supported:**
- **Structured** - CSV with defined columns (name, email, phone, company, title, skills) - Optional
- **Unstructured** - Recruiter Notes (plain text with candidate information) - Optional
- **At least one source required** - CSV alone, Recruiter Notes alone, or both combined

✅ **Output schema** - Canonical profile with:
- `full_name`, `emails[]`, `phones[]` (E.164), `location` (ISO 3166)
- `headline`, `skills[]` (canonicalized), `experience[]`, `education[]`
- `overall_confidence` (0-1 score), `provenance[]` (data lineage)

✅ **Robust edge case handling:**
- Missing emails → handles gracefully per strategy
- Conflicting company names → priority-based or confidence-based resolution
- Malformed phones → sanitized or rejected
- Invalid dates → parsed flexibly (multiple formats supported)
- Null/empty/garbage data → handled gracefully per config

✅ **Configurable runtime behavior:**
- Field selection and renaming
- Per-field normalization rules
- Missing value strategies (null, omit, error)
- Merge strategies (source_priority, confidence, most_complete)

---

## 🏗️ Architecture

### Project Structure

```
.
├── server.js                          # Express backend (main entry)
├── lib/
│   ├── transformer.js                 # Core transformation logic
│   ├── normalizers.js                 # Normalization functions (phone, date, skills, country)
│   ├── merger.js                      # Merge strategies & conflict resolution
│   └── validation.js                  # Configuration & data validation
├── config/
│   └── default-config.json            # Default transformation configuration
├── data/
│   └── sample.csv                     # Sample candidate data
├── app/
│   ├── page.tsx                       # Next.js homepage
│   └── api/transform/route.js         # Next.js API proxy
├── components/
│   ├── TransformUploader.tsx          # File upload & form UI
│   └── ResultsView.tsx                # Results display & download
└── README.md                          # This file
```

### Data Flow

```
CSV File (Structured)          →  ┌─────────────────────┐
GitHub URL (Unstructured)      →  │   DataTransformer   │
LinkedIn URL (Unstructured)    →  │                     │
                                  │ 1. Extract          │
Runtime Config (Optional)      →  │ 2. Normalize        │
                                  │ 3. Merge            │
                                  │ 4. Score Confidence │
                                  │ 5. Validate         │
                                  └─────────────────────┘
                                            ↓
                                   Unified Profile JSON
                                   (with provenance)
```

### Key Classes & Functions

**`DataTransformer`** (`lib/transformer.js`)
- `transformCandidate(csvRecord, unstructuredData)` - Main pipeline
- `fetchUnstructuredData(email, githubUrl, linkedinUrl)` - Fetch GitHub/LinkedIn
- `normalizeExtractedData(data, source)` - Normalize by source
- `projectToOutputSchema(merged, csvRecord)` - Apply config schema
- `addConfidenceScores(projected, normalizedData)` - Calculate confidence

**Normalizers** (`lib/normalizers.js`)
- `normalizePhone(phone)` → E.164 format (+1234567890)
- `normalizeDate(dateStr)` → YYYY-MM format
- `normalizeCountry(country)` → ISO 3166-1 alpha-2 (e.g., "USA" → "US")
- `canonicalizeSkill(skill)` → Canonical names ("js" → "JavaScript", "react.js" → "React")

**Merger** (`lib/merger.js`)
- `mergeSourceData(normalizedData, strategy)` - Multi-source merge with deduplication
- Strategies: `source_priority` (CSV > GitHub > LinkedIn), `confidence`, `most_complete`
- Handles: array deduplication, location merging, experience/education deduplication

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
pnpm install

# Or with npm
npm install
```

### 2. Set Up Environment

Create `.env.local` in the project root:

```bash
# Optional: GitHub API token (recommended for rate limiting)
GITHUB_TOKEN=your_github_pat_here

# Backend URL (for local dev)
NEXT_PUBLIC_API_URL=http://localhost:5000

# Node environment
NODE_ENV=development
```

Get a GitHub token: https://github.com/settings/tokens (no special permissions needed for public profiles)

### 3. Start the Backend Server

In one terminal:

```bash
# Start Express server (port 5000)
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

### 4. Start the Next.js Frontend

In another terminal:

```bash
# Start Next.js dev server (port 3000)
pnpm dev
```

Navigate to: **http://localhost:3000**

### 5. Test the Pipeline

1. **Upload CSV** - Click "Load Sample" or upload your own
2. **Add GitHub URL** (optional) - e.g., `https://github.com/torvalds`
3. **Add LinkedIn URL** (optional) - e.g., `https://linkedin.com/in/username`
4. **Configure** (optional) - Customize field mappings and normalization
5. **Transform** - Click "Transform Data"
6. **View Results** - See merged profiles, confidence scores, and provenance

---

## 📡 API Documentation

### POST /api/transform

Transform candidate data from multiple sources.

**Request:**
```json
{
  "csv_data": "candidate_id,name,email,...\nC001,John Smith,...",
  "github_url": "https://github.com/username",
  "linkedin_url": "https://linkedin.com/in/username",
  "config": { /* optional custom config */ }
}
```

**Response (Success):**
```json
{
  "success": true,
  "total": 5,
  "processed": 4,
  "failed": 1,
  "results": [
    {
      "index": 0,
      "email": "john@example.com",
      "status": "success",
      "data": {
        "candidate_id": "C001",
        "full_name": "John Smith",
        "emails": ["john@example.com"],
        "phones": ["+15551234567"],
        "location": { "city": "San Francisco", "region": "CA", "country": "US" },
        "headline": "Senior Software Engineer",
        "skills": ["JavaScript", "React", "Node.js"],
        "experience": [
          {
            "company": "TechCorp",
            "title": "Senior Engineer",
            "start_date": "2022-01",
            "end_date": null,
            "summary": null
          }
        ],
        "overall_confidence": 0.87,
        "provenance": [
          {
            "field": "full_name",
            "source": "csv",
            "method": "selection"
          }
        ]
      }
    },
    {
      "index": 4,
      "email": "MISSING",
      "status": "error",
      "error": "No email in CSV record - cannot match unstructured sources",
      "candidate_id": "C005"
    }
  ]
}
```

### GET /api/config/default

Get the default transformation configuration.

**Response:**
```json
{
  "fields": [
    {
      "path": "full_name",
      "from": ["full_name", "name"],
      "type": "string",
      "required": true
    },
    /* ... more fields */
  ],
  "merge_strategy": "source_priority",
  "on_missing": "null"
}
```

### GET /api/health

Health check.

**Response:** `{ "status": "ok", "timestamp": "2024-01-15T10:30:00Z" }`

---

## 🔄 Pipeline Walkthrough

### Step 1: Extract

**Input:** Raw CSV row + optional GitHub/LinkedIn data

**Process:**
- Parse CSV columns into structured fields
- Fetch GitHub profile via REST API (if URL provided)
- Parse LinkedIn data (if file uploaded)

**Output:** Extracted data from each source (unverified, mixed formats)

```javascript
// Example CSV extraction
{
  full_name: "John Smith",
  emails: ["john.smith@email.com"],
  phones: ["(555) 123-4567"],              // Raw format
  skills: "JavaScript, React, Python",     // String, not array
  // ...
}
```

### Step 2: Normalize

**Input:** Extracted data per source

**Process:**
- **Phones** → E.164 format: `(555) 123-4567` → `+15551234567`
- **Dates** → YYYY-MM: `January 15, 2023` → `2023-01`, `01/15/2023` → `2023-01`
- **Countries** → ISO 3166-1 alpha-2: `United States` → `US`
- **Skills** → Canonical names: `js` → `JavaScript`, `react.js` → `React`
- **Emails** → Lowercase: `John@Example.COM` → `john@example.com`
- **Arrays** → Deduplicate: `["React", "React", "React.js"]` → `["React"]`

**Output:** Clean, canonical data from each source

```javascript
{
  full_name: "John Smith",
  emails: ["john.smith@email.com"],       // Normalized
  phones: ["+15551234567"],               // E.164
  skills: ["JavaScript", "React", "Python"], // Canonical
  years_experience: 8,                    // Parsed number
  // ...
}
```

### Step 3: Merge

**Input:** Normalized data from CSV, GitHub, LinkedIn

**Process:**
- Use **merge strategy** to pick winning values for conflicts
- **source_priority**: CSV > GitHub > LinkedIn (default)
- **confidence**: Pick value with highest confidence score
- **most_complete**: Pick value with most data
- **Deduplication**: Remove duplicate emails, phones, skills, experience
- **Smart merging**: Location merges fields individually (city from LinkedIn, country from GitHub)

**Output:** Single unified record with provenance

```javascript
{
  full_name: "John Smith",                    // CSV (highest priority)
  emails: ["john.smith@email.com"],           // CSV + GitHub (deduplicated)
  phones: ["+15551234567", "+15559876543"],   // CSV + GitHub (deduplicated)
  skills: ["JavaScript", "React", "Python", "Docker", "Kubernetes"], // Merged
  location: {                                 // Merged
    city: "San Francisco",                    // GitHub
    region: "CA",                             // CSV
    country: "US"                             // Normalized
  },
  experience: [                               // Deduplicated
    { company: "TechCorp", title: "Senior Engineer", ... },
    { company: "StartupXYZ", title: "Engineer", ... }
  ],
  // ... other fields
}
```

### Step 4: Project to Output Schema

**Input:** Merged record + runtime config

**Process:**
- Select which fields to include
- Rename fields (if configured)
- Apply per-field normalization
- Handle missing values per strategy (`null`, `omit`, `error`)
- Validate output types

**Output:** Clean JSON matching output schema

### Step 5: Score Confidence

**Input:** Projected output + normalized data from all sources

**Process:**
- **Base score (40%)**: Is field present?
- **Agreement bonus (30%)**: Do multiple sources agree?
- **Well-formed bonus (10%)**: Is value valid? (email regex, phone digits, etc.)
- **Diversity bonus (30%)**: How many sources were used?
- **Formula**: `(sum of field scores) / (number of fields)`

**Output:** Confidence 0.0 (unreliable) to 1.0 (highly confident)

```javascript
overall_confidence: 0.87  // 87% confident in this profile
```

### Step 6: Validate & Return

**Input:** Scored profile

**Process:**
- Validate against schema (required fields, type checks)
- Cleanup (remove nulls if `on_missing: "omit"`)
- Add provenance (where each field came from)

**Output:** Final profile JSON ready for downstream systems

---

## ⚙️ Configuration

### Default Configuration

See `config/default-config.json` - Includes all fields from the output schema.

### Custom Configuration

Customize at runtime via the UI or API. Example:

```json
{
  "fields": [
    {
      "path": "full_name",
      "from": ["full_name", "name"],
      "type": "string",
      "required": true
    },
    {
      "path": "emails",
      "from": ["emails", "email"],
      "type": "string[]",
      "required": true
    },
    {
      "path": "phones",
      "from": ["phones", "phone"],
      "type": "string[]",
      "normalize": "E164"
    },
    {
      "path": "skills",
      "from": ["skills"],
      "type": "string[]",
      "normalize": "canonical"
    }
  ],
  "include_confidence": true,
  "on_missing": "null",
  "merge_strategy": "source_priority"
}
```

### Configuration Options

| Option | Values | Meaning |
|--------|--------|---------|
| `merge_strategy` | `source_priority` \| `confidence` \| `most_complete` | How to resolve conflicts |
| `on_missing` | `null` \| `omit` \| `error` | What to do with missing values |
| `normalize` | `E164` \| `canonical` \| `ISO3166` | Per-field normalization |

---

## ⚠️ Edge Cases Handled

### 1. Missing Email

**Problem:** Can't match unstructured sources without email

**Handling:** Skip GitHub/LinkedIn fetch, process CSV only

**Output:** Profile with note that unstructured sources were unavailable

```json
{
  "index": 4,
  "email": "MISSING",
  "error": "No email in CSV - cannot match unstructured sources"
}
```

### 2. Conflicting Company Names

**Problem:** CSV says "TechCorp", GitHub says "Tech Corp", LinkedIn says "TechCorp Inc"

**Handling:**
- With `source_priority`: Use CSV value "TechCorp"
- Log conflict in warnings
- Confidence score reduced for `current_company`

### 3. Malformed Phone Numbers

**Problem:** `"phone": "abc123"`, `"phone": "555"`, `"phone": ""`

**Handling:**
- Extract digits only
- Validate minimum length (10 digits)
- Default US country code (+1)
- Return `null` if invalid
- Never invent data

### 4. Multiple Date Formats

**Problem:** `"01/15/2023"`, `"Jan 15 2023"`, `"2023-01-15"`, `"2023-01"`, `"2023"`

**Handling:**
```javascript
normalizeDate("01/15/2023")     // → "2023-01"
normalizeDate("Jan 15 2023")    // → "2023-01"
normalizeDate("2023-01-15")     // → "2023-01"
normalizeDate("2023")           // → "2023" (year only OK)
normalizeDate("invalid")        // → null
```

### 5. Multiple Email/Phone Entries

**Problem:** CSV: `"john@email.com,jane@email.com"`, GitHub: `["john@email.com"]`, LinkedIn: `["jane@email.com"]`

**Handling:**
- Treat as array
- Deduplicate case-insensitively
- Result: `["john@email.com", "jane@email.com"]`

### 6. Skill Name Variations

**Problem:** `"JavaScript"`, `"js"`, `"JS"`, `"javascript"`, `"node.js"`

**Handling:**
```javascript
canonicalizeSkill("js")         // → "JavaScript"
canonicalizeSkill("react.js")   // → "React"
canonicalizeSkill("python3")    // → "Python"
canonicalizeSkill("C++")        // → "C++"
```

### 7. No Unstructured Sources

**Problem:** Only CSV provided, no GitHub/LinkedIn URLs

**Handling:**
- Process CSV-only profile
- Lower confidence score
- Note in provenance: single source

### 8. Rate Limiting

**Problem:** GitHub API rate limit (60/hour unauthenticated, 5000/hour authenticated)

**Handling:**
- Add GitHub token in `.env` for higher limits
- Gracefully fail with error message
- Continue processing remaining candidates

### 9. Invalid CSV Format

**Problem:** Missing headers, no data rows, non-UTF-8 encoding

**Handling:**
```json
{
  "error": "Failed to parse CSV",
  "details": "Error: Invalid CSV format",
  "code": "CSV_PARSE_ERROR"
}
```

### 10. API Errors

**Problem:** GitHub profile 404, LinkedIn API unreachable, network timeout

**Handling:**
- Log warning, don't crash
- Continue with available data
- Note in provenance which sources failed

---

## 📊 Examples

### Example 1: Simple CSV-Only

**Input CSV:**
```csv
candidate_id,name,email,phone,current_company,title
C001,John Smith,john@example.com,555-123-4567,TechCorp,Engineer
```

**Output:**
```json
{
  "candidate_id": "C001",
  "full_name": "John Smith",
  "emails": ["john@example.com"],
  "phones": ["+15551234567"],
  "current_company": "TechCorp",
  "headline": "Engineer",
  "overall_confidence": 0.65,
  "provenance": [
    {
      "field": "full_name",
      "source": "csv",
      "method": "selection"
    }
  ]
}
```

### Example 2: CSV + GitHub

**Input:**
- CSV: `name="John Smith"`, `email="john@example.com"`, `phone="555-123-4567"`
- GitHub: `https://github.com/johnsmith` (fetches profile, bio, repos, languages)

**GitHub Profile (fetched):**
```json
{
  "name": "John Smith",
  "bio": "Full-stack developer | Python + JavaScript",
  "email": "john.github@example.com",
  "company": "Tech Solutions",
  "public_repos": 42,
  "followers": 150,
  "languages": ["JavaScript", "Python", "Go"]
}
```

**Output (Merged):**
```json
{
  "full_name": "John Smith",
  "emails": ["john@example.com", "john.github@example.com"],  // Merged
  "phones": ["+15551234567"],
  "current_company": "TechCorp",  // CSV wins (priority)
  "headline": "Full-stack developer | Python + JavaScript",  // GitHub (better)
  "skills": ["JavaScript", "Python", "Go"],  // From GitHub
  "overall_confidence": 0.82,  // Higher due to multi-source
  "provenance": [
    { "field": "full_name", "source": "csv", "method": "selection" },
    { "field": "emails", "source": "merged", "method": "deduplicate" },
    { "field": "headline", "source": "github", "method": "selection" },
    { "field": "skills", "source": "github", "method": "merged" }
  ]
}
```

### Example 3: Conflict Resolution

**Scenario:**
- CSV says: `current_company = "Tech Corp"`, `title = "Senior Engineer"`
- GitHub says: `company = "TechCorp Inc"`, `bio = "Software Engineer at TechCorp Inc"`
- Merge strategy: `source_priority` (CSV wins)

**Output:**
```json
{
  "current_company": "Tech Corp",  // CSV (priority 1)
  "headline": "Software Engineer at TechCorp Inc",  // GitHub (no conflict)
  "overall_confidence": 0.75,  // Reduced due to company conflict
}
```

---

## 🛠️ Development

### Project Structure Commands

```bash
# Start backend (Express)
node server.js

# Start frontend (Next.js)
pnpm dev

# Run both (in parallel with separate terminals)
# Terminal 1: node server.js
# Terminal 2: pnpm dev
```

### Adding a New Normalization Rule

1. Add function to `lib/normalizers.js`:

```javascript
export function normalizeMyField(value) {
  if (!value) return null;
  // Custom logic
  return normalized;
}
```

2. Use in config:

```json
{
  "path": "my_field",
  "normalize": "my_field_norm"
}
```

3. Update `transformer.js` `applyNormalization()` to handle it

### Adding a New Source (e.g., Twitter)

1. Create `lib/sources/twitter.js`:

```javascript
export async function fetchTwitterProfile(twitterUrl) {
  // Fetch and parse Twitter profile
  return { /* profile data */ };
}
```

2. Import in `transformer.js`

3. Add to `fetchUnstructuredData()`:

```javascript
if (twitterUrl) {
  result.twitter = await fetchTwitterProfile(twitterUrl);
}
```

4. Update merging logic in `merger.js` if needed

### Testing

Load the sample CSV via the UI:
1. Click "Load Sample" in the uploader
2. Optionally add GitHub URL (e.g., `https://github.com/torvalds`)
3. Click "Transform"
4. Verify results and confidence scores

---

## 📝 Troubleshooting

### Backend won't start

```
Error: Cannot find module 'express'
```

**Fix:** Run `pnpm install`

### Frontend shows "Cannot reach backend"

```
Error: Failed to connect to localhost:5000
```

**Fix:**
1. Ensure `node server.js` is running in another terminal
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Firewall may block port 5000

### GitHub rate limit exceeded

```
GitHub API error: 403 Forbidden
```

**Fix:** Add GitHub token to `.env.local`:
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### CSV parsing fails

```
CSV_PARSE_ERROR: Unexpected number in CSV
```

**Fix:** Ensure CSV is properly formatted with valid headers and data rows.

---

## 📚 References

- **E.164 Phone Format**: https://en.wikipedia.org/wiki/E.164
- **ISO 3166-1 alpha-2**: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
- **GitHub API Docs**: https://docs.github.com/en/rest
- **Skill Canonicalization**: Common tech stack (JavaScript, Python, React, etc.)

---

## 📞 Support

For questions or issues:
1. Check this README
2. Review sample data in `data/sample.csv`
3. Check console logs in browser DevTools (Ctrl+Shift+J)
4. Check server logs in terminal

---

**Author**: Eightfold Internship Candidate  
**Date**: 2024  
**Status**: Production-ready with comprehensive edge case handling
