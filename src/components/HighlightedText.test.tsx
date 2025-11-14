import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HighlightedText } from './HighlightedText';

describe('HighlightedText', () => {
  it('should render plain text when query is empty', () => {
    render(<HighlightedText text="Hello World" query="" />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
  });

  it('should render plain text when query is not found', () => {
    render(<HighlightedText text="Hello World" query="xyz" />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
  });

  it('should highlight matching text', () => {
    const { container } = render(<HighlightedText text="Hello World" query="World" />);

    expect(container.textContent).toBe('Hello World');
    const strongElement = screen.getByText('World');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('should be case-insensitive when highlighting', () => {
    const { container } = render(<HighlightedText text="Hello World" query="world" />);

    expect(container.textContent).toBe('Hello World');
    const strongElement = screen.getByText('World');
    expect(strongElement).toBeInTheDocument();
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('should highlight text at the beginning', () => {
    const { container } = render(<HighlightedText text="Hello World" query="Hello" />);

    expect(container.textContent).toBe('Hello World');
    const strongElement = screen.getByText('Hello');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('should highlight text in the middle', () => {
    const { container } = render(<HighlightedText text="The quick brown fox" query="quick" />);

    expect(container.textContent).toBe('The quick brown fox');
    const strongElement = screen.getByText('quick');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('should preserve original case in highlighted text', () => {
    const { container } = render(<HighlightedText text="JavaScript is AWESOME" query="awesome" />);

    expect(container.textContent).toBe('JavaScript is AWESOME');
    const strongElement = screen.getByText('AWESOME');
    expect(strongElement.tagName).toBe('STRONG');
    expect(strongElement.textContent).toBe('AWESOME');
  });

  it('should only highlight first occurrence', () => {
    const { container } = render(<HighlightedText text="test test test" query="test" />);

    expect(container.textContent).toBe('test test test');
    const allStrong = container.querySelectorAll('strong');
    expect(allStrong).toHaveLength(1);
    expect(allStrong[0].textContent).toBe('test');
  });

  it('should handle whitespace in query', () => {
    render(<HighlightedText text="Hello World" query="  World  " />);

    const strongElement = screen.getByText('World');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('should handle special characters', () => {
    const { container } = render(<HighlightedText text="Price: $100.00" query="$100" />);

    expect(container.textContent).toBe('Price: $100.00');
    const strongElement = screen.getByText('$100');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('should render complete structure with span wrapper', () => {
    const { container } = render(<HighlightedText text="Hello World" query="World" />);

    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('should handle empty text', () => {
    render(<HighlightedText text="" query="test" />);

    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
  });

  it('should handle text with only the query', () => {
    render(<HighlightedText text="Hello" query="Hello" />);

    const strongElement = screen.getByText('Hello');
    expect(strongElement.tagName).toBe('STRONG');
  });
});
