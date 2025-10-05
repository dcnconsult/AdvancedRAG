"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Domain {
  id: string;
  name: string;
  description: string;
  type: 'preloaded' | 'custom';
  documentCount: number;
  lastUpdated: string;
  isActive?: boolean;
}

const preloadedDomains: Domain[] = [
  {
    id: 'internal-docs',
    name: 'Internal Docs',
    description: 'Company documentation, policies, and procedures',
    type: 'preloaded',
    documentCount: 5,
    lastUpdated: '2 days ago'
  },
  {
    id: 'public-knowledge',
    name: 'Public Knowledge Base',
    description: 'Public documentation, FAQs, and user guides',
    type: 'preloaded',
    documentCount: 3,
    lastUpdated: '1 week ago'
  },
  {
    id: 'archived-projects',
    name: 'Archived Projects',
    description: 'Historical project documentation and postmortems',
    type: 'preloaded',
    documentCount: 2,
    lastUpdated: '3 months ago'
  }
];

export default function QueryBuilderPage() {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleDomainSelect = (domain: Domain) => {
    setSelectedDomain(domain);
    // Track domain selection analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'domain_selected', {
        event_category: 'engagement',
        event_label: domain.name,
        domain_type: domain.type
      });
    }
  };

  const handleUseDomain = (domain: Domain) => {
    // Navigate to query configuration with selected domain
    router.push(`/query-builder/configure?domain=${domain.id}`);
  };

  const handleNewDomain = () => {
    setShowUploadModal(true);
    // Track new domain creation analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'new_domain_click', {
        event_category: 'engagement',
        event_label: 'create_domain'
      });
    }
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
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">Domain Management</h1>
              <button 
                onClick={handleNewDomain}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-light dark:bg-primary-dark px-4 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>New Domain</span>
              </button>
            </div>

            {/* Domain Cards Grid */}
            <div className="mt-6 grid grid-cols-1 @[60rem]:grid-cols-2 @[90rem]:grid-cols-3 gap-6">
              {preloadedDomains.map((domain) => (
                <div 
                  key={domain.id}
                  className={`rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-sm transition-all duration-200 ${
                    selectedDomain?.id === domain.id 
                      ? 'ring-2 ring-primary-light dark:ring-primary-dark' 
                      : 'hover:shadow-md'
                  } ${domain.id === 'archived-projects' ? 'opacity-60' : ''}`}
                >
                  {/* Domain Header */}
                  <div className="p-6 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                          {domain.name}
                        </h3>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                          Last updated: {domain.lastUpdated}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-text-light-secondary dark:text-text-dark-secondary">
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-text-light-secondary dark:text-text-dark-secondary">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Domain Description */}
                  <div className="p-6">
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
                      {domain.description}
                    </p>
                    <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
                      Documents ({domain.documentCount})
                    </h4>
                    
                    {/* Sample Documents */}
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {domain.id === 'internal-docs' && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">description</span>
                              <span className="font-medium">Onboarding_Guide_v2.pdf</span>
                            </div>
                            <span className="text-text-light-secondary dark:text-text-dark-secondary">1.2 MB</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">description</span>
                              <span className="font-medium">API_Reference.docx</span>
                            </div>
                            <span className="text-text-light-secondary dark:text-text-dark-secondary">850 KB</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">description</span>
                              <span className="font-medium">Security_Protocols.pdf</span>
                            </div>
                            <span className="text-text-light-secondary dark:text-text-dark-secondary">2.5 MB</span>
                          </div>
                        </>
                      )}
                      {domain.id === 'public-knowledge' && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">description</span>
                              <span className="font-medium">FAQ_General.pdf</span>
                            </div>
                            <span className="text-text-light-secondary dark:text-text-dark-secondary">500 KB</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">description</span>
                              <span className="font-medium">Troubleshooting.pdf</span>
                            </div>
                            <span className="text-text-light-secondary dark:text-text-dark-secondary">1.8 MB</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Domain Actions */}
                  <div className="p-6 border-t border-border-light dark:border-border-dark flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className="flex-1 flex h-9 items-center justify-center gap-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-4 text-sm font-bold text-text-light-primary dark:text-text-dark-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                        disabled={domain.id === 'archived-projects'}
                      >
                        <span className="material-symbols-outlined text-base">upload_file</span>
                        <span>Upload</span>
                      </button>
                      <button 
                        className="flex-1 flex h-9 items-center justify-center gap-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-4 text-sm font-bold text-text-light-primary dark:text-text-dark-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                        disabled={domain.id === 'archived-projects'}
                      >
                        <span className="material-symbols-outlined text-base">delete_sweep</span>
                        <span>Rebuild</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => handleUseDomain(domain)}
                      className="w-full flex h-10 items-center justify-center rounded-lg bg-primary-light/10 dark:bg-primary-dark/20 px-4 text-sm font-bold text-primary-light dark:text-primary-dark hover:bg-primary-light/20 dark:hover:bg-primary-dark/30 transition-colors"
                      disabled={domain.id === 'archived-projects'}
                    >
                      Use this Domain
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Upload Modal Placeholder */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New Domain</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload PDF documents to create a custom domain for RAG comparison.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowUploadModal(false);
                    // Navigate to upload page
                    router.push('/domains/upload');
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
                >
                  Upload Documents
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}


