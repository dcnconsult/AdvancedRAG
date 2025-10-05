"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function DomainUploadPage() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type === 'application/pdf'
    );

    if (files.length > 0) {
      addFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => 
      file.type === 'application/pdf'
    );

    if (files.length > 0) {
      addFiles(files);
    }
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const startUpload = useCallback(async () => {
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);
    
    // Track upload start analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'domain_upload_start', {
        event_category: 'engagement',
        event_label: 'pdf_upload',
        file_count: uploadedFiles.length
      });
    }

    // Simulate upload process
    for (const uploadedFile of uploadedFiles) {
      if (uploadedFile.status === 'pending') {
        setUploadedFiles(prev => 
          prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'uploading' } : f)
        );

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadedFiles(prev => 
            prev.map(f => f.id === uploadedFile.id ? { ...f, progress } : f)
          );
        }

        setUploadedFiles(prev => 
          prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'completed' } : f)
        );
      }
    }

    setIsUploading(false);

    // Track upload completion analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'domain_upload_complete', {
        event_category: 'engagement',
        event_label: 'pdf_upload',
        file_count: uploadedFiles.length
      });
    }

    // Navigate to domain management after successful upload
    setTimeout(() => {
      router.push('/query-builder');
    }, 2000);
  }, [uploadedFiles, router]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border-light dark:border-border-dark px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="text-primary-light dark:text-primary-dark size-7">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_6_543)">
                  <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                </g>
                <defs>
                  <clipPath id="clip0_6_543">
                    <rect fill="white" height="48" width="48"></rect>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">RAG Compare</h2>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
              <a className="hover:text-primary-light dark:hover:text-primary-dark" href="/query-builder">Query</a>
              <a className="text-primary-light dark:text-primary-dark font-bold" href="/domains">Domains</a>
              <a className="hover:text-primary-light dark:hover:text-primary-dark" href="/results">Evaluation</a>
              <a className="hover:text-primary-light dark:hover:text-primary-dark" href="/sessions">Sessions</a>
            </nav>
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">U</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary-light dark:hover:text-primary-dark mb-4"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Domains
              </button>
              <h1 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">Create New Domain</h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mt-2">
                Upload PDF documents to create a custom domain for RAG comparison
              </p>
            </div>

            {/* Upload Zone */}
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5' 
                  : 'border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-primary-light/10 dark:bg-primary-dark/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary-light dark:text-primary-dark">cloud_upload</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                    Drop PDF files here or click to browse
                  </h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Supports PDF files up to 50MB each. Multiple files can be uploaded at once.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Choose Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
                  Files to Upload ({uploadedFiles.length})
                </h3>
                <div className="space-y-3">
                  {uploadedFiles.map((uploadedFile) => (
                    <div 
                      key={uploadedFile.id}
                      className="flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">description</span>
                        <div>
                          <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                            {uploadedFile.file.name}
                          </p>
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {formatFileSize(uploadedFile.file.size)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {uploadedFile.status === 'uploading' && (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary-light dark:bg-primary-dark transition-all duration-300"
                                style={{ width: `${uploadedFile.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                              {uploadedFile.progress}%
                            </span>
                          </div>
                        )}
                        
                        {uploadedFile.status === 'completed' && (
                          <span className="material-symbols-outlined text-green-500">check_circle</span>
                        )}
                        
                        {uploadedFile.status === 'error' && (
                          <span className="material-symbols-outlined text-red-500">error</span>
                        )}
                        
                        {uploadedFile.status === 'pending' && (
                          <button
                            onClick={() => removeFile(uploadedFile.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">close</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={startUpload}
                    disabled={isUploading || uploadedFiles.some(f => f.status === 'uploading')}
                    className="px-6 py-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Start Upload'}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Guidelines */}
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Upload Guidelines</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <li>• Only PDF files are supported</li>
                <li>• Maximum file size: 50MB per file</li>
                <li>• Documents will be processed and chunked automatically</li>
                <li>• Processing time depends on document size and complexity</li>
                <li>• You can upload multiple files to create a comprehensive domain</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
