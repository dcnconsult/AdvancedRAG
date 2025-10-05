// Background Job System for Document Ingestion
// This implements a simple in-memory job queue for document processing
// In production, this would use Redis/Bull or similar queue system

export interface Job {
  id: string;
  type: 'document_processing' | 'embedding_generation' | 'chunk_processing';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
}

export interface JobProcessor {
  process(job: Job): Promise<any>;
}

export class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private processors: Map<string, JobProcessor> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startProcessing();
  }

  // Register a processor for a specific job type
  registerProcessor(type: string, processor: JobProcessor): void {
    this.processors.set(type, processor);
  }

  // Add a job to the queue
  async addJob(type: string, data: any, options: {
    maxRetries?: number;
    delay?: number;
  } = {}): Promise<string> {
    const jobId = this.generateJobId();
    const job: Job = {
      id: jobId,
      type,
      status: 'pending',
      data,
      progress: 0,
      createdAt: new Date(),
      retries: 0,
      maxRetries: options.maxRetries || 3
    };

    this.jobs.set(jobId, job);

    // Add delay if specified
    if (options.delay) {
      setTimeout(() => {
        this.processJob(jobId);
      }, options.delay);
    }

    return jobId;
  }

  // Get job status
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  // Get all jobs
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  // Get jobs by status
  getJobsByStatus(status: Job['status']): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  // Cancel a job
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Job cancelled';
      job.completedAt = new Date();
      return true;
    }
    return false;
  }

  // Start processing jobs
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, 1000); // Check every second
  }

  // Stop processing jobs
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Process the next available job
  private async processNextJob(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    const pendingJobs = this.getJobsByStatus('pending');
    if (pendingJobs.length === 0) {
      return;
    }

    // Sort by creation time (FIFO)
    const nextJob = pendingJobs.sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    )[0];

    await this.processJob(nextJob.id);
  }

  // Process a specific job
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return;
    }

    this.isProcessing = true;
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor registered for job type: ${job.type}`);
      }

      // Update progress callback
      const updateProgress = (progress: number) => {
        job.progress = Math.min(100, Math.max(0, progress));
      };

      // Add progress callback to job data
      const jobDataWithProgress = {
        ...job.data,
        updateProgress
      };

      const result = await processor.process({
        ...job,
        data: jobDataWithProgress
      });

      job.status = 'completed';
      job.result = result;
      job.progress = 100;
      job.completedAt = new Date();

    } catch (error) {
      job.retries++;
      
      if (job.retries >= job.maxRetries) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : String(error);
        job.completedAt = new Date();
      } else {
        // Retry the job
        job.status = 'pending';
        job.progress = 0;
        job.startedAt = undefined;
        
        // Exponential backoff
        const delay = Math.pow(2, job.retries) * 1000;
        setTimeout(() => {
          this.processJob(jobId);
        }, delay);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Generate unique job ID
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up completed jobs older than specified time
  cleanup(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoffTime
      ) {
        this.jobs.delete(jobId);
      }
    }
  }

  // Get queue statistics
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    };
  }
}

// Document Processing Job Processor
export class DocumentProcessingProcessor implements JobProcessor {
  private documentService: any; // DocumentService instance

  constructor(documentService: any) {
    this.documentService = documentService;
  }

  async process(job: Job): Promise<any> {
    const { documentId, file, chunkingOptions, updateProgress } = job.data;

    try {
      updateProgress(10);

      // Get document record
      const document = await this.documentService.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      updateProgress(20);

      // Process the document
      const processedDocument = await this.documentService.documentProcessor.processDocument(
        file,
        document.filename,
        chunkingOptions
      );

      updateProgress(60);

      // Update document with processed content
      await this.documentService.updateDocument(documentId, {
        content: processedDocument.text,
        metadata: processedDocument.metadata
      });

      updateProgress(80);

      // Store chunks
      await this.documentService.storeChunks(documentId, processedDocument.chunks);

      updateProgress(90);

      // Update domain document count
      await this.documentService.incrementDomainDocumentCount(document.domain_id);

      updateProgress(100);

      return {
        documentId,
        chunksCreated: processedDocument.chunks.length,
        processingTime: processedDocument.processingTime
      };

    } catch (error) {
      // Update document status to failed
      await this.documentService.updateDocumentStatus(documentId, 'failed');
      throw error;
    }
  }
}

// Embedding Generation Job Processor
export class EmbeddingGenerationProcessor implements JobProcessor {
  private documentService: any; // DocumentService instance

  constructor(documentService: any) {
    this.documentService = documentService;
  }

  async process(job: Job): Promise<any> {
    const { chunkIds, updateProgress } = job.data;

    try {
      updateProgress(10);

      // Get chunks
      const chunks = await Promise.all(
        chunkIds.map((id: string) => this.documentService.getChunk(id))
      );

      updateProgress(30);

      // Generate embeddings in batches
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Generate embeddings for batch
        const embeddings = await this.generateEmbeddings(
          batch.map(chunk => chunk.content)
        );

        // Update chunks with embeddings
        for (let j = 0; j < batch.length; j++) {
          await this.documentService.updateChunk(batch[j].id, {
            embedding: embeddings[j]
          });
        }

        results.push(...batch);
        
        const progress = 30 + ((i + batch.length) / chunks.length) * 60;
        updateProgress(progress);
      }

      updateProgress(100);

      return {
        chunksProcessed: results.length,
        embeddingsGenerated: results.length
      };

    } catch (error) {
      throw error;
    }
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Mock embedding generation
    // In production, this would call OpenAI API
    return texts.map(() => Array(1536).fill(0).map(() => Math.random()));
  }
}

// Job Queue Manager
export class JobQueueManager {
  private queue: JobQueue;
  private documentProcessor: DocumentProcessingProcessor;
  private embeddingProcessor: EmbeddingGenerationProcessor;

  constructor(documentService: any) {
    this.queue = new JobQueue();
    this.documentProcessor = new DocumentProcessingProcessor(documentService);
    this.embeddingProcessor = new EmbeddingGenerationProcessor(documentService);

    // Register processors
    this.queue.registerProcessor('document_processing', this.documentProcessor);
    this.queue.registerProcessor('embedding_generation', this.embeddingProcessor);

    // Start cleanup interval
    setInterval(() => {
      this.queue.cleanup(24); // Clean up jobs older than 24 hours
    }, 60 * 60 * 1000); // Run every hour
  }

  // Add document processing job
  async processDocument(
    documentId: string,
    file: File,
    chunkingOptions: any
  ): Promise<string> {
    return this.queue.addJob('document_processing', {
      documentId,
      file,
      chunkingOptions
    });
  }

  // Add embedding generation job
  async generateEmbeddings(chunkIds: string[]): Promise<string> {
    return this.queue.addJob('embedding_generation', {
      chunkIds
    });
  }

  // Get job status
  getJobStatus(jobId: string): Job | undefined {
    return this.queue.getJob(jobId);
  }

  // Get all jobs
  getAllJobs(): Job[] {
    return this.queue.getAllJobs();
  }

  // Get queue statistics
  getQueueStats() {
    return this.queue.getStats();
  }

  // Cancel job
  cancelJob(jobId: string): boolean {
    return this.queue.cancelJob(jobId);
  }

  // Stop the queue
  stop(): void {
    this.queue.stopProcessing();
  }
}
