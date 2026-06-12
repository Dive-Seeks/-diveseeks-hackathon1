export class StreamingScrubber {
  private inSpan = false;
  private buf = '';
  private activeTag = '';

  private readonly SCRUBBED_TAGS = [
    'memory-context',
    'gene',
    'strategy',
    'evolution-event',
    'agent-context',
  ];

  process(chunk: string): string {
    let text = this.buf + chunk;
    this.buf = '';
    let output = '';

    while (text.length > 0) {
      if (!this.inSpan) {
        const openTag = this.findOpenTag(text);
        if (openTag.index === -1) {
          const partial = this.maxPartialSuffix(text);
          output += text.slice(0, text.length - partial.length);
          this.buf = partial;
          break;
        }
        output += text.slice(0, openTag.index);
        this.inSpan = true;
        this.activeTag = openTag.tag;
        text = text.slice(openTag.index + openTag.fullTag.length);
      } else {
        const closeTag = `</${this.activeTag}>`;
        const closeIdx = text.toLowerCase().indexOf(closeTag);
        if (closeIdx === -1) {
          const partial = this.maxPartialSuffix(text);
          this.buf = partial;
          break;
        }
        this.inSpan = false;
        this.activeTag = '';
        text = text.slice(closeIdx + closeTag.length);
      }
    }
    return output;
  }

  flush(): string {
    const out = this.inSpan ? '' : this.buf;
    this.buf = '';
    this.inSpan = false;
    return out;
  }

  private findOpenTag(text: string): {
    index: number;
    tag: string;
    fullTag: string;
  } {
    const lower = text.toLowerCase();
    for (const tag of this.SCRUBBED_TAGS) {
      const fullTag = `<${tag}>`;
      const idx = lower.indexOf(fullTag);
      if (idx !== -1) {
        return { index: idx, tag, fullTag };
      }
    }
    return { index: -1, tag: '', fullTag: '' };
  }

  private maxPartialSuffix(text: string): string {
    const lower = text.toLowerCase();
    let maxPartial = '';
    for (const tag of this.SCRUBBED_TAGS) {
      const openTag = `<${tag}>`;
      const closeTag = `</${tag}>`;

      for (let i = 1; i < openTag.length; i++) {
        if (lower.endsWith(openTag.slice(0, i))) {
          if (i > maxPartial.length) maxPartial = text.slice(-i);
        }
      }
      for (let i = 1; i < closeTag.length; i++) {
        if (lower.endsWith(closeTag.slice(0, i))) {
          if (i > maxPartial.length) maxPartial = text.slice(-i);
        }
      }
    }
    return maxPartial;
  }
}
