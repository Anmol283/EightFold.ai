/**
 * Next.js API Route: /api/transform
 * Runs the transformation in-process so the route cannot proxy to itself.
 */

import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { DataTransformer } from '@/lib/transformer';
import { validateConfig, validateCandidateData } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { csv_data, recruiter_notes, config } = await request.json();

    const hasCSV =
      typeof csv_data === 'string' && csv_data.trim().length > 0;
    const hasRecruiterNotes =
      typeof recruiter_notes === 'string' && recruiter_notes.trim().length > 0;

    if (!hasCSV && !hasRecruiterNotes) {
      return jsonResponse(
        {
          error: 'At least one data source is required: CSV file or Recruiter Notes',
          code: 'NO_DATA_SOURCE',
        },
        400
      );
    }

    let transformConfig = config;
    if (!transformConfig) {
      transformConfig = loadDefaultConfig();
    } else {
      const configValidation = validateConfig(transformConfig);
      if (!configValidation.valid) {
        return jsonResponse(
          {
            error: 'Invalid configuration',
            details: configValidation.errors,
            code: 'INVALID_CONFIG',
          },
          400
        );
      }
    }

    let csvRecords = [];
    if (hasCSV) {
      try {
        csvRecords = parse(csv_data, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (err) {
        return jsonResponse(
          {
            error: 'Failed to parse CSV',
            details: err.message,
            code: 'CSV_PARSE_ERROR',
          },
          400
        );
      }

      if (csvRecords.length === 0) {
        return jsonResponse(
          {
            error: 'CSV contains no valid records',
            code: 'EMPTY_CSV',
          },
          400
        );
      }
    }

    if (csvRecords.length === 0 && hasRecruiterNotes) {
      csvRecords = [
        {
          candidate_id: 'recruiter_notes_1',
          name: '',
          email: '',
        },
      ];
    }

    const transformer = new DataTransformer(transformConfig);
    const parsedRecruiterNotes = hasRecruiterNotes
      ? transformer.parseRecruiterNotes(recruiter_notes)
      : null;

    const results = [];
    for (let i = 0; i < csvRecords.length; i++) {
      const csvRecord = csvRecords[i];

      try {
        const transformed = await transformer.transformCandidate(
          csvRecord,
          parsedRecruiterNotes
        );

        const validation = validateCandidateData(transformed);
        if (!validation.valid) {
          transformed.warnings = validation.warnings;
        }

        results.push({
          index: i,
          email: csvRecord.email?.trim() || 'N/A',
          status: 'success',
          data: transformed,
          source: `${hasCSV ? 'CSV' : ''}${
            hasRecruiterNotes ? `${hasCSV ? '+' : ''}RecruiterNotes` : ''
          }`,
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

    return jsonResponse({
      success: true,
      total: csvRecords.length,
      processed: results.filter((result) => result.status === 'success').length,
      failed: results.filter((result) => result.status === 'error').length,
      results,
      sources: {
        csv: hasCSV,
        recruiter_notes: hasRecruiterNotes,
      },
    });
  } catch (err) {
    console.error('[api/transform] Error:', err);
    return jsonResponse(
      {
        error: 'Failed to process request',
        message: err.message,
      },
      500
    );
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function loadDefaultConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'default-config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.warn('[api/transform] Using hardcoded defaults:', err.message);
    return getHardcodedDefaultConfig();
  }
}

function getHardcodedDefaultConfig() {
  return {
    fields: [
      { path: 'full_name', from: ['full_name'], type: 'string', required: true },
      { path: 'emails', from: ['emails'], type: 'string[]', required: true },
      { path: 'phones', from: ['phones'], type: 'string[]', normalize: 'E164' },
      {
        path: 'location',
        from: ['location'],
        type: 'object',
        schema: { city: 'string', region: 'string', country: 'string' },
      },
      { path: 'links', from: ['links'], type: 'object[]' },
      { path: 'headline', from: ['headline'], type: 'string' },
      { path: 'years_experience', from: ['years_experience'], type: 'number' },
      { path: 'current_company', from: ['current_company'], type: 'string' },
      { path: 'skills', from: ['skills'], type: 'string[]', normalize: 'canonical' },
      {
        path: 'experience',
        from: ['experience'],
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
      { path: 'overall_confidence', from: [], type: 'number' },
    ],
    include_confidence: true,
    on_missing: 'null',
    merge_strategy: 'source_priority',
  };
}
