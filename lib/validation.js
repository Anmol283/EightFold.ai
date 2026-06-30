/**
 * Validation Module
 * Validates configuration and output data
 * Handles edge cases: missing fields, malformed data, type mismatches
 */

import Joi from 'joi';

/**
 * Validate transformation configuration
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors, warnings };
  }

  // Validate fields array
  if (!Array.isArray(config.fields)) {
    errors.push('Configuration must include a "fields" array');
  } else {
    for (let i = 0; i < config.fields.length; i++) {
      const field = config.fields[i];

      if (!field.path || typeof field.path !== 'string') {
        errors.push(`Field ${i}: missing or invalid "path" property`);
      }

      if (!Array.isArray(field.from)) {
        warnings.push(`Field ${i} (${field.path}): "from" should be an array`);
      }

      const validTypes = ['string', 'number', 'boolean', 'object', 'string[]', 'object[]', 'null'];
      if (field.type && !validTypes.includes(field.type)) {
        warnings.push(`Field ${i} (${field.path}): unknown type "${field.type}"`);
      }

      const validNormalizations = ['E164', 'canonical', 'ISO3166', null];
      if (field.normalize && !validNormalizations.includes(field.normalize)) {
        warnings.push(`Field ${i} (${field.path}): unknown normalization "${field.normalize}"`);
      }
    }
  }

  // Validate merge strategy
  const validStrategies = ['source_priority', 'confidence', 'most_complete'];
  if (config.merge_strategy && !validStrategies.includes(config.merge_strategy)) {
    warnings.push(`Unknown merge strategy: "${config.merge_strategy}"`);
  }

  // Validate on_missing
  const validMissing = ['null', 'omit', 'error'];
  if (config.on_missing && !validMissing.includes(config.on_missing)) {
    warnings.push(`Unknown on_missing strategy: "${config.on_missing}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate candidate data against output schema
 */
export function validateCandidateData(data) {
  const warnings = [];
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Candidate data must be an object');
    return { valid: false, errors, warnings };
  }

  // Check required fields
  const requiredFields = ['full_name', 'emails'];
  for (const field of requiredFields) {
    if (!data[field]) {
      warnings.push(`Missing required field: ${field}`);
    }
  }

  // Validate emails
  if (Array.isArray(data.emails)) {
    for (const email of data.emails) {
      if (!validateEmail(email)) {
        warnings.push(`Invalid email format: ${email}`);
      }
    }
  }

  // Validate phones
  if (Array.isArray(data.phones)) {
    for (const phone of data.phones) {
      if (!validatePhoneFormat(phone)) {
        warnings.push(`Invalid phone format: ${phone}`);
      }
    }
  }

  // Validate confidence score
  if (typeof data.overall_confidence === 'number') {
    if (data.overall_confidence < 0 || data.overall_confidence > 1) {
      errors.push(`Confidence score must be between 0 and 1, got ${data.overall_confidence}`);
    }
  }

  // Validate skills array
  if (Array.isArray(data.skills)) {
    if (data.skills.length > 100) {
      warnings.push(`Skills array exceeds 100 items (${data.skills.length})`);
    }
  }

  // Validate location
  if (data.location && typeof data.location === 'object') {
    const validCountries = getValidCountryCodes();
    if (data.location.country && !validCountries.includes(data.location.country)) {
      warnings.push(`Unknown country code: ${data.location.country}`);
    }
  }

  // Validate provenance
  if (Array.isArray(data.provenance)) {
    for (const prov of data.provenance) {
      if (!prov.field || !prov.source || !prov.method) {
        warnings.push(`Incomplete provenance entry: ${JSON.stringify(prov)}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  // RFC 5322 simplified
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone format (E.164)
 */
function validatePhoneFormat(phone) {
  if (typeof phone !== 'string') return false;
  // E.164 format: +1234567890
  return /^\+\d{10,15}$/.test(phone);
}

/**
 * Get list of valid ISO 3166-1 country codes
 */
function getValidCountryCodes() {
  return [
    'US', 'CA', 'IN', 'AU', 'DE', 'FR', 'GB', 'JP', 'CN', 'MX', 'BR', 'KR',
    'SG', 'HK', 'IE', 'NL', 'ES', 'IT', 'CH', 'SE', 'NO', 'DK', 'FI', 'BE',
    'AT', 'PL', 'TH', 'VN', 'PH', 'ID', 'MY', 'NZ', 'PK', 'BD',
  ];
}

/**
 * Validate CSV data (before parsing)
 */
export function validateCSVData(csvContent) {
  const errors = [];
  const warnings = [];

  if (!csvContent || typeof csvContent !== 'string') {
    errors.push('CSV content must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  if (csvContent.trim().length === 0) {
    errors.push('CSV content is empty');
    return { valid: false, errors, warnings };
  }

  // Check for minimum columns
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    errors.push('CSV must have at least 1 header row and 1 data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  // Check for required columns
  const requiredColumns = ['email'];
  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      errors.push(`Missing required CSV column: "${col}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that at least one source from each group is provided
 */
export function validateDataSources(csvProvided, githubUrl, linkedinUrl) {
  const errors = [];

  // CSV is required
  if (!csvProvided) {
    errors.push('CSV data is required (structured source)');
  }

  // At least one unstructured source is recommended but not required
  const unstructuredCount = [githubUrl, linkedinUrl].filter((x) => x).length;
  if (unstructuredCount === 0) {
    console.warn('[validateDataSources] No unstructured sources provided - using CSV only');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // Remove potentially dangerous characters
  return input.replace(/[<>\"'`]/g, '').trim();
}

/**
 * Create a schema validator using Joi
 */
export function createCandidateSchema() {
  return Joi.object({
    candidate_id: Joi.string().optional(),
    full_name: Joi.string().required(),
    emails: Joi.array().items(Joi.string().email()).optional(),
    phones: Joi.array().items(Joi.string()).optional(),
    location: Joi.object({
      city: Joi.string().optional(),
      region: Joi.string().optional(),
      country: Joi.string().length(2).optional(),
    }).optional(),
    headline: Joi.string().optional(),
    years_experience: Joi.number().integer().min(0).optional(),
    current_company: Joi.string().optional(),
    skills: Joi.array().items(Joi.string()).optional(),
    links: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().valid('github', 'linkedin', 'portfolio', 'other').required(),
          url: Joi.string().uri().required(),
        })
      )
      .optional(),
    experience: Joi.array()
      .items(
        Joi.object({
          company: Joi.string().optional(),
          title: Joi.string().optional(),
          start_date: Joi.string().regex(/^\d{4}-\d{2}$/).optional(),
          end_date: Joi.string().regex(/^\d{4}-\d{2}$/).optional(),
          summary: Joi.string().optional(),
        })
      )
      .optional(),
    education: Joi.array()
      .items(
        Joi.object({
          institution: Joi.string().optional(),
          degree: Joi.string().optional(),
          field: Joi.string().optional(),
          end_year: Joi.number().integer().optional(),
        })
      )
      .optional(),
    overall_confidence: Joi.number().min(0).max(1).optional(),
    provenance: Joi.array()
      .items(
        Joi.object({
          field: Joi.string().required(),
          source: Joi.string().required(),
          method: Joi.string().required(),
        })
      )
      .optional(),
  });
}

/**
 * Check for common edge cases in data
 */
export function checkEdgeCases(csvRecord, unstructuredData) {
  const issues = [];

  // Edge case 1: Missing email
  if (!csvRecord.email || !csvRecord.email.trim()) {
    issues.push({
      severity: 'HIGH',
      code: 'MISSING_EMAIL',
      message: 'CSV record has no email - cannot match unstructured sources',
    });
  }

  // Edge case 2: Conflicting company names
  const csvCompany = csvRecord.current_company?.toLowerCase().trim();
  const githubCompany = unstructuredData?.github?.current_company?.toLowerCase().trim();
  const linkedinCompany = unstructuredData?.linkedin?.current_company?.toLowerCase().trim();

  if (csvCompany && githubCompany && csvCompany !== githubCompany) {
    issues.push({
      severity: 'MEDIUM',
      code: 'COMPANY_CONFLICT',
      message: `Company name differs: CSV="${csvCompany}" vs GitHub="${githubCompany}"`,
    });
  }

  // Edge case 3: No data sources
  if (!csvRecord || (!unstructuredData?.github && !unstructuredData?.linkedin)) {
    issues.push({
      severity: 'LOW',
      code: 'SINGLE_SOURCE',
      message: 'Only CSV data available - limited cross-validation',
    });
  }

  // Edge case 4: Malformed email
  if (csvRecord.email && !validateEmail(csvRecord.email)) {
    issues.push({
      severity: 'MEDIUM',
      code: 'MALFORMED_EMAIL',
      message: `Invalid email format: ${csvRecord.email}`,
    });
  }

  return issues;
}
