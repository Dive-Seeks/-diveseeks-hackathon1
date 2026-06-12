import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PromptCompilerService {
  compile(
    template: string,
    variables: Record<string, unknown>,
    partials: Map<string, string> = new Map(),
  ): string {
    let result = this.expandPartials(template, partials, new Set());
    result = this.interpolate(result, variables);
    return result;
  }

  private expandPartials(
    template: string,
    partials: Map<string, string>,
    visited: Set<string>,
  ): string {
    return template.replace(
      /\{\{>\s*([a-z0-9_-]+)\s*\}\}/g,
      (_match, slug: string) => {
        if (visited.has(slug)) {
          throw new BadRequestException(`Circular partial reference: ${slug}`);
        }
        const body = partials.get(slug);
        if (!body) return `{{> ${slug}}}`;
        visited.add(slug);
        const expanded = this.expandPartials(body, partials, visited);
        visited.delete(slug);
        return expanded;
      },
    );
  }

  private interpolate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
      const trimmed = key.trim();
      if (trimmed.startsWith('>')) return _match;
      const value = variables[trimmed];
      return value !== undefined ? String(value) : _match;
    });
  }

  extractVariables(template: string): string[] {
    const vars = new Set<string>();
    const matches = template.matchAll(/\{\{([^>][^}]*)\}\}/g);
    for (const m of matches) {
      const key = m[1].trim();
      if (key) vars.add(key);
    }
    return [...vars];
  }
}
