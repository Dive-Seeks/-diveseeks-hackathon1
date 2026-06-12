import * as fs from 'fs/promises';
import * as path from 'path';

export class TsvLoaderUtil {
  /**
   * Reads a TSV file and parses it into an array of objects based on the header row.
   */
  static async readTsv(filePath: string): Promise<Record<string, string>[]> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (lines.length === 0) return [];

      const headers = lines[0].split('\t').map((h) => h.trim());
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j] ? values[j].trim() : '';
        }
        rows.push(row);
      }
      return rows;
    } catch (e: any) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  /**
   * Appends a row to a TSV file. Creates the file and writes headers if it doesn't exist.
   */
  static async appendTsv(
    filePath: string,
    row: Record<string, string>,
    headers: string[],
  ): Promise<void> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    let fileExists = false;
    try {
      await fs.access(fullPath);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    const rowData = headers.map((h) => row[h] || '').join('\t');

    if (!fileExists) {
      const headerData = headers.join('\t');
      await fs.writeFile(fullPath, `${headerData}\n${rowData}\n`, 'utf8');
    } else {
      await fs.appendFile(fullPath, `${rowData}\n`, 'utf8');
    }
  }
}
