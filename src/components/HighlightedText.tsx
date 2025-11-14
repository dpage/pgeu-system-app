/**
 * Highlighted Text Component
 * Displays text with a highlighted search query match
 */

import React from 'react';
import { highlightText } from '../utils/textUtils';

export interface HighlightedTextProps {
  /** The text to display */
  text: string;
  /** The query string to highlight */
  query: string;
}

/**
 * Renders text with the first occurrence of the query highlighted in bold
 * If no match is found, renders the text as-is
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query }) => {
  const highlighted = highlightText(text, query);

  if (!highlighted) {
    return <span>{text}</span>;
  }

  const { before, match, after } = highlighted;

  return (
    <span>
      {before}
      <strong>{match}</strong>
      <HighlightedText text={after} query="" />
    </span>
  );
};
