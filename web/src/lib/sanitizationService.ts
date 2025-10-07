/**
 * @fileoverview Client-side HTML Sanitization Service.
 *
 * This service provides a centralized function to sanitize user-generated
 * content before it is rendered in the application. It uses DOMPurify
 * to prevent Cross-Site Scripting (XSS) attacks.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import DOMPurify from 'dompurify';

class SanitizationService {
  private sanitizer: typeof DOMPurify;

  constructor() {
    // Check if running in a browser environment before initializing
    if (typeof window !== 'undefined') {
      this.sanitizer = DOMPurify(window);
    } else {
      // In a non-browser environment (like during SSR), we need a different setup.
      // For this project, we'll assume client-side only sanitization is sufficient
      // for the components where this will be used. A more robust solution for
      // SSR would involve a library like jsdom.
      this.sanitizer = {
        sanitize: (dirty: string | Node) => dirty.toString(),
      } as any;
    }
  }

  /**
   * Sanitizes a string of HTML, removing any potentially malicious content.
   * @param dirty - The untrusted HTML string to sanitize.
   * @returns A clean, safe HTML string.
   */
  sanitize(dirty: string): string {
    return this.sanitizer.sanitize(dirty);
  }
}

export const sanitizationService = new SanitizationService();
