/**
 * DataTransformer: Core transformation logic
 * Handles: detection, extraction, normalization, merging, and validation
 */

import {
  normalizePhone,
  normalizeDate,
  normalizeCountry,
  canonicalizeSkill,
} from './normalizers.js';
import { mergeSourceData, resolveConflicts } from './merger.js';

export class DataTransformer {
  constructor(config) {
    this.config = config || {};
    this.sourceOrder = ['csv', 'recruiter_notes'];
  }

  /**
   * Transform a single candidate from CSV + recruiter notes
   * Implements: Detect → Extract → Normalize → Merge → Confidence → Validate
   */
  async transformCandidate(csvRecord, recruiterNotesData = null) {
    // Step 1: Extract data from all sources
    const extractedData = {
      csv: this.extractFromCSV(csvRecord),
      recruiter_notes: recruiterNotesData || null,
    };

    // Step 2: Normalize each source independently
    const normalizedData = {
      csv: this.normalizeExtractedData(extractedData.csv, 'csv'),
      recruiter_notes: extractedData.recruiter_notes ? this.normalizeExtractedData(extractedData.recruiter_notes, 'recruiter_notes') : null,
    };

    // Step 3: Merge data across sources with conflict resolution
    const merged = mergeSourceData(normalizedData, this.config.merge_strategy || 'source_priority');

    // Step 4: Apply output schema projection
    const projected = this.projectToOutputSchema(merged, csvRecord);

    // Step 5: Calculate confidence scores
    const withConfidence = this.addConfidenceScores(projected, normalizedData);

    // Step 6: Validate and cleanup
    return this.validateAndCleanup(withConfidence);
  }

  /**
   * Extract candidate data from CSV record
   */
  extractFromCSV(record) {
    return {
      candidate_id: record.candidate_id?.trim() || null,
      full_name: record.name?.trim() || null,
      emails: record.email ? [record.email.trim()] : [],
      phones: record.phone ? [record.phone.trim()] : [],
      location: this.parseLocation(record.location),
      headline: record.title?.trim() || record.headline?.trim() || null,
      links: this.parseLinks({
        github: record.github,
        linkedin: record.linkedin,
        portfolio: record.portfolio,
      }),
      years_experience: this.parseNumber(record.years_experience),
      current_company: record.current_company?.trim() || null,
      skills: this.parseArray(record.skills),
      experience: record.current_company
        ? [
            {
              company: record.current_company.trim(),
              title: record.title?.trim() || null,
              start_date: null,
              end_date: null,
              summary: null,
            },
          ]
        : [],
      education: record.education ? [this.parseEducation(record.education)] : [],
    };
  }

  /**
   * Parse recruiter notes from plain text
   * Extracts structured data from unstructured notes
   */
  parseRecruiterNotes(notesText) {
    if (!notesText || typeof notesText !== 'string') return null;

    const notes = notesText.trim();
    if (notes.length === 0) return null;

    // Extract common patterns from notes
    const extractedData = {
      candidate_id: null,
      full_name: null,
      emails: this.extractEmails(notes),
      phones: this.extractPhones(notes),
      location: null,
      headline: null,
      links: [],
      years_experience: this.extractYearsExperience(notes),
      current_company: this.extractCompany(notes),
      skills: this.extractSkills(notes),
      experience: [],
      education: this.extractEducation(notes),
    };

    return extractedData;
  }

  /**
   * Helper: Extract emails from text
   */
  extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return (text.match(emailRegex) || []).map((e) => e.toLowerCase());
  }

  /**
   * Helper: Extract phone numbers from text
   */
  extractPhones(text) {
    const phoneRegex = /(\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\+\d{1,3}\s?\d{1,14})/g;
    return (text.match(phoneRegex) || []).map((p) => p.trim());
  }

  /**
   * Helper: Extract years of experience from text
   */
  extractYearsExperience(text) {
    const yearsRegex = /(\d+)\s*years?\s*of\s*experience|(\d+)\s*yrs?\s*experience/i;
    const match = text.match(yearsRegex);
    if (match) {
      return parseInt(match[1] || match[2], 10);
    }
    return null;
  }

  /**
   * Helper: Extract company from notes
   */
  extractCompany(text) {
    const companyRegex = /(?:currently at|works at|company:|employed at)\s*([A-Za-z0-9\s&.,\-]+?)(?:\.|,|;|$)/i;
    const match = text.match(companyRegex);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * Helper: Extract skills from notes
   */
  extractSkills(text) {
    const skillRegex = /(?:skills?:|expertise in|proficient in|skilled in)\s*([^.]+(?:\.|$))/i;
    const match = text.match(skillRegex);
    if (match) {
      return match[1]
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  }

  /**
   * Helper: Extract education from notes
   */
  extractEducation(text) {
    const eduRegex = /(?:education:|degree:|graduated from)\s*([^.]+(?:\.|$))/i;
    const match = text.match(eduRegex);
    if (match) {
      return [{ institution: match[1].trim(), degree: null, field: null, end_year: null }];
    }
    return [];
  }

  /**
   * Normalize extracted data with canonicalization rules
   */
  normalizeExtractedData(data, source) {
    if (!data) return null;

    return {
      candidate_id: data.candidate_id,
      full_name: data.full_name,
      emails: (data.emails || []).map((e) => e.toLowerCase().trim()).filter((e) => e),
      phones: (data.phones || []).map((p) => normalizePhone(p)).filter((p) => p),
      location: this.normalizeLocation(data.location),
      headline: data.headline,
      links: data.links,
      years_experience: data.years_experience,
      current_company: data.current_company,
      skills: (data.skills || []).map((s) => canonicalizeSkill(s)),
      experience: this.normalizeExperience(data.experience),
      education: this.normalizeEducation(data.education),
      _source: source,
      _timestamp: new Date().toISOString(),
    };
  }

  /**
   * Project merged data to output schema with field selection and renaming
   */
  projectToOutputSchema(merged, csvRecord) {
    const config = this.config.fields || [];
    const output = {};

    // Helper to get nested value
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
    };

    for (const fieldConfig of config) {
      const { path, from, type, normalize } = fieldConfig;

      // Skip fields with no source mapping
      if (!from || from.length === 0) {
        if (path === 'provenance') {
          output[path] = merged._provenance || [];
        } else if (path === 'overall_confidence') {
          output[path] = merged._confidence || 0;
        }
        continue;
      }

      // Get value from merged data
      let value = null;
      for (const source of from) {
        const val = getNestedValue(merged, source);
        if (val !== null && val !== undefined && val !== '') {
          value = val;
          break;
        }
      }

      // Handle missing values
      if (value === null || value === undefined || value === '') {
        value = this.config.on_missing === 'omit' ? undefined : null;
      }

      // Apply per-field normalization
      if (value && normalize) {
        value = this.applyNormalization(value, normalize, type);
      }

      if (value !== undefined) {
        output[path] = value;
      }
    }

    return output;
  }

  /**
   * Apply per-field normalization rules
   */
  applyNormalization(value, normalize, type) {
    if (normalize === 'E164' && type === 'string[]') {
      return Array.isArray(value)
        ? value.map((v) => normalizePhone(v)).filter((v) => v)
        : [normalizePhone(value)].filter((v) => v);
    }

    if (normalize === 'canonical' && type === 'string[]') {
      return Array.isArray(value)
        ? value.map((v) => canonicalizeSkill(v))
        : [canonicalizeSkill(value)];
    }

    if (normalize === 'ISO3166' && type === 'string') {
      return normalizeCountry(value);
    }

    return value;
  }

  /**
   * Add confidence scores based on source agreement and data completeness
   */
  addConfidenceScores(projected, normalizedData) {
    const scores = {};
    let totalScore = 0;
    let fieldCount = 0;

    for (const field in projected) {
      if (field === 'provenance' || field === 'overall_confidence') continue;

      const value = projected[field];
      if (value === null || value === undefined) {
        scores[field] = 0;
        continue;
      }

      // Base score: field is present (60%)
      let fieldScore = 0.6;

      // Bonus: multiple sources agree (30%)
      let agreementCount = 0;
      for (const source of Object.keys(normalizedData)) {
        if (normalizedData[source] && this.fieldExistsInSource(normalizedData[source], field)) {
          agreementCount++;
        }
      }
      if (agreementCount >= 2) {
        fieldScore += 0.3;
      }

      // Bonus: field is well-formed/validated (10%)
      if (this.isWellFormed(field, value)) {
        fieldScore += 0.1;
      }

      scores[field] = Math.min(fieldScore, 1.0);
      totalScore += scores[field];
      fieldCount++;
    }

    const overallConfidence = fieldCount > 0 ? Math.round((totalScore / fieldCount) * 100) / 100 : 0;

    return {
      ...projected,
      overall_confidence: overallConfidence,
    };
  }

  /**
   * Validate and cleanup output
   */
  validateAndCleanup(data) {
    // Remove null values based on config
    if (this.config.on_missing === 'omit') {
      for (const key in data) {
        if (data[key] === null || data[key] === undefined) {
          delete data[key];
        }
      }
    }

    return data;
  }

  /**
   * Helper: Parse location string into object
   */
  parseLocation(locationStr) {
    if (!locationStr || typeof locationStr !== 'string') return null;

    const parts = locationStr.split(',').map((p) => p.trim());
    if (parts.length < 2) return null;

    return {
      city: parts[0] || null,
      region: parts[1] || null,
      country: parts[2] || null,
    };
  }

  /**
   * Helper: Normalize location object
   */
  normalizeLocation(location) {
    if (!location) return null;

    return {
      city: location.city?.trim() || null,
      region: location.region?.trim() || null,
      country: location.country ? normalizeCountry(location.country) : null,
    };
  }

  /**
   * Helper: Parse links from multiple fields
   */
  parseLinks(links) {
    const result = [];
    if (links.github)
      result.push({ type: 'github', url: links.github });
    if (links.linkedin)
      result.push({ type: 'linkedin', url: links.linkedin });
    if (links.portfolio)
      result.push({ type: 'portfolio', url: links.portfolio });
    return result;
  }

  /**
   * Helper: Parse skills array
   */
  parseArray(arrayStr) {
    if (!arrayStr || typeof arrayStr !== 'string') return [];
    return arrayStr.split(',').map((s) => s.trim()).filter((s) => s);
  }

  /**
   * Helper: Parse education
   */
  parseEducation(educationStr) {
    if (!educationStr) return null;
    return {
      institution: educationStr,
      degree: null,
      field: null,
      end_year: null,
    };
  }

  /**
   * Helper: Parse number
   */
  parseNumber(str) {
    if (!str) return null;
    const num = parseInt(str, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Helper: Check if field exists in source
   */
  fieldExistsInSource(source, field) {
    return source && source[field] !== null && source[field] !== undefined;
  }

  /**
   * Helper: Check if value is well-formed
   */
  isWellFormed(field, value) {
    if (field.includes('email') && typeof value === 'string') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    if (field.includes('phone') && typeof value === 'string') {
      return /^\+?1?\d{9,}$/.test(value);
    }
    return true;
  }

  /**
   * Helper: Normalize experience array
   */
  normalizeExperience(experiences) {
    if (!Array.isArray(experiences)) return [];

    return experiences
      .filter((exp) => exp.company)
      .map((exp) => ({
        company: exp.company?.trim() || null,
        title: exp.title?.trim() || null,
        start_date: exp.start_date ? normalizeDate(exp.start_date) : null,
        end_date: exp.end_date ? normalizeDate(exp.end_date) : null,
        summary: exp.summary?.trim() || null,
      }));
  }

  /**
   * Helper: Normalize education array
   */
  normalizeEducation(educations) {
    if (!Array.isArray(educations)) return [];

    return educations
      .filter((edu) => edu.institution)
      .map((edu) => ({
        institution: edu.institution?.trim() || null,
        degree: edu.degree?.trim() || null,
        field: edu.field?.trim() || null,
        end_year: edu.end_year ? parseInt(edu.end_year, 10) : null,
      }));
  }
}
