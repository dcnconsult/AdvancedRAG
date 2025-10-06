/**
 * @fileoverview Presentation-specific chunking implementation
 * @module documentProcessing/chunkers/PresentationSpecificChunker
 */

import { BaseChunker } from './BaseChunker';
import { DocumentChunk, DocumentMetadata, PresentationSpecificChunkerConfig } from '../types';
import { estimateTokens, extractHeaders } from '../utils/textUtils';

export class PresentationSpecificChunker extends BaseChunker {
  private enableSlideBoundaries: boolean;
  private enableSectionGrouping: boolean;
  private preserveVisualContext: boolean;
  private includeSpeakerNotes: boolean;

  constructor(apiKey?: string, config: PresentationSpecificChunkerConfig = {}) {
    super(apiKey, {
      maxChunkSize: config.maxChunkSize || 600,
      generateEmbeddings: false
    });

    this.enableSlideBoundaries = config.enableSlideBoundaries ?? true;
    this.enableSectionGrouping = config.enableSectionGrouping ?? true;
    this.preserveVisualContext = config.preserveVisualContext ?? false;
    this.includeSpeakerNotes = config.includeSpeakerNotes ?? true;
  }

  async createChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    return this.createPresentationSpecificChunks(text, metadata);
  }

  async createPresentationSpecificChunks(text: string, metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    try {
      const presentation = this.parsePresentationStructure(text);
      const chunks = await this.createPresentationChunks(presentation, metadata);
      return this.addNavigationMetadata(chunks);
    } catch (error) {
      console.error('Presentation-specific chunking failed:', error);
      return this.createFallbackChunks(text, metadata, 'presentation-specific');
    }
  }

  private parsePresentationStructure(text: string): any {
    const lines = text.split('\n');
    const slides: any[] = [];
    let currentSlide: any = null;
    let currentSection: string | null = null;

    lines.forEach((line, index) => {
      if (this.isSlideBoundary(line)) {
        if (currentSlide) {
          slides.push(currentSlide);
        }
        
        currentSlide = {
          title: this.extractSlideTitle(line),
          content: [],
          notes: [],
          slideNumber: slides.length + 1,
          section: currentSection,
          metadata: {
            hasBullets: false,
            hasImages: false,
            hasCharts: false
          }
        };
      } else if (this.isSectionBoundary(line)) {
        currentSection = this.extractSectionTitle(line);
        if (currentSlide) {
          currentSlide.section = currentSection;
        }
      } else if (this.isSpeakerNote(line)) {
        if (currentSlide) {
          currentSlide.notes.push(line.replace(/^(Speaker Notes?:|Notes?:)/i, '').trim());
        }
      } else if (currentSlide) {
        currentSlide.content.push(line);
        
        // Update metadata
        if (this.isBulletPoint(line)) currentSlide.metadata.hasBullets = true;
        if (this.hasImage(line)) currentSlide.metadata.hasImages = true;
        if (this.hasChart(line)) currentSlide.metadata.hasCharts = true;
      }
    });

    // Add last slide
    if (currentSlide) {
      slides.push(currentSlide);
    }

    // Group slides by section if enabled
    if (this.enableSectionGrouping) {
      return this.groupSlidesBySections(slides);
    }

    return { slides, sections: this.extractSections(slides) };
  }

  private async createPresentationChunks(
    presentation: any,
    metadata: DocumentMetadata
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    if (presentation.sections && presentation.sections.length > 0) {
      // Create chunks by section
      for (const section of presentation.sections) {
        const sectionChunks = await this.createSectionChunks(section, metadata, chunkIndex);
        chunks.push(...sectionChunks);
        chunkIndex += sectionChunks.length;
      }
    } else {
      // Create chunks by slide
      for (const slide of presentation.slides) {
        const slideChunk = this.createSlideChunk(slide, metadata, chunkIndex++);
        chunks.push(slideChunk);
      }
    }

    return chunks;
  }

  private async createSectionChunks(
    section: any,
    metadata: DocumentMetadata,
    startIndex: number
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const sectionContent = this.formatSectionContent(section);
    const tokens = estimateTokens(sectionContent);

    if (tokens <= this.maxChunkSize) {
      chunks.push(
        this.createDocumentChunk(
          sectionContent,
          metadata,
          startIndex,
          'presentation-specific',
          {
            contentType: 'section',
            sectionTitle: section.title,
            slideCount: section.slides.length,
            slideNumbers: section.slides.map((s: any) => s.slideNumber)
          }
        )
      );
    } else {
      // Split section into individual slides
      let chunkIndex = startIndex;
      for (const slide of section.slides) {
        chunks.push(this.createSlideChunk(slide, metadata, chunkIndex++));
      }
    }

    return chunks;
  }

  private createSlideChunk(slide: any, metadata: DocumentMetadata, chunkIndex: number): DocumentChunk {
    const content = this.formatSlideContent(slide);
    
    return this.createDocumentChunk(
      content,
      metadata,
      chunkIndex,
      'presentation-specific',
      {
        contentType: 'slide',
        slideNumber: slide.slideNumber,
        slideTitle: slide.title,
        section: slide.section,
        hasBullets: slide.metadata.hasBullets,
        hasImages: slide.metadata.hasImages,
        hasCharts: slide.metadata.hasCharts,
        hasNotes: slide.notes.length > 0
      }
    );
  }

  private formatSectionContent(section: any): string {
    const parts: string[] = [`# Section: ${section.title}\n`];
    
    for (const slide of section.slides) {
      parts.push(this.formatSlideContent(slide));
      parts.push('---'); // Slide separator
    }
    
    return parts.join('\n');
  }

  private formatSlideContent(slide: any): string {
    const parts: string[] = [];
    
    if (slide.title) {
      parts.push(`## Slide ${slide.slideNumber}: ${slide.title}`);
    }
    
    if (slide.content.length > 0) {
      parts.push('', ...slide.content);
    }
    
    if (this.includeSpeakerNotes && slide.notes.length > 0) {
      parts.push('', '**Speaker Notes:**', ...slide.notes);
    }
    
    return parts.join('\n');
  }

  private groupSlidesBySections(slides: any[]): any {
    const sections: any[] = [];
    let currentSection: any = null;

    for (const slide of slides) {
      if (slide.section && (!currentSection || currentSection.title !== slide.section)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: slide.section,
          slides: [slide]
        };
      } else if (currentSection) {
        currentSection.slides.push(slide);
      } else {
        // No section defined, create default
        if (!currentSection) {
          currentSection = {
            title: 'Main Content',
            slides: []
          };
        }
        currentSection.slides.push(slide);
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return { sections, slides };
  }

  private extractSections(slides: any[]): string[] {
    const sections = new Set<string>();
    slides.forEach(slide => {
      if (slide.section) {
        sections.add(slide.section);
      }
    });
    return Array.from(sections);
  }

  private isSlideBoundary(line: string): boolean {
    return /^(Slide\s+\d+|---+\s*Slide|#{1,2}\s+Slide|\[Slide\s+\d+\])/i.test(line);
  }

  private isSectionBoundary(line: string): boolean {
    return /^(Section:|Part\s+\d+:|Chapter\s+\d+:|#{1}\s+(?!Slide))/i.test(line);
  }

  private isSpeakerNote(line: string): boolean {
    return /^(Speaker Notes?:|Notes?:|Presenter Notes?:)/i.test(line);
  }

  private isBulletPoint(line: string): boolean {
    return /^[\s]*[-*•]\s+/.test(line);
  }

  private hasImage(line: string): boolean {
    return /\[Image:|!\[|<img/i.test(line);
  }

  private hasChart(line: string): boolean {
    return /\[Chart:|Graph:|Diagram:/i.test(line);
  }

  private extractSlideTitle(line: string): string {
    const match = line.match(/(?:Slide\s+\d+[:\s]+)?(.+)/i);
    return match ? match[1].trim() : 'Untitled Slide';
  }

  private extractSectionTitle(line: string): string {
    const match = line.match(/(?:Section:|Part\s+\d+:|Chapter\s+\d+:|#\s+)?(.+)/i);
    return match ? match[1].trim() : 'Untitled Section';
  }
}
