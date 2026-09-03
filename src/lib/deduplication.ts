import { Contact } from './db';

/**
 * Normalizes phone numbers by stripping non-digit characters (except leading +).
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Normalizes email address by trimming and lowercasing.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Computes the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const strA = a.toLowerCase().trim();
  const strB = b.toLowerCase().trim();

  if (strA === strB) return 0;
  if (strA.length === 0) return strB.length;
  if (strB.length === 0) return strA.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= strB.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= strA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= strB.length; i++) {
    for (let j = 1; j <= strA.length; j++) {
      if (strB.charAt(i - 1) === strA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[strB.length][strA.length];
}

/**
 * Computes Levenshtein similarity score between 0.0 (completely different) and 1.0 (exact match).
 */
export function stringSimilarity(a: string, b: string): number {
  const strA = a.toLowerCase().trim();
  const strB = b.toLowerCase().trim();

  if (strA === strB) return 1.0;
  const maxLen = Math.max(strA.length, strB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(strA, strB);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Jaro similarity helper.
 */
function jaroDistance(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Jaro-Winkler similarity (giving extra weight to common prefixes).
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  const jaro = jaroDistance(str1, str2);

  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(str1.length, str2.length, maxPrefix); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

export type DuplicateMatchReason =
  | 'exact_email'
  | 'normalized_phone'
  | 'exact_name_and_company'
  | 'fuzzy_name_and_company'
  | 'high_fuzzy_name_match';

export interface DuplicateMatch {
  existingContact: Contact;
  confidenceScore: number; // 0 to 100
  reason: DuplicateMatchReason;
  details: string;
}

export interface DuplicateCheckOptions {
  fuzzyThreshold?: number; // default 0.85
  checkPhone?: boolean;    // default true
  checkEmail?: boolean;    // default true
  checkCompany?: boolean;  // default true
}

/**
 * Detects duplicate contacts in a given list against candidate contact data.
 */
export function findDuplicateContacts(
  candidate: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  },
  existingContacts: Contact[],
  options: DuplicateCheckOptions = {}
): DuplicateMatch[] {
  const {
    fuzzyThreshold = 0.85,
    checkPhone = true,
    checkEmail = true,
    checkCompany = true,
  } = options;

  const matches: DuplicateMatch[] = [];

  const candidateEmail = normalizeEmail(candidate.email);
  const candidatePhone = normalizePhone(candidate.phone);
  const candidateFirst = (candidate.first_name || '').trim().toLowerCase();
  const candidateLast = (candidate.last_name || '').trim().toLowerCase();
  const candidateFullName = `${candidateFirst} ${candidateLast}`.trim();
  const candidateCompany = (candidate.company || '').trim().toLowerCase();

  for (const existing of existingContacts) {
    const existingEmail = normalizeEmail(existing.email);
    const existingPhone = normalizePhone(existing.phone);
    const existingFirst = (existing.first_name || '').trim().toLowerCase();
    const existingLast = (existing.last_name || '').trim().toLowerCase();
    const existingFullName = `${existingFirst} ${existingLast}`.trim();
    const existingCompany = (existing.company || '').trim().toLowerCase();

    // 1. Exact Email Match (Highest Confidence: 100%)
    if (checkEmail && candidateEmail && existingEmail && candidateEmail === existingEmail) {
      matches.push({
        existingContact: existing,
        confidenceScore: 100,
        reason: 'exact_email',
        details: `Exact matching email: ${existing.email}`,
      });
      continue;
    }

    // 2. Normalized Phone Match (Confidence: 95%)
    if (checkPhone && candidatePhone && existingPhone && candidatePhone.length >= 7) {
      if (candidatePhone === existingPhone || candidatePhone.endsWith(existingPhone) || existingPhone.endsWith(candidatePhone)) {
        matches.push({
          existingContact: existing,
          confidenceScore: 95,
          reason: 'normalized_phone',
          details: `Matching normalized phone number: ${existing.phone}`,
        });
        continue;
      }
    }

    // 3. Exact Name + Same Company (Confidence: 90%)
    if (
      checkCompany &&
      candidateFullName &&
      existingFullName &&
      candidateFullName === existingFullName &&
      candidateCompany &&
      existingCompany &&
      candidateCompany === existingCompany
    ) {
      matches.push({
        existingContact: existing,
        confidenceScore: 90,
        reason: 'exact_name_and_company',
        details: `Identical full name "${existing.first_name} ${existing.last_name}" at company "${existing.company}"`,
      });
      continue;
    }

    // 4. Fuzzy Name + Matching Company (Confidence: 80-89%)
    if (candidateFullName && existingFullName && candidateCompany && existingCompany) {
      const nameSim = Math.max(
        stringSimilarity(candidateFullName, existingFullName),
        jaroWinklerSimilarity(candidateFullName, existingFullName)
      );
      const compSim = stringSimilarity(candidateCompany, existingCompany);

      if (nameSim >= fuzzyThreshold && compSim >= 0.8) {
        matches.push({
          existingContact: existing,
          confidenceScore: Math.round(nameSim * 50 + compSim * 40),
          reason: 'fuzzy_name_and_company',
          details: `Fuzzy matching name (${Math.round(nameSim * 100)}%) and company (${Math.round(compSim * 100)}%) with ${existing.first_name} ${existing.last_name}`,
        });
        continue;
      }
    }

    // 5. Very High Fuzzy Name Match (Confidence: 75-85%)
    if (candidateFullName.length >= 5 && existingFullName.length >= 5) {
      const nameSim = jaroWinklerSimilarity(candidateFullName, existingFullName);
      if (nameSim >= 0.92) {
        matches.push({
          existingContact: existing,
          confidenceScore: Math.round(nameSim * 85),
          reason: 'high_fuzzy_name_match',
          details: `High similarity name match (${Math.round(nameSim * 100)}%): "${existing.first_name} ${existing.last_name}"`,
        });
      }
    }
  }

  // Sort matches by highest confidence score first
  return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Merges updated data into an existing contact, combining tags and preserving existing fields.
 */
export function mergeContactData(
  target: Contact,
  source: Partial<Contact>
): Contact {
  const mergedTags = Array.from(
    new Set([
      ...(Array.isArray(target.tags) ? target.tags : []),
      ...(Array.isArray(source.tags) ? source.tags : []),
    ])
  );

  let mergedNotes = target.notes || '';
  if (source.notes && source.notes !== target.notes) {
    if (mergedNotes) {
      mergedNotes = `${mergedNotes}\n\n[Appended Note]:\n${source.notes}`;
    } else {
      mergedNotes = source.notes;
    }
  }

  return {
    ...target,
    first_name: source.first_name !== undefined && source.first_name !== null && source.first_name !== ''
      ? source.first_name
      : target.first_name,
    last_name: source.last_name !== undefined && source.last_name !== null && source.last_name !== ''
      ? source.last_name
      : target.last_name,
    email: source.email ? source.email : target.email,
    phone: source.phone ? source.phone : target.phone,
    company: source.company ? source.company : target.company,
    title: source.title ? source.title : target.title,
    source: target.source || source.source || 'Manual',
    tags: mergedTags,
    notes: mergedNotes,
    is_opted_out: source.is_opted_out !== undefined ? source.is_opted_out : target.is_opted_out,
  };
}
