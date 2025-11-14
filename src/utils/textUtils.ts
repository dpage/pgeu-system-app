/**
 * Text Utilities
 * Helper functions for text manipulation and formatting
 */

export interface HighlightMatch {
  before: string;
  match: string;
  after: string;
}

/**
 * Finds and extracts the first occurrence of a query string within text
 * Case-insensitive search
 * @param text - The text to search in
 * @param query - The query string to find
 * @returns An object with before, match, and after segments, or null if not found
 */
export function highlightText(text: string, query: string): HighlightMatch | null {
  if (!query || query.trim().length === 0) {
    return null;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return null;
  }

  return {
    before: text.substring(0, index),
    match: text.substring(index, index + lowerQuery.length),
    after: text.substring(index + lowerQuery.length),
  };
}
