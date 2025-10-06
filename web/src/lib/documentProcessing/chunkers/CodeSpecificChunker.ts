/**
 * @fileoverview Code-specific chunking implementation
 * @module documentProcessing/chunkers/CodeSpecificChunker
 */

import { BaseChunker } from './BaseChunker';
import { DocumentChunk, DocumentMetadata, CodeSpecificChunkerConfig } from '../types';
import { estimateTokens } from '../utils/textUtils';
import { LANGUAGE_PATTERNS } from '../constants';

export class CodeSpecificChunker extends BaseChunker {
  private enableFunctionBoundaries: boolean;
  private enableClassBoundaries: boolean;
  private preserveImports: boolean;
  private preserveDocstrings: boolean;

  constructor(apiKey?: string, config: CodeSpecificChunkerConfig = {}) {
    super(apiKey, {
      maxChunkSize: config.maxChunkSize || 1000,
      generateEmbeddings: false
    });

    this.enableFunctionBoundaries = config.enableFunctionBoundaries ?? true;
    this.enableClassBoundaries = config.enableClassBoundaries ?? true;
    this.preserveImports = config.preserveImports ?? true;
    this.preserveDocstrings = config.preserveDocstrings ?? true;
  }

  async createChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    return this.createCodeSpecificChunks(text, metadata);
  }

  async createCodeSpecificChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    try {
      const language = this.detectLanguage(text, metadata.filename);
      const codeStructure = this.parseCodeStructure(text, language);
      const chunks = await this.createCodeStructureChunks(text, codeStructure, metadata, language);
      return this.addNavigationMetadata(chunks);
    } catch (error) {
      console.error('Code-specific chunking failed:', error);
      return this.createFallbackChunks(text, metadata, 'code-specific');
    }
  }

  private detectLanguage(text: string, filename: string): string {
    // Check file extension first
    const extension = filename.split('.').pop()?.toLowerCase();
    const extensionMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php'
    };

    if (extension && extensionMap[extension]) {
      return extensionMap[extension];
    }

    // Analyze content for language patterns
    return this.analyzeCodeContent(text);
  }

  private analyzeCodeContent(text: string): string {
    const scores: Record<string, number> = {};

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let score = 0;
      
      if (patterns.imports.test(text)) score += 2;
      if (patterns.class.test(text)) score += 2;
      if (patterns.function.test(text)) score += 2;
      if (patterns.comment.test(text)) score += 1;
      
      scores[lang] = score * patterns.weight;
    }

    const detected = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0];

    return detected ? detected[0] : 'unknown';
  }

  private parseCodeStructure(text: string, language: string): any {
    const lines = text.split('\n');
    const structure = {
      imports: [] as any[],
      classes: [] as any[],
      functions: [] as any[],
      globalCode: [] as any[],
      language
    };

    let currentClass: any = null;
    let currentFunction: any = null;
    let braceDepth = 0;

    lines.forEach((line, index) => {
      // Track brace depth for scope detection
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      if (this.isImport(line, language)) {
        structure.imports.push({
          line,
          lineNumber: index,
          content: line
        });
      } else if (this.isClassDeclaration(line, language)) {
        currentClass = {
          name: this.extractClassName(line, language),
          startLine: index,
          endLine: -1,
          methods: [],
          content: []
        };
        structure.classes.push(currentClass);
      } else if (this.isFunctionDeclaration(line, language)) {
        const func = {
          name: this.extractFunctionName(line, language),
          startLine: index,
          endLine: -1,
          content: []
        };

        if (currentClass && braceDepth > 0) {
          currentClass.methods.push(func);
          currentFunction = func;
        } else {
          structure.functions.push(func);
          currentFunction = func;
        }
      }

      // Add line to current context
      if (currentFunction) {
        currentFunction.content.push(line);
        if (braceDepth === (currentClass ? 1 : 0)) {
          currentFunction.endLine = index;
          currentFunction = null;
        }
      } else if (currentClass) {
        currentClass.content.push(line);
        if (braceDepth === 0) {
          currentClass.endLine = index;
          currentClass = null;
        }
      } else if (!this.isImport(line, language)) {
        structure.globalCode.push({ line, lineNumber: index });
      }
    });

    return structure;
  }

  private async createCodeStructureChunks(
    text: string,
    codeStructure: any,
    metadata: DocumentMetadata,
    language: string
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    // Create import chunk if needed
    if (this.preserveImports && codeStructure.imports.length > 0) {
      const importContent = codeStructure.imports.map((i: any) => i.content).join('\n');
      chunks.push(
        this.createDocumentChunk(
          importContent,
          metadata,
          chunkIndex++,
          'code-specific',
          {
            codeType: 'imports',
            language,
            lineCount: codeStructure.imports.length
          }
        )
      );
    }

    // Process classes
    for (const cls of codeStructure.classes) {
      const classChunks = this.createClassChunks(cls, metadata, chunkIndex, language);
      chunks.push(...classChunks);
      chunkIndex += classChunks.length;
    }

    // Process standalone functions
    for (const func of codeStructure.functions) {
      const funcContent = func.content.join('\n');
      const tokens = estimateTokens(funcContent);

      if (tokens <= this.maxChunkSize) {
        chunks.push(
          this.createDocumentChunk(
            funcContent,
            metadata,
            chunkIndex++,
            'code-specific',
            {
              codeType: 'function',
              functionName: func.name,
              language,
              startLine: func.startLine,
              endLine: func.endLine
            }
          )
        );
      } else {
        // Split large function
        const splitChunks = this.validateAndSplitChunk(funcContent, this.maxChunkSize);
        splitChunks.forEach((chunk, index) => {
          chunks.push(
            this.createDocumentChunk(
              chunk,
              metadata,
              chunkIndex++,
              'code-specific',
              {
                codeType: 'function-part',
                functionName: func.name,
                language,
                partNumber: index + 1,
                totalParts: splitChunks.length
              }
            )
          );
        });
      }
    }

    // Process global code
    if (codeStructure.globalCode.length > 0) {
      const globalContent = codeStructure.globalCode.map((g: any) => g.line).join('\n');
      if (globalContent.trim()) {
        chunks.push(
          this.createDocumentChunk(
            globalContent,
            metadata,
            chunkIndex,
            'code-specific',
            {
              codeType: 'global',
              language
            }
          )
        );
      }
    }

    return chunks;
  }

  private createClassChunks(cls: any, metadata: DocumentMetadata, startIndex: number, language: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const classContent = cls.content.join('\n');
    const tokens = estimateTokens(classContent);

    if (tokens <= this.maxChunkSize) {
      chunks.push(
        this.createDocumentChunk(
          classContent,
          metadata,
          startIndex,
          'code-specific',
          {
            codeType: 'class',
            className: cls.name,
            language,
            methodCount: cls.methods.length,
            startLine: cls.startLine,
            endLine: cls.endLine
          }
        )
      );
    } else {
      // Split class into methods
      let chunkIndex = startIndex;

      // Class declaration chunk
      const classDeclaration = cls.content.slice(0, 5).join('\n');
      chunks.push(
        this.createDocumentChunk(
          classDeclaration,
          metadata,
          chunkIndex++,
          'code-specific',
          {
            codeType: 'class-declaration',
            className: cls.name,
            language
          }
        )
      );

      // Method chunks
      for (const method of cls.methods) {
        const methodContent = method.content.join('\n');
        chunks.push(
          this.createDocumentChunk(
            methodContent,
            metadata,
            chunkIndex++,
            'code-specific',
            {
              codeType: 'method',
              className: cls.name,
              methodName: method.name,
              language
            }
          )
        );
      }
    }

    return chunks;
  }

  private isImport(line: string, language: string): boolean {
    const patterns = LANGUAGE_PATTERNS[language as keyof typeof LANGUAGE_PATTERNS];
    return patterns ? patterns.imports.test(line) : false;
  }

  private isClassDeclaration(line: string, language: string): boolean {
    const patterns = LANGUAGE_PATTERNS[language as keyof typeof LANGUAGE_PATTERNS];
    return patterns ? patterns.class.test(line) : false;
  }

  private isFunctionDeclaration(line: string, language: string): boolean {
    const patterns = LANGUAGE_PATTERNS[language as keyof typeof LANGUAGE_PATTERNS];
    return patterns ? patterns.function.test(line) : false;
  }

  private extractClassName(line: string, language: string): string {
    const match = line.match(/class\s+(\w+)/);
    return match ? match[1] : 'UnknownClass';
  }

  private extractFunctionName(line: string, language: string): string {
    const patterns = [
      /function\s+(\w+)/,
      /def\s+(\w+)/,
      /const\s+(\w+)\s*=/,
      /(\w+)\s*:\s*function/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[1];
    }

    return 'UnknownFunction';
  }
}
