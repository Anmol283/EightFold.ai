/**
 * Merger: Handles conflict resolution and data merging across sources
 * Strategies: source_priority, confidence, most_complete
 */

/**
 * Merge data from multiple sources with conflict resolution
 * Sources: { csv, recruiter_notes }
 * Strategy: determines how conflicts are resolved
 */
export function mergeSourceData(normalizedData, strategy = 'source_priority') {
  const merged = {
    candidate_id: null,
    full_name: null,
    emails: [],
    phones: [],
    location: null,
    headline: null,
    links: [],
    years_experience: null,
    current_company: null,
    skills: [],
    experience: [],
    education: [],
    _provenance: [],
    _confidence: 0,
  };

  const sourceOrder = ['csv', 'recruiter_notes'];
  const provenanceMap = {};

  // Merge simple fields
  for (const field of ['candidate_id', 'full_name', 'headline', 'current_company', 'years_experience']) {
    const winner = selectWinner(
      sourceOrder.map((src) => ({
        source: src,
        value: normalizedData[src]?.[field],
      })),
      strategy
    );

    if (winner) {
      merged[field] = winner.value;
      provenanceMap[field] = {
        field,
        source: winner.source,
        method: 'selection',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Merge array fields (deduplicate)
  merged.emails = deduplicateArray(
    sourceOrder.map((src) => normalizedData[src]?.emails || []).flat()
  );
  provenanceMap['emails'] = {
    field: 'emails',
    source: merged.emails.length > 0 ? 'merged' : 'null',
    method: 'deduplicate',
  };

  merged.phones = deduplicateArray(
    sourceOrder.map((src) => normalizedData[src]?.phones || []).flat()
  );
  provenanceMap['phones'] = {
    field: 'phones',
    source: merged.phones.length > 0 ? 'merged' : 'null',
    method: 'deduplicate',
  };

  merged.skills = deduplicateArray(
    sourceOrder.map((src) => normalizedData[src]?.skills || []).flat()
  );
  provenanceMap['skills'] = {
    field: 'skills',
    source: merged.skills.length > 0 ? 'merged' : 'null',
    method: 'deduplicate',
  };

  // Merge object fields
  merged.location = mergeLocation(
    sourceOrder.map((src) => ({
      source: src,
      value: normalizedData[src]?.location,
    }))
  );
  provenanceMap['location'] = {
    field: 'location',
    source: merged.location ? 'merged' : 'null',
    method: 'object_merge',
  };

  // Merge links
  merged.links = deduplicateLinks(
    sourceOrder.map((src) => normalizedData[src]?.links || []).flat()
  );
  provenanceMap['links'] = {
    field: 'links',
    source: merged.links.length > 0 ? 'merged' : 'null',
    method: 'deduplicate',
  };

  // Merge experience (prefer most recent)
  merged.experience = mergeExperience(
    sourceOrder.map((src) => ({
      source: src,
      experiences: normalizedData[src]?.experience || [],
    }))
  );
  provenanceMap['experience'] = {
    field: 'experience',
    source: merged.experience.length > 0 ? 'merged' : 'null',
    method: 'merge_deduplicate',
  };

  // Merge education
  merged.education = mergeEducation(
    sourceOrder.map((src) => ({
      source: src,
      educations: normalizedData[src]?.education || [],
    }))
  );
  provenanceMap['education'] = {
    field: 'education',
    source: merged.education.length > 0 ? 'merged' : 'null',
    method: 'merge_deduplicate',
  };

  // Calculate overall confidence
  merged._confidence = calculateConfidence(merged, provenanceMap);

  // Convert provenance map to array
  merged._provenance = Object.values(provenanceMap);

  return merged;
}

/**
 * Select winning value based on strategy
 */
function selectWinner(candidates, strategy) {
  const valid = candidates.filter((c) => c.value !== null && c.value !== undefined);

  if (valid.length === 0) return null;

  if (strategy === 'source_priority') {
    return valid[0]; // First source wins
  }

  if (strategy === 'most_complete') {
    return valid.reduce((best, current) => {
      const bestLen = JSON.stringify(best.value).length;
      const currentLen = JSON.stringify(current.value).length;
      return currentLen > bestLen ? current : best;
    });
  }

  if (strategy === 'confidence') {
    // In real scenario, you'd have confidence scores
    return valid[0];
  }

  return valid[0];
}

/**
 * Merge location fields intelligently
 */
function mergeLocation(locations) {
  const validLocs = locations.filter((l) => l.value);
  if (validLocs.length === 0) return null;

  const merged = {
    city: null,
    region: null,
    country: null,
  };

  // Prefer most specific (more fields filled)
  const sorted = validLocs.sort((a, b) => {
    const aFilled = Object.values(a.value).filter((v) => v).length;
    const bFilled = Object.values(b.value).filter((v) => v).length;
    return bFilled - aFilled;
  });

  // Merge from best to worst
  for (const loc of sorted) {
    if (!merged.city && loc.value.city) merged.city = loc.value.city;
    if (!merged.region && loc.value.region) merged.region = loc.value.region;
    if (!merged.country && loc.value.country) merged.country = loc.value.country;
  }

  return merged.city || merged.region || merged.country ? merged : null;
}

/**
 * Merge experience arrays with deduplication
 */
function mergeExperience(experiences) {
  const allExps = experiences.flatMap((e) => e.experiences);
  if (allExps.length === 0) return [];

  // Deduplicate by company + title
  const seen = new Set();
  const deduped = [];

  for (const exp of allExps) {
    const key = `${exp.company}|${exp.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(exp);
    }
  }

  // Sort by recency (most recent first) - prefer entries with end_date or assume recent
  return deduped.sort((a, b) => {
    const aTime = a.end_date ? new Date(a.end_date).getTime() : Date.now();
    const bTime = b.end_date ? new Date(b.end_date).getTime() : Date.now();
    return bTime - aTime;
  });
}

/**
 * Merge education arrays with deduplication
 */
function mergeEducation(educations) {
  const allEdus = educations.flatMap((e) => e.educations);
  if (allEdus.length === 0) return [];

  // Deduplicate by institution + degree
  const seen = new Set();
  const deduped = [];

  for (const edu of allEdus) {
    const key = `${edu.institution}|${edu.degree}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(edu);
    }
  }

  return deduped;
}

/**
 * Deduplicate array (case-insensitive for strings)
 */
function deduplicateArray(arr) {
  const seen = new Set();
  const deduped = [];

  for (const item of arr) {
    const key = typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped;
}

/**
 * Deduplicate links (by type + url)
 */
function deduplicateLinks(links) {
  const seen = new Set();
  const deduped = [];

  for (const link of links) {
    const key = `${link.type}|${link.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(link);
    }
  }

  return deduped;
}

/**
 * Calculate overall confidence based on data completeness and agreement
 */
function calculateConfidence(merged, provenanceMap) {
  let score = 0;
  let fieldCount = 0;

  const criticalFields = ['full_name', 'emails', 'phones', 'headline', 'skills'];
  const importantFields = ['location', 'current_company', 'experience', 'education'];

  // Critical fields (weight: 40%)
  for (const field of criticalFields) {
    const value = merged[field];
    const isFilled = value !== null && value !== undefined && 
                    (Array.isArray(value) ? value.length > 0 : true);
    if (isFilled) score += 0.4 / criticalFields.length;
  }

  // Important fields (weight: 30%)
  for (const field of importantFields) {
    const value = merged[field];
    const isFilled = value !== null && value !== undefined && 
                    (Array.isArray(value) ? value.length > 0 : true);
    if (isFilled) score += 0.3 / importantFields.length;
  }

  // Provenance diversity bonus (weight: 30%)
  const sources = new Set(Object.values(provenanceMap).map((p) => p.source).filter((s) => s !== 'null'));
  score += (Math.min(sources.size, 3) / 3) * 0.3;

  return Math.round(score * 100) / 100;
}

/**
 * Resolve conflicts between values from different sources
 */
export function resolveConflicts(values, conflictKey, strategy = 'source_priority') {
  return selectWinner(values, strategy);
}
