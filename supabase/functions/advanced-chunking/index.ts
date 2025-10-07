import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChunkingRequest {
  text: string
  filename?: string
  strategy?: 'auto' | 'semantic' | 'hierarchical' | 'context-preserving' | 'pdf-specific' | 'code-specific' | 'table-specific' | 'presentation-specific' | 'fixed'
  options?: {
    maxChunkSize?: number
    overlapSize?: number
    generateEmbeddings?: boolean
    enableQualityScoring?: boolean
    enableStrategySelection?: boolean
  }
}

interface ChunkingResponse {
  chunks: Array<{
    id: string
    content: string
    metadata: {
      chunkIndex: number
      chunkingStrategy: string
      tokenCount: number
      level: number
      startPosition: number
      endPosition: number
      overlapWithPrevious: boolean
      documentType?: string
      chunkType?: string
      chunkingParameters?: any
      documentStructure?: any
      language?: string
      qualityScore?: number
      [key: string]: any
    }
  }>
  metadata: {
    totalChunks: number
    documentType: string
    strategy: string
    processingTime: number
    qualityMetrics?: {
      averageQualityScore: number
      qualityDistribution: Record<string, number>
    }
  }
  errors?: string[]
}

class AdvancedChunkingService {
  private openai: OpenAI
  private supabase: any

  constructor() {
    this.openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })

    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  async chunkDocument(request: ChunkingRequest): Promise<ChunkingResponse> {
    const startTime = Date.now()

    try {
      const {
        text,
        filename = 'unknown',
        strategy = 'auto',
        options = {}
      } = request

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text content is required')
      }

      // Auto-detect strategy if not specified
      const finalStrategy = strategy === 'auto' ? this.detectOptimalStrategy(text, filename) : strategy

      // Create document metadata
      const metadata = await this.createDocumentMetadata(text, filename)

      // Select and execute chunking strategy
      const chunks = await this.executeChunkingStrategy(text, filename, finalStrategy, metadata, options)

      // Apply quality scoring if enabled
      let qualityChunks = chunks
      if (options.enableQualityScoring !== false) {
        qualityChunks = await this.applyQualityScoring(chunks, metadata)
      }

      // Apply strategy selection optimization if enabled
      const optimizedChunks = options.enableStrategySelection !== false
        ? await this.optimizeStrategySelection(qualityChunks, finalStrategy, metadata)
        : qualityChunks

      const processingTime = Date.now() - startTime

      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(optimizedChunks)

      return {
        chunks: optimizedChunks.map((chunk, index) => ({
          id: `chunk_${index}`,
          content: chunk.content,
          metadata: {
            chunkIndex: index,
            chunkingStrategy: finalStrategy,
            tokenCount: chunk.metadata.tokenCount || this.estimateTokens(chunk.content),
            level: chunk.metadata.level || 0,
            startPosition: chunk.metadata.startPosition || 0,
            endPosition: chunk.metadata.endPosition || chunk.content.length,
            overlapWithPrevious: chunk.metadata.overlapWithPrevious || false,
            documentType: metadata.documentType,
            chunkType: chunk.metadata.chunkType || 'content',
            chunkingParameters: chunk.metadata.chunkingParameters,
            documentStructure: chunk.metadata.documentStructure,
            language: chunk.metadata.language,
            qualityScore: chunk.metadata.qualityScore,
            ...chunk.metadata
          }
        })),
        metadata: {
          totalChunks: optimizedChunks.length,
          documentType: metadata.documentType,
          strategy: finalStrategy,
          processingTime,
          qualityMetrics
        }
      }
    } catch (error) {
      console.error('Error in advanced chunking:', error)
      throw error
    }
  }

  private detectOptimalStrategy(text: string, filename: string): string {
    // Simple strategy selection based on document type and content
    const extension = filename.split('.').pop()?.toLowerCase()

    // Check for specific document types
    if (extension === 'pdf' || filename.toLowerCase().includes('pdf')) {
      return 'pdf-specific'
    }

    if (['js', 'ts', 'py', 'java', 'cpp', 'cs', 'go', 'rs'].includes(extension || '')) {
      return 'code-specific'
    }

    if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
      return 'table-specific'
    }

    if (['pptx', 'ppt', 'odp'].includes(extension || '')) {
      return 'presentation-specific'
    }

    // Content-based detection
    if (text.includes('Slide ') || text.includes('Agenda') || text.includes('Summary')) {
      return 'presentation-specific'
    }

    if (text.includes('import ') || text.includes('def ') || text.includes('function ') || text.includes('class ')) {
      return 'code-specific'
    }

    if (text.includes('|') && text.split('|').length > 2) {
      return 'table-specific'
    }

    // Default to semantic chunking
    return 'semantic'
  }

  private async createDocumentMetadata(text: string, filename: string): Promise<any> {
    return {
      documentType: this.detectDocumentType(text, filename),
      filename,
      wordCount: text.split(/\s+/).length,
      characterCount: text.length,
      lineCount: text.split('\n').length,
      timestamp: new Date().toISOString()
    }
  }

  private detectDocumentType(text: string, filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase()

    // Check for markdown patterns
    if (text.includes('# ') || text.includes('## ') || text.includes('### ')) {
      return 'markdown'
    }

    // Check for HTML patterns
    if (text.includes('<html>') || text.includes('<body>') || text.includes('<div>')) {
      return 'html'
    }

    // Check for code patterns
    if (this.detectCodePatterns(text, extension)) {
      return 'code'
    }

    // Check for table/CSV patterns
    if (this.detectTablePatterns(text, extension)) {
      return 'table'
    }

    // Check for presentation patterns
    if (this.detectPresentationPatterns(text, extension)) {
      return 'presentation'
    }

    // Check file extension
    switch (extension) {
      case 'pdf':
        return 'pdf'
      case 'md':
      case 'markdown':
        return 'markdown'
      case 'html':
      case 'htm':
        return 'html'
      case 'txt':
        return 'text'
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return 'code'
      case 'csv':
      case 'xlsx':
      case 'xls':
        return 'table'
      case 'pptx':
      case 'ppt':
      case 'odp':
        return 'presentation'
      default:
        return 'unknown'
    }
  }

  private detectCodePatterns(text: string, extension?: string): boolean {
    const codePatterns = [
      /\b(function|class|def|interface|enum)\b/,
      /\b(import|export|from|require)\b/,
      /\/\/.*[\n\r]/,
      /\/\*[\s\S]*?\*\//,
      /\b(public|private|protected|static)\b/,
      /\b(var|let|const|val|type)\b\s+\w+\s*[=:]/,
      /[{}\[\]()]/,
    ]

    const hasCodePatterns = codePatterns.some(pattern => pattern.test(text))
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs']
    const hasCodeExtension = extension && codeExtensions.includes(extension)

    return hasCodePatterns || hasCodeExtension
  }

  private detectTablePatterns(text: string, extension?: string): boolean {
    const tablePatterns = [
      /,.*?,.*?,/g,
      /\t.*?\t/g,
      /\|.*\|.*\|/g,
      /\bName\s*:\s*Value/g,
    ]

    const hasTablePatterns = tablePatterns.some(pattern => pattern.test(text))
    const tableExtensions = ['csv', 'xlsx', 'xls', 'tsv']
    const hasTableExtension = extension && tableExtensions.includes(extension)

    return hasTablePatterns || hasTableExtension
  }

  private detectPresentationPatterns(text: string, extension?: string): boolean {
    const presentationPatterns = [
      /Slide\s*\d+/i,
      /Section\s*\d+/i,
      /Title\s*Slide/i,
      /Agenda/i,
      /Summary/i,
      /Questions?\s*\?/i,
    ]

    const hasPresentationPatterns = presentationPatterns.some(pattern => pattern.test(text))
    const presentationExtensions = ['pptx', 'ppt', 'odp', 'key']
    const hasPresentationExtension = extension && presentationExtensions.includes(extension)

    return hasPresentationPatterns || hasPresentationExtension
  }

  private async executeChunkingStrategy(
    text: string,
    filename: string,
    strategy: string,
    metadata: any,
    options: any
  ): Promise<any[]> {
    // This would integrate with the DocumentProcessor from the web app
    // For now, we'll implement a simplified version

    switch (strategy) {
      case 'semantic':
        return this.createSemanticChunks(text, metadata, options)
      case 'pdf-specific':
        return this.createPDFSpecificChunks(text, metadata, options)
      case 'code-specific':
        return this.createCodeSpecificChunks(text, metadata, options)
      case 'table-specific':
        return this.createTableSpecificChunks(text, metadata, options)
      case 'presentation-specific':
        return this.createPresentationSpecificChunks(text, metadata, options)
      default:
        return this.createSemanticChunks(text, metadata, options)
    }
  }

  private createSemanticChunks(text: string, metadata: any, options: any): any[] {
    const maxChunkSize = options.maxChunkSize || 1000
    const chunks = []
    let currentChunk = ''
    let chunkIndex = 0

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + sentence
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: {
              chunkIndex,
              chunkingStrategy: 'semantic',
              tokenCount: this.estimateTokens(currentChunk),
              level: 0,
              startPosition: 0,
              endPosition: currentChunk.length,
              overlapWithPrevious: false,
              documentType: metadata.documentType,
              chunkType: 'content'
            }
          })
          chunkIndex++
        }
        currentChunk = sentence
      }
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunkIndex,
          chunkingStrategy: 'semantic',
          tokenCount: this.estimateTokens(currentChunk),
          level: 0,
          startPosition: 0,
          endPosition: currentChunk.length,
          overlapWithPrevious: false,
          documentType: metadata.documentType,
          chunkType: 'content'
        }
      })
    }

    return chunks
  }

  private createPDFSpecificChunks(text: string, metadata: any, options: any): any[] {
    // Simplified PDF chunking - in production this would use the PDFSpecificChunker
    const chunks = []

    // Split by page breaks and section headers
    const sections = text.split(/\n\s*(?=\d+\.|\w+\s*[:.]|\f)/)

    let chunkIndex = 0
    for (const section of sections) {
      if (section.trim().length > 0) {
        chunks.push({
          content: section.trim(),
          metadata: {
            chunkIndex,
            chunkingStrategy: 'pdf-specific',
            tokenCount: this.estimateTokens(section),
            level: 0,
            startPosition: 0,
            endPosition: section.length,
            overlapWithPrevious: false,
            documentType: 'pdf',
            chunkType: 'section',
            chunkingParameters: {
              maxChunkSize: options.maxChunkSize || 800,
              enablePageBoundaries: true,
              enableSectionAwareChunking: true,
              preserveFiguresTables: true,
            }
          }
        })
        chunkIndex++
      }
    }

    return chunks
  }

  private createCodeSpecificChunks(text: string, metadata: any, options: any): any[] {
    // Simplified code chunking - in production this would use the CodeSpecificChunker
    const chunks = []

    // Split by function/class boundaries
    const codeBlocks = text.split(/\n\s*(?=(?:function|class|def|interface)\s)/)

    let chunkIndex = 0
    for (const block of codeBlocks) {
      if (block.trim().length > 0) {
        chunks.push({
          content: block.trim(),
          metadata: {
            chunkIndex,
            chunkingStrategy: 'code-specific',
            tokenCount: this.estimateTokens(block),
            level: 0,
            startPosition: 0,
            endPosition: block.length,
            overlapWithPrevious: false,
            documentType: 'code',
            chunkType: 'function',
            language: this.detectLanguageFromContent(block),
            chunkingParameters: {
              maxChunkSize: options.maxChunkSize || 600,
              enableFunctionBoundaries: true,
              enableClassBoundaries: true,
              preserveImports: true,
              preserveDocstrings: true,
            }
          }
        })
        chunkIndex++
      }
    }

    return chunks
  }

  private createTableSpecificChunks(text: string, metadata: any, options: any): any[] {
    // Simplified table chunking - in production this would use the TableSpecificChunker
    const chunks = []

    const lines = text.split('\n').filter(line => line.trim().length > 0)

    if (lines.length > 0) {
      chunks.push({
        content: text.trim(),
        metadata: {
          chunkIndex: 0,
          chunkingStrategy: 'table-specific',
          tokenCount: this.estimateTokens(text),
          level: 0,
          startPosition: 0,
          endPosition: text.length,
          overlapWithPrevious: false,
          documentType: 'table',
          chunkType: 'table',
          chunkingParameters: {
            maxChunkSize: options.maxChunkSize || 1000,
            preserveTableStructure: true,
            enableRowBasedChunking: true,
            enableColumnAwareChunking: true,
            enableSemanticGrouping: true,
          }
        }
      })
    }

    return chunks
  }

  private createPresentationSpecificChunks(text: string, metadata: any, options: any): any[] {
    // Simplified presentation chunking - in production this would use the PresentationSpecificChunker
    const chunks = []

    // Split by slide boundaries
    const slides = text.split(/\n\s*(?=(?:Slide|Agenda|Summary|Conclusion|Q&A|Questions?))/i)

    let chunkIndex = 0
    for (const slide of slides) {
      if (slide.trim().length > 0) {
        chunks.push({
          content: slide.trim(),
          metadata: {
            chunkIndex,
            chunkingStrategy: 'presentation-specific',
            tokenCount: this.estimateTokens(slide),
            level: 0,
            startPosition: 0,
            endPosition: slide.length,
            overlapWithPrevious: false,
            documentType: 'presentation',
            chunkType: 'slide',
            chunkingParameters: {
              maxChunkSize: options.maxChunkSize || 800,
              enableSlideBoundaries: true,
              preserveSlideStructure: true,
              maxSlidesPerChunk: 5,
            }
          }
        })
        chunkIndex++
      }
    }

    return chunks
  }

  private detectLanguageFromContent(content: string): string {
    if (content.includes('def ') && content.includes('import ')) return 'python'
    if (content.includes('function ') && content.includes('const ')) return 'javascript'
    if (content.includes('public class ') && content.includes('import ')) return 'java'
    if (content.includes('#include') && content.includes('int main')) return 'cpp'
    return 'unknown'
  }

  private estimateTokens(text: string): number {
    // Rough token estimation (words + punctuation)
    return text.split(/\s+/).length + text.split(/[.,!?;:]/).length - 1
  }

  private async applyQualityScoring(chunks: any[], metadata: any): Promise<any[]> {
    // Apply basic quality scoring based on chunk characteristics in parallel
    return Promise.all(chunks.map(async (chunk) => {
      const qualityScore = await this.calculateChunkQuality(chunk, metadata);
      return {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          qualityScore,
          qualityLevel: this.getQualityLevel(qualityScore),
        },
      };
    }));
  }

  private async calculateChunkQuality(chunk: any, metadata: any): Promise<number> {
    // This is now async to simulate more complex, potentially I/O-bound scoring
    let score = 0.5 // Base score

    // Length appropriateness (not too short, not too long)
    const tokenCount = chunk.metadata.tokenCount || 0
    if (tokenCount >= 50 && tokenCount <= 800) score += 0.2
    else if (tokenCount < 20) score -= 0.3
    else if (tokenCount > 1200) score -= 0.2

    // Content coherence (has meaningful content)
    if (chunk.content.length > 100 && !chunk.content.includes('...') && !chunk.content.includes('etc.')) {
      score += 0.2
    }

    // Document type appropriateness
    if (chunk.metadata.documentType && chunk.metadata.documentType !== 'unknown') {
      score += 0.1
    }

    return Promise.resolve(Math.min(1.0, Math.max(0.0, score)));
  }

  private getQualityLevel(score: number): string {
    if (score >= 0.8) return 'excellent'
    if (score >= 0.6) return 'good'
    if (score >= 0.4) return 'fair'
    return 'poor'
  }

  private async optimizeStrategySelection(chunks: any[], strategy: string, metadata: any): Promise<any[]> {
    // In production, this could analyze chunk quality and suggest strategy improvements
    // Here we simulate an async optimization process for each chunk in parallel
    return Promise.all(chunks.map(async (chunk) => {
      // Simulate some async optimization logic, e.g., re-evaluating chunk boundaries
      await new Promise(resolve => setTimeout(resolve, 1)); // non-blocking delay
      return chunk;
    }));
  }

  private calculateQualityMetrics(chunks: any[]): any {
    if (chunks.length === 0) {
      return null
    }

    const qualityScores = chunks.map(chunk => chunk.metadata.qualityScore || 0.5)
    const averageScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length

    const distribution = {
      excellent: qualityScores.filter(score => score >= 0.8).length,
      good: qualityScores.filter(score => score >= 0.6 && score < 0.8).length,
      fair: qualityScores.filter(score => score >= 0.4 && score < 0.6).length,
      poor: qualityScores.filter(score => score < 0.4).length,
    }

    return {
      averageQualityScore: averageScore,
      qualityDistribution: distribution
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, filename, strategy, options }: ChunkingRequest = await req.json()

    const chunkingService = new AdvancedChunkingService()
    const result = await chunkingService.chunkDocument({ text, filename, strategy, options })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in advanced-chunking function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
