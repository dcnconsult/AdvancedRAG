"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Track welcome screen analytics
  useEffect(() => {
    // Analytics event for welcome screen view
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'welcome_screen_view', {
        event_category: 'engagement',
        event_label: 'welcome_page'
      });
    }
  }, []);

  const handleStartComparison = () => {
    // Track CTA click analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'start_comparison_click', {
        event_category: 'engagement',
        event_label: 'cta_button'
      });
    }

    // Navigate to query builder
    router.push('/query-builder');
  };

  const handleLoginClick = () => {
    // Track login click analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'login_click', {
        event_category: 'engagement',
        event_label: 'nav_login'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="border-b border-primary/20 dark:border-primary/30">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-primary">
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
            <h1 className="text-xl font-bold text-black dark:text-white">RAG Compare</h1>
          </div>
          <div className="flex items-center gap-6">
            <a
              className="text-sm font-medium text-black dark:text-white hover:text-primary dark:hover:text-primary transition-colors"
              href="#"
            >
              Documentation
            </a>
            <a
              className="text-sm font-medium text-black dark:text-white hover:text-primary dark:hover:text-primary transition-colors"
              href="#"
            >
              Community
            </a>
            {user ? (
              <Link
                href="/sessions"
                className="text-sm font-medium text-black dark:text-white hover:text-primary dark:hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-black dark:text-white bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 px-4 py-2 rounded-lg transition-colors"
                onClick={handleLoginClick}
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-6">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-black dark:text-white tracking-tight mb-6">
            Directly Compare Advanced RAG Paradigms
          </h2>
          <p className="mt-4 text-xl text-black/60 dark:text-white/60 max-w-3xl mx-auto leading-relaxed">
            An open-source tool for AI/ML researchers to evaluate and find the best retrieval-augmented generation strategies for any use case.
          </p>

          {/* CTA Section */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleStartComparison}
              className="bg-primary text-white font-bold text-lg px-8 py-4 rounded-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Start New Comparison
            </button>

            {!user && (
              <div className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                <span>or</span>
                <Link
                  href="/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Create Account
                </Link>
                <span>to save your comparisons</span>
              </div>
            )}
          </div>

          {/* Features Preview */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-black dark:text-white mb-2">Side-by-Side Comparison</h3>
              <p className="text-sm text-black/60 dark:text-white/60">
                Compare multiple RAG techniques simultaneously with detailed performance metrics
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-black dark:text-white mb-2">Advanced Techniques</h3>
              <p className="text-sm text-black/60 dark:text-white/60">
                Test cutting-edge RAG methods: GraphRAG, Agentic RAG, Hybrid Search, and more
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-black dark:text-white mb-2">Real-time Results</h3>
              <p className="text-sm text-black/60 dark:text-white/60">
                Get instant feedback with detailed source tracing and performance analytics
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-primary/10">
        <p className="text-sm text-black/50 dark:text-white/50">
          Built by the open-source community for AI/ML researchers worldwide.
        </p>
      </footer>
    </div>
  );
}
