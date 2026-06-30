/**
 * Normalizers: Standardization functions for common fields
 * Handles: phone numbers (E.164), dates (YYYY-MM), countries (ISO 3166), skills (canonical)
 */

/**
 * Normalize phone to E.164 format: +[country-code][number]
 * Handles: various formats (555-1234, (555) 123-4567, +1 555 1234, etc.)
 * Returns: E.164 formatted string or null if invalid
 *
 * Edge cases handled:
 * - US/Canada numbers (default country code 1)
 * - Numbers without country code (assumes US)
 * - Missing digits
 * - Non-numeric characters
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  cleaned = cleaned.replace(/^\++/, '+');

  // If starts with +, extract digits only
  let digits = cleaned.replace(/\D/g, '');

  // Handle empty after cleanup
  if (digits.length === 0) return null;

  // If no country code (< 11 digits for US), assume US (+1)
  if (digits.length <= 10) {
    digits = '1' + digits;
  }

  // Validate minimum length (too short is invalid)
  if (digits.length < 10) return null;

  // Take first 15 digits max (E.164 standard)
  digits = digits.slice(0, 15);

  return `+${digits}`;
}

/**
 * Normalize date to YYYY-MM format
 * Handles multiple input formats:
 * - "2023-01-15" → "2023-01"
 * - "01/15/2023" → "2023-01"
 * - "January 15, 2023" → "2023-01"
 * - "15 Jan 2023" → "2023-01"
 * - "2023" → "2023"
 *
 * Edge cases:
 * - Invalid dates return null
 * - Partial dates (year only) are accepted
 * - Timezone info is ignored
 */
export function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();

  // Try parsing as ISO date first
  let match = trimmed.match(/^(\d{4})-(\d{1,2})(-\d{1,2})?/);
  if (match) {
    const year = match[1];
    const month = String(match[2]).padStart(2, '0');
    return `${year}-${month}`;
  }

  // Try MM/DD/YYYY format
  match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const month = String(match[1]).padStart(2, '0');
    const year = match[3];
    return `${year}-${month}`;
  }

  // Try full month name format (e.g., "January 15, 2023" or "15 January 2023")
  const monthMap = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };
  const monthNames = Object.keys(monthMap).join('|');
  match = trimmed.match(new RegExp(`(${monthNames})\\s+(\\d{1,2},?)?\\s+(\\d{4})`, 'i'));
  if (match) {
    const month = monthMap[match[1].toLowerCase()];
    const year = match[3];
    return `${year}-${month}`;
  }

  // Try abbreviated month format (e.g., "15 Jan 2023" or "Jan 15 2023")
  const abbrevMap = {
    jan: '01', feb: '02', mar: '03', apr: '04',
    may: '05', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const abbrevNames = Object.keys(abbrevMap).join('|');
  match = trimmed.match(new RegExp(`(${abbrevNames})\\s+(\\d{1,2},?)?\\s+(\\d{4})`, 'i'));
  if (match) {
    const month = abbrevMap[match[1].toLowerCase()];
    const year = match[3];
    return `${year}-${month}`;
  }

  // Try year only
  match = trimmed.match(/^(\d{4})$/);
  if (match) {
    return match[1];
  }

  // If all parsing fails, try JavaScript Date as fallback
  const dateObj = new Date(trimmed);
  if (!isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return null;
}

/**
 * Normalize country to ISO 3166-1 alpha-2 code
 * Handles: full names, alpha-3 codes, various spellings
 * Returns: 2-letter country code or null if not found
 *
 * Edge cases:
 * - "United States" → "US"
 * - "USA" → "US"
 * - "GB" (already correct) → "GB"
 * - "England" → "GB"
 * - "Scotland" → "GB"
 */
export function normalizeCountry(country) {
  if (!country || typeof country !== 'string') return null;

  const normalized = country.trim().toUpperCase();

  // Map of country names and codes to ISO 3166-1 alpha-2
  const countryMap = {
    // Common names
    'UNITED STATES': 'US', 'USA': 'US', 'US': 'US', 'UNITED STATES OF AMERICA': 'US',
    'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GB': 'GB', 'ENGLAND': 'GB', 'SCOTLAND': 'GB', 'WALES': 'GB',
    'CANADA': 'CA', 'INDIA': 'IN', 'AUSTRALIA': 'AU', 'GERMANY': 'DE', 'FRANCE': 'FR',
    'JAPAN': 'JP', 'CHINA': 'CN', 'MEXICO': 'MX', 'BRAZIL': 'BR', 'SOUTH KOREA': 'KR',
    'SINGAPORE': 'SG', 'HONG KONG': 'HK', 'IRELAND': 'IE', 'NETHERLANDS': 'NL',
    'SPAIN': 'ES', 'ITALY': 'IT', 'SWITZERLAND': 'CH', 'SWEDEN': 'SE', 'NORWAY': 'NO',
    'DENMARK': 'DK', 'FINLAND': 'FI', 'BELGIUM': 'BE', 'AUSTRIA': 'AT', 'POLAND': 'PL',
    'THAILAND': 'TH', 'VIETNAM': 'VN', 'PHILIPPINES': 'PH', 'INDONESIA': 'ID',
    'MALAYSIA': 'MY', 'NEW ZEALAND': 'NZ', 'PAKISTAN': 'PK', 'BANGLADESH': 'BD',

    // Alpha-3 codes
    'USA': 'US', 'GBR': 'GB', 'CAN': 'CA', 'IND': 'IN', 'AUS': 'AU', 'DEU': 'DE',
    'FRA': 'FR', 'JPN': 'JP', 'CHN': 'CN', 'MEX': 'MX', 'BRA': 'BR', 'KOR': 'KR',

    // Already 2-letter codes
    'US': 'US', 'CA': 'CA', 'IN': 'IN', 'AU': 'AU', 'DE': 'DE', 'FR': 'FR',
    'GB': 'GB', 'JP': 'JP', 'CN': 'CN', 'MX': 'MX', 'BR': 'BR', 'KR': 'KR',
    'SG': 'SG', 'HK': 'HK', 'IE': 'IE', 'NL': 'NL', 'ES': 'ES', 'IT': 'IT',
    'CH': 'CH', 'SE': 'SE', 'NO': 'NO', 'DK': 'DK', 'FI': 'FI', 'BE': 'BE',
    'AT': 'AT', 'PL': 'PL', 'TH': 'TH', 'VN': 'VN', 'PH': 'PH', 'ID': 'ID',
    'MY': 'MY', 'NZ': 'NZ', 'PK': 'PK', 'BD': 'BD',
  };

  return countryMap[normalized] || null;
}

/**
 * Canonicalize skill names to standard form
 * Maps variations to canonical names
 *
 * Examples:
 * - "js" → "JavaScript"
 * - "python3" → "Python"
 * - "React.js" → "React"
 * - "node.js" → "Node.js"
 * - "C++" → "C++"
 */
export function canonicalizeSkill(skill) {
  if (!skill || typeof skill !== 'string') return skill;

  const normalized = skill.trim().toLowerCase();

  const skillMap = {
    // Languages
    'js': 'JavaScript', 'javascript': 'JavaScript', 'ts': 'TypeScript', 'typescript': 'TypeScript',
    'py': 'Python', 'python': 'Python', 'python2': 'Python', 'python3': 'Python',
    'java': 'Java', 'c++': 'C++', 'cpp': 'C++', 'c#': 'C#', 'csharp': 'C#',
    'go': 'Go', 'golang': 'Go', 'rust': 'Rust', 'php': 'PHP', 'ruby': 'Ruby',
    'swift': 'Swift', 'kotlin': 'Kotlin', 'scala': 'Scala', 'r': 'R',
    'matlab': 'MATLAB', 'sql': 'SQL', 'pl/sql': 'PL/SQL',

    // Frontend
    'react': 'React', 'react.js': 'React', 'reactjs': 'React', 'vue': 'Vue',
    'vue.js': 'Vue', 'vuejs': 'Vue', 'angular': 'Angular', 'angular.js': 'Angular',
    'svelte': 'Svelte', 'next': 'Next.js', 'nextjs': 'Next.js', 'nuxt': 'Nuxt',
    'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'sass': 'SASS', 'less': 'Less',
    'tailwind': 'Tailwind CSS', 'bootstrap': 'Bootstrap',

    // Backend / Full-stack
    'node': 'Node.js', 'nodejs': 'Node.js', 'node.js': 'Node.js',
    'express': 'Express', 'django': 'Django', 'flask': 'Flask', 'fastapi': 'FastAPI',
    'spring': 'Spring', 'spring boot': 'Spring Boot', 'rails': 'Rails', 'ruby on rails': 'Ruby on Rails',
    'laravel': 'Laravel', 'asp.net': 'ASP.NET', 'aspnet': 'ASP.NET',

    // Databases
    'postgres': 'PostgreSQL', 'postgresql': 'PostgreSQL', 'mysql': 'MySQL',
    'mongodb': 'MongoDB', 'mongo': 'MongoDB', 'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
    'cassandra': 'Cassandra', 'dynamodb': 'DynamoDB', 'firebase': 'Firebase',

    // DevOps / Cloud
    'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
    'aws': 'AWS', 'amazon web services': 'AWS', 'gcp': 'GCP', 'google cloud': 'GCP',
    'azure': 'Azure', 'jenkins': 'Jenkins', 'ci/cd': 'CI/CD', 'git': 'Git',
    'github': 'GitHub', 'gitlab': 'GitLab', 'terraform': 'Terraform',

    // Tools / Libraries
    'git': 'Git', 'graphql': 'GraphQL', 'rest': 'REST', 'api': 'API',
    'json': 'JSON', 'xml': 'XML', 'grpc': 'gRPC',
  };

  const canonical = skillMap[normalized];
  if (canonical) return canonical;

  // Return original with title case if no mapping found
  return skill
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate email format (basic check)
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (must have at least 10 digits)
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}
