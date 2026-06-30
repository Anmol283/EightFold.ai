/**
 * Express Backend Server for Candidate Data Transformer
 * Handles CSV parsing, recruiter notes parsing, data merging, and normalization
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataTransformer } from './lib/transformer.js';
import { validateConfig, validateCandidateData } from './lib/validation.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/transform
 * Main endpoint to transform candidate data from multiple sources
 * Body: {
 *   csv_data?: string (CSV content - optional),
 *   recruiter_notes?: string (Recruiter notes content - optional),
 *   config?: object (transformation config)
 * }
 * At least one source (CSV or Recruiter Notes) is required
 */
app.post('/api/transform', async (req, res) => {
  try {
    const { csv_data, recruiter_notes, config } = req.body;

    // Validate at least one data source is provided
    const hasCSV = csv_data && typeof csv_data === 'string' && csv_data.trim().length > 0;
    const hasRecruiterNotes = recruiter_notes && typeof recruiter_notes === 'string' && recruiter_notes.trim().length > 0;

    if (!hasCSV && !hasRecruiterNotes) {
      return res.status(400).json({
        error: 'At least one data source is required: CSV file or Recruiter Notes',
        code: 'NO_DATA_SOURCE',
      });
    }

    // Load or validate config
    let transformConfig = config;
    if (!transformConfig) {
      transformConfig = loadDefaultConfig();
    } else {
      const configValidation = validateConfig(transformConfig);
      if (!configValidation.valid) {
        return res.status(400).json({
          error: 'Invalid configuration',
          details: configValidation.errors,
          code: 'INVALID_CONFIG',
        });
      }
    }

    // Parse CSV records
    let csvRecords = [];
    if (hasCSV) {
      try {
        csvRecords = parse(csv_data, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (err) {
        return res.status(400).json({
          error: 'Failed to parse CSV',
          details: err.message,
          code: 'CSV_PARSE_ERROR',
        });
      }

      if (csvRecords.length === 0) {
        return res.status(400).json({
          error: 'CSV contains no valid records',
          code: 'EMPTY_CSV',
        });
      }
    }

    // If only recruiter notes provided (no CSV), create synthetic record
    if (csvRecords.length === 0 && hasRecruiterNotes) {
      csvRecords = [{
        candidate_id: 'recruiter_notes_1',
        name: '',
        email: '',
      }];
    }

    // Initialize transformer
    const transformer = new DataTransformer(transformConfig);

    // Process each candidate
    const results = [];
    for (let i = 0; i < csvRecords.length; i++) {
      const csvRecord = csvRecords[i];
      
      try {
        // Parse recruiter notes if provided
        let recruiternotes = null;
        if (hasRecruiterNotes) {
          recruiternotes = transformer.parseRecruiterNotes(recruiter_notes);
        }

        // Transform candidate
        const transformed = await transformer.transformCandidate(
          csvRecord,
          recruiternotes
        );

        // Validate output
        const validation = validateCandidateData(transformed);
        if (!validation.valid) {
          transformed.warnings = validation.warnings;
        }

        results.push({
          index: i,
          email: csvRecord.email?.trim() || 'N/A',
          status: 'success',
          data: transformed,
          source: `${hasCSV ? 'CSV' : ''}${hasRecruiterNotes ? (hasCSV ? '+' : '') + 'RecruiterNotes' : ''}`,
        });
      } catch (err) {
        results.push({
          index: i,
          email: csvRecord.email?.trim() || 'N/A',
          error: err.message,
          status: 'error',
          candidate_id: csvRecord.candidate_id || `record_${i}`,
        });
      }
    }

    res.json({
      success: true,
      total: csvRecords.length,
      processed: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'error').length,
      results: results,
      sources: {
        csv: hasCSV,
        recruiter_notes: hasRecruiterNotes,
      },
    });
  } catch (err) {
    console.error('[transform] Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/config/default
 * Returns the default transformation configuration
 */
app.get('/api/config/default', (req, res) => {
  const defaultConfig = loadDefaultConfig();
  res.json(defaultConfig);
});

/**
 * GET /api/sample
 * Returns sample CSV and example config
 */
app.get('/api/sample', (req, res) => {
  try {
    const sampleCsvPath = path.join(__dirname, 'data', 'sample.csv');
    const sampleCsv = fs.readFileSync(sampleCsvPath, 'utf-8');

    res.json({
      sample_csv: sampleCsv,
      default_config: loadDefaultConfig(),
      instructions: {
        csv: 'CSV file must contain at least: candidate_id, name, email, phone, current_company, title, skills',
        recruiter_notes: 'Recruiter notes in plain text format (.txt) with candidate information',
        config: 'JSON configuration for output schema, normalization, and merge strategies',
      },
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to load sample data',
      message: err.message,
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load default transformation configuration from file
 */
function loadDefaultConfig() {
  try {
    const configPath = path.join(__dirname, 'config', 'default-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config;
  } catch (err) {
    console.warn('[loadDefaultConfig] Using hardcoded defaults:', err.message);
    return getHardcodedDefaultConfig();
  }
}

/**
 * Hardcoded default configuration as fallback
 */
function getHardcodedDefaultConfig() {
  return {
    fields: [
      {
        path: 'full_name',
        from: ['name'],
        type: 'string',
        required: true,
      },
      {
        path: 'emails',
        from: ['email'],
        type: 'string[]',
        required: true,
      },
      {
        path: 'phones',
        from: ['phone'],
        type: 'string[]',
        normalize: 'E164',
      },
      {
        path: 'location',
        from: ['location'],
        type: 'object',
        schema: { city: 'string', region: 'string', country: 'string' },
      },
      {
        path: 'links',
        from: ['linkedin', 'github', 'portfolio'],
        type: 'object[]',
      },
      {
        path: 'headline',
        from: ['headline', 'title'],
        type: 'string',
      },
      {
        path: 'years_experience',
        from: ['years_experience'],
        type: 'number',
      },
      {
        path: 'skills',
        from: ['skills'],
        type: 'string[]',
        normalize: 'canonical',
      },
      {
        path: 'experience',
        from: ['current_company', 'title'],
        type: 'object[]',
        schema: {
          company: 'string',
          title: 'string',
          start_date: 'string',
          end_date: 'string',
          summary: 'string',
        },
      },
      {
        path: 'education',
        from: ['education'],
        type: 'object[]',
        schema: {
          institution: 'string',
          degree: 'string',
          field: 'string',
          end_year: 'number',
        },
      },
      {
        path: 'provenance',
        from: [],
        type: 'object[]',
        schema: { field: 'string', source: 'string', method: 'string' },
      },
      {
        path: 'overall_confidence',
        from: [],
        type: 'number',
      },
    ],
    include_confidence: true,
    on_missing: 'null',
    merge_strategy: 'source_priority',
  };
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Candidate Data Transformer                                   ║
║  Backend Server Running                                        ║
╚════════════════════════════════════════════════════════════════╝

📍 Server: http://localhost:${PORT}
🔗 API:    http://localhost:${PORT}/api

Available Endpoints:
  POST   /api/transform              - Transform candidate data
  GET    /api/config/default         - Get default configuration
  GET    /api/sample                 - Get sample CSV & config
  GET    /api/health                 - Health check

Environment:
  NODE_ENV: ${process.env.NODE_ENV || 'development'}
  `);
});
