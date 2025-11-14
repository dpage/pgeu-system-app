import { describe, it, expect } from 'vitest';
import { highlightText } from './textUtils';

describe('textUtils', () => {
  describe('highlightText', () => {
    it('should find and highlight a query in text', () => {
      const result = highlightText('Hello World', 'World');

      expect(result).toEqual({
        before: 'Hello ',
        match: 'World',
        after: '',
      });
    });

    it('should be case-insensitive', () => {
      const result = highlightText('Hello World', 'world');

      expect(result).toEqual({
        before: 'Hello ',
        match: 'World',
        after: '',
      });
    });

    it('should return null for empty query', () => {
      const result = highlightText('Hello World', '');

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only query', () => {
      const result = highlightText('Hello World', '   ');

      expect(result).toBeNull();
    });

    it('should return null when query is not found', () => {
      const result = highlightText('Hello World', 'xyz');

      expect(result).toBeNull();
    });

    it('should highlight query at the beginning of text', () => {
      const result = highlightText('Hello World', 'Hello');

      expect(result).toEqual({
        before: '',
        match: 'Hello',
        after: ' World',
      });
    });

    it('should highlight query in the middle of text', () => {
      const result = highlightText('The quick brown fox', 'quick');

      expect(result).toEqual({
        before: 'The ',
        match: 'quick',
        after: ' brown fox',
      });
    });

    it('should preserve original case in match', () => {
      const result = highlightText('JavaScript is AWESOME', 'awesome');

      expect(result).toEqual({
        before: 'JavaScript is ',
        match: 'AWESOME',
        after: '',
      });
    });

    it('should find first occurrence when query appears multiple times', () => {
      const result = highlightText('test test test', 'test');

      expect(result).toEqual({
        before: '',
        match: 'test',
        after: ' test test',
      });
    });

    it('should trim query before searching', () => {
      const result = highlightText('Hello World', '  World  ');

      expect(result).toEqual({
        before: 'Hello ',
        match: 'World',
        after: '',
      });
    });

    it('should handle special characters in text', () => {
      const result = highlightText('Price: $100.00', '$100');

      expect(result).toEqual({
        before: 'Price: ',
        match: '$100',
        after: '.00',
      });
    });
  });
});
