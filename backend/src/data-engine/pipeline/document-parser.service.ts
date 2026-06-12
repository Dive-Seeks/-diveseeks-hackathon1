import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

const pdfParse = require('pdf-parse');
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import * as crypto from 'crypto';

export interface DocumentSection {
  index: number;
  label: string;
  content: string;
}

export interface ParsedDocument {
  sourceId: string;
  filename: string;
  mimeType: string;
  sections: DocumentSection[];
  metadata: {
    pageCount?: number;
    sheetNames?: string[];
    author?: string;
  };
  parseQuality: number;
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  async parse(
    filePath: string,
    filename: string,
    mimeType: string,
  ): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    if (mimeType === 'application/pdf')
      return this.parsePdf(buffer, sha256, filename);
    if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      filename.endsWith('.csv')
    ) {
      return this.parseExcel(buffer, sha256, filename, mimeType);
    }
    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
      return this.parseWord(buffer, sha256, filename);
    }
    if (
      mimeType.includes('presentationml') ||
      mimeType.includes('powerpoint')
    ) {
      return this.parsePptx(filePath, sha256, filename);
    }
    if (mimeType.startsWith('image/')) {
      return this.parseImage(filePath, sha256, filename);
    }
    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      return this.parseText(buffer, sha256, filename);
    }
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  private async parsePdf(
    buffer: Buffer,
    sha256: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const data = await pdfParse(buffer);
    const pages = data.text.split(/\f/).filter((p) => p.trim().length > 0);
    return {
      sourceId: sha256,
      filename,
      mimeType: 'application/pdf',
      sections: pages.map((content, i) => ({
        index: i,
        label: `Page ${i + 1}`,
        content: content.trim(),
      })),
      metadata: { pageCount: data.numpages },
      parseQuality: pages.length > 0 ? 0.9 : 0.3,
    };
  }

  private async parseExcel(
    buffer: Buffer,
    sha256: string,
    filename: string,
    mimeType: string,
  ): Promise<ParsedDocument> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sections: DocumentSection[] = [];
    workbook.SheetNames.forEach((sheetName, i) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim().length > 0) {
        sections.push({ index: i, label: sheetName, content: csv });
      }
    });
    return {
      sourceId: sha256,
      filename,
      mimeType,
      sections,
      metadata: { sheetNames: workbook.SheetNames },
      parseQuality: sections.length > 0 ? 0.85 : 0.2,
    };
  }

  private async parseWord(
    buffer: Buffer,
    sha256: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    const paragraphs = result.value
      .split(/\n{2,}/)
      .filter((p) => p.trim().length > 30);
    return {
      sourceId: sha256,
      filename,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sections: paragraphs.map((content, i) => ({
        index: i,
        label: `Section ${i + 1}`,
        content: content.trim(),
      })),
      metadata: {},
      parseQuality: paragraphs.length > 0 ? 0.88 : 0.2,
    };
  }

  private async parsePptx(
    filePath: string,
    sha256: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const slideEntries = zip
      .getEntries()
      .filter((e: any) => /ppt\/slides\/slide\d+\.xml/.test(e.entryName));
    const sections: DocumentSection[] = slideEntries
      .map((entry: any, i: number) => {
        const xml = entry.getData().toString('utf8');
        const text = xml
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 2000);
        return { index: i, label: `Slide ${i + 1}`, content: text };
      })
      .filter((s: DocumentSection) => s.content.length > 10);
    return {
      sourceId: sha256,
      filename,
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      sections,
      metadata: { pageCount: slideEntries.length },
      parseQuality: sections.length > 0 ? 0.75 : 0.2,
    };
  }

  private async parseImage(
    filePath: string,
    sha256: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(filename).replace('.', '');
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: `data:${mimeType};base64,${base64}` },
            {
              type: 'text',
              text: 'Extract all text, tables, and key information from this image. Return structured plain text.',
            },
          ],
        },
      ],
    });
    return {
      sourceId: sha256,
      filename,
      mimeType,
      sections: [{ index: 0, label: 'Image content', content: text }],
      metadata: {},
      parseQuality: text.length > 50 ? 0.7 : 0.3,
    };
  }

  private async parseText(
    buffer: Buffer,
    sha256: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const text = buffer.toString('utf8');
    const sections = text
      .split(/\n{3,}/)
      .filter((s) => s.trim().length > 0)
      .map((content, i) => ({
        index: i,
        label: `Block ${i + 1}`,
        content: content.trim(),
      }));
    return {
      sourceId: sha256,
      filename,
      mimeType: 'text/plain',
      sections,
      metadata: {},
      parseQuality: 0.95,
    };
  }
}
