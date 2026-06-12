import { Injectable } from '@nestjs/common';

@Injectable()
export class FileExtractorService {
  /**
   * Extracts fenced code blocks that carry a file path.
   *
   * Pass 1: ```lang path/to/file
   * Pass 2: ```lang\n// path/to/file OR # path/to/file
   */
  extract(markdown: string): Array<{ path: string; content: string }> {
    const results = new Map<string, string>();

    // Pass 1: path inline with fence — ```lang path/to/file
    // Regex explanation:
    // ^```[a-z]*          - matches the opening fence and optional language
    // \s+                 - at least one space required before the path
    // ([\w./\-]+\/[\w./\-]+) - captures the file path (must contain at least one /)
    // \s*\n               - optional trailing space then newline
    // ([\s\S]*?)          - captures content (non-greedy)
    // ^```                - matches the closing fence on a new line
    const inlinePattern =
      /^```[a-z]*\s+([\w./\-]+\/[\w./\-]+)\s*\n([\s\S]*?)^```/gm;
    let match: RegExpExecArray | null;
    while ((match = inlinePattern.exec(markdown)) !== null) {
      results.set(match[1].trim(), match[2]);
    }

    // Pass 2: path as first comment line inside block — ```lang\n// path/to/file
    // Regex explanation:
    // ^```[a-z]*\s*\n     - matches opening fence and lang followed by newline
    // (?:\/\/|#)\s*       - matches // or # followed by optional space
    // ([\w./\-]+\/[\w./\-]+) - captures the file path (must contain at least one /)
    // \s*\n               - optional trailing space then newline
    // ([\s\S]*?)          - captures content (non-greedy)
    // ^```                - matches closing fence
    const commentPattern =
      /^```[a-z]*\s*\n(?:\/\/|#)\s*([\w./\-]+\/[\w./\-]+)\s*\n([\s\S]*?)^```/gm;
    while ((match = commentPattern.exec(markdown)) !== null) {
      const path = match[1].trim();
      // Only set if Pass 1 didn't already find it (Pass 1 wins)
      if (!results.has(path)) {
        results.set(path, match[2]);
      }
    }

    return Array.from(results.entries()).map(([path, content]) => ({
      path,
      content,
    }));
  }
}
