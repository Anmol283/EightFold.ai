# Eightfold Candidate Data Transformer

A Next.js and Node.js application that transforms candidate data from recruiter CSV files and free-form recruiter notes into normalized candidate profiles. The output includes canonical fields, conflict-aware merging, confidence scoring, and provenance metadata that explains where each field came from.

## What It Does

The transformer accepts one or both data sources:

- Recruiter CSV: structured candidate rows with fields such as name, email, phone, company, title, location, skills, education, and links.
- Recruiter Notes: unstructured text that can contain emails, phone numbers, skills, companies, education, and experience details.

The pipeline then:

1. Extracts candidate fields from CSV and notes.
2. Normalizes phones, dates, countries, skills, arrays, links, education, and experience.
3. Merges values across sources using a configurable strategy.
4. Adds provenance records for field-level traceability.
5. Computes an `overall_confidence` score from completeness and source agreement.
6. Returns success/error results per candidate.

## Tech Stack

- Next.js 16 and React 19 for the web UI
- Next.js API route at `/api/transform`
- Optional Express server with matching API behavior
- Node.js ES modules
- `csv-parse` for CSV parsing
- `joi` for validation
- Tailwind CSS 4 for styling

## Project Structure

```text
.
|-- app/
|   |-- api/transform/route.js      # Next.js transform API
|   |-- layout.tsx
|   `-- page.tsx                    # Main UI page
|-- components/
|   |-- TransformUploader.tsx       # CSV/notes/config upload form
|   |-- ResultsView.tsx             # Overview, details, raw JSON, downloads
|   `-- ui/button.tsx
|-- config/
|   |-- default-config.json         # Default output schema and merge settings
|   `-- custom-config-example.json
|-- data/
|   `-- sample.csv                  # Sample input data
|-- lib/
|   |-- transformer.js              # Extract, normalize, merge, score pipeline
|   |-- normalizers.js              # Phone/date/country/skill normalization
|   |-- merger.js                   # Merge strategies and provenance
|   |-- validation.js               # Config and output validation
|   `-- utils.ts
|-- public/
|-- server.js                       # Optional standalone Express API
`-- package.json
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the Next.js app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The UI lets you upload a CSV file, paste or upload recruiter notes, optionally provide custom JSON config, transform the data, review results, and download JSON or CSV output.

## Optional Express API

The project also includes a standalone Express API server:

```bash
npm run server
```

By default it runs on:

```text
http://localhost:5000
```

You can run both the Express server and Next.js dev server together:

```bash
npm run dev:both
```

The current Next.js UI posts to the in-process Next.js API route at `/api/transform`, so the Express server is mainly useful for direct API testing or alternate deployment.

## Available Scripts

```bash
npm run dev        # Start the Next.js dev server
npm run server     # Start the standalone Express API
npm run dev:both   # Start Express and Next.js together
npm run build      # Build the Next.js app
npm run start      # Start the production Next.js server
npm run lint       # Run ESLint
```

## Input CSV Format

CSV input is optional if recruiter notes are provided, but when used it should include a header row. Common supported columns are:

```text
candidate_id,name,email,phone,current_company,title,location,years_experience,skills,education,headline,github,linkedin,portfolio
```

Example:

```csv
candidate_id,name,email,phone,current_company,title,location,years_experience,skills,education,headline
C001,John Smith,john.smith@email.com,+1 (555) 123-4567,TechCorp,Senior Software Engineer,"San Francisco, CA, USA",8,"JavaScript, React, Node.js, Python",UC Berkeley - BS Computer Science,"Passionate about building scalable systems"
```

The sample file is available at `data/sample.csv`.

## Recruiter Notes Format

Recruiter notes are plain text. The parser looks for common patterns such as emails, phone numbers, years of experience, company phrases, skills, and education.

Example:

```text
John Smith can be reached at john.smith@email.com or +1 555 123 4567.
Currently at TechCorp. 8 years of experience.
Skills: JavaScript, React, Node.js, Python.
Education: UC Berkeley - BS Computer Science.
```

Notes can be used alone. If no CSV is provided, the API creates a synthetic record and transforms the extracted note data.

## API

### POST `/api/transform`

Transforms candidate data from CSV, recruiter notes, or both.

Request body:

```json
{
  "csv_data": "candidate_id,name,email\nC001,John Smith,john@example.com",
  "recruiter_notes": "Currently at TechCorp. Skills: React, Node.js.",
  "config": {
    "merge_strategy": "source_priority",
    "on_missing": "null",
    "fields": []
  }
}
```

At least one of `csv_data` or `recruiter_notes` is required. If `config` is omitted, `config/default-config.json` is used.

Response shape:

```json
{
  "success": true,
  "total": 1,
  "processed": 1,
  "failed": 0,
  "results": [
    {
      "index": 0,
      "email": "john@example.com",
      "status": "success",
      "source": "CSV+RecruiterNotes",
      "data": {
        "candidate_id": "C001",
        "full_name": "John Smith",
        "emails": ["john@example.com"],
        "phones": [],
        "location": null,
        "links": [],
        "headline": null,
        "years_experience": null,
        "skills": ["React", "Node.js"],
        "experience": [],
        "education": [],
        "provenance": [],
        "overall_confidence": 0.6
      }
    }
  ],
  "sources": {
    "csv": true,
    "recruiter_notes": true
  }
}
```

### Express-only Endpoints

When running `npm run server`, the standalone Express API also exposes:

- `GET /api/health`
- `GET /api/sample`
- `GET /api/config/default`
- `POST /api/transform`

## Configuration

The default configuration lives in `config/default-config.json`.

Important options:

- `fields`: output schema and source mappings.
- `merge_strategy`: one of `source_priority`, `confidence`, or `most_complete`.
- `on_missing`: one of `null`, `omit`, or `error`.
- `include_confidence`: enables confidence output.

Supported normalization values:

- `E164`: normalizes phone numbers to E.164-like format.
- `canonical`: canonicalizes common skill aliases such as `js` to `JavaScript`.
- `ISO3166`: normalizes recognized countries to ISO 3166-1 alpha-2 codes.

Example field config:

```json
{
  "path": "skills",
  "from": ["skills"],
  "type": "string[]",
  "normalize": "canonical"
}
```

## Output Fields

Default transformed profiles include:

- `candidate_id`
- `full_name`
- `emails`
- `phones`
- `location`
- `links`
- `headline`
- `years_experience`
- `skills`
- `experience`
- `education`
- `provenance`
- `overall_confidence`

## Normalization and Merge Behavior

- Phone numbers are stripped to digits and returned with a leading `+`.
- Country names and common country codes are converted to ISO alpha-2 where recognized.
- Skills are canonicalized for common programming languages, frameworks, databases, cloud platforms, and tools.
- Arrays such as emails, phones, skills, and links are deduplicated.
- Location objects are merged by filling the most specific available city, region, and country values.
- Experience records are deduplicated by company and title.
- Education records are deduplicated by institution and degree.
- Provenance entries describe field, source, and merge method.

## Environment

No environment variables are required for the current CSV and recruiter-notes flow.

You can optionally set:

```bash
PORT=5000
NODE_ENV=development
```

`PORT` applies to the standalone Express server.

## Notes

Some older docs in this repository describe previous GitHub or LinkedIn URL based flows. The current app flow is CSV plus recruiter notes, with optional custom configuration.
