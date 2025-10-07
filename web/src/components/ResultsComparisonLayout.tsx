/**
 * @fileoverview Responsive Grid Layout for RAG Results Comparison
 * 
 * This component provides a responsive layout system that adapts between:
 * - Desktop (≥1024px): Side-by-side grid comparison
 * - Tablet (768px-1023px): Two-column grid
 * - Mobile (<768px): Accordion/tabs view
 * 
 * Features:
 * - CSS Grid with breakpoints at 768px and 1024px
 * - Smooth transitions between layout modes
 * - Visual hierarchy maintenance across screen sizes
 * - Proper spacing and alignment
 * - Accessible and keyboard-navigable
 * 
 * @author RAG Showcase Team
 * @since 1.0.0
 */

"use client";

import React, { useState, useEffect } from 'react';
import analytics from '@/lib/analyticsService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ResultsComparisonLayoutProps {
  children: React.ReactNode;
  /** Number of techniques to display */
  techniqueCount: number;
  /** Optional custom className */
  className?: string;
  /** Layout mode override (auto-detected by default) */
  layoutMode?: 'grid' | 'tabs' | 'accordion';
}

export type LayoutMode = 'grid' | 'tabs' | 'accordion';

// ============================================================================
// Responsive Grid Layout Component
// ============================================================================

/**
 * Responsive Grid Layout for Results Comparison
 * 
 * Automatically adapts between grid, tabs, and accordion layouts based on
 * screen size and technique count.
 * 
 * @example
 * ```tsx
 * <ResultsComparisonLayout techniqueCount={3}>
 *   <TechniqueCard technique="GraphRAG" ... />
 *   <TechniqueCard technique="AgenticRAG" ... />
 *   <TechniqueCard technique="HybridRetrieval" ... />
 * </ResultsComparisonLayout>
 * ```
 */
export const ResultsComparisonLayout: React.FC<ResultsComparisonLayoutProps> = ({
  children,
  techniqueCount,
  className = '',
  layoutMode: propLayoutMode,
}) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [activeTab, setActiveTab] = useState(0);

  // Auto-detect layout mode based on screen size
  useEffect(() => {
    if (propLayoutMode) {
      setLayoutMode(propLayoutMode);
      return;
    }

    const handleResize = () => {
      const width = window.innerWidth;

      if (width >= 1024) {
        setLayoutMode('grid');
      } else if (width >= 768) {
        // Use tabs for tablet if many techniques, otherwise grid
        setLayoutMode(techniqueCount > 2 ? 'tabs' : 'grid');
      } else {
        // Mobile: use accordion for better UX
        setLayoutMode('accordion');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [techniqueCount, propLayoutMode]);

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={`results-comparison-layout ${className}`} data-layout={layoutMode}>
      {/* Layout Mode Indicator (for development) */}
      <div className="layout-mode-indicator">
        <span className="mode-badge">{layoutMode.toUpperCase()}</span>
      </div>

      {/* Grid Layout (Desktop) */}
      {layoutMode === 'grid' && (
        <div 
          className="grid-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(techniqueCount, 3)}, 1fr)`,
            gap: '1.5rem',
            padding: '1.5rem',
          }}
        >
          {childrenArray}
        </div>
      )}

      {/* Tabs Layout (Tablet) */}
      {layoutMode === 'tabs' && (
        <div className="tabs-layout">
          {/* Tab Headers */}
          <div className="tabs-header" role="tablist">
            {childrenArray.map((_, index) => (
              <button
                key={index}
                role="tab"
                aria-selected={activeTab === index}
                aria-controls={`tab-panel-${index}`}
                id={`tab-${index}`}
                className={`tab-button ${activeTab === index ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(index);
                  analytics.track('technique_tab_viewed', { index }).catch(() => {});
                }}
              >
                Technique {index + 1}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          <div className="tabs-content">
            {childrenArray.map((child, index) => (
              <div
                key={index}
                role="tabpanel"
                id={`tab-panel-${index}`}
                aria-labelledby={`tab-${index}`}
                hidden={activeTab !== index}
                className="tab-panel"
              >
                {child}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accordion Layout (Mobile) */}
      {layoutMode === 'accordion' && (
        <div className="accordion-layout">
          {childrenArray.map((child, index) => (
            <AccordionItem
              key={index}
              index={index}
              isOpen={activeTab === index}
              onToggle={() => {
                const next = activeTab === index ? -1 : index;
                setActiveTab(next);
                if (next === index) {
                  analytics.track('technique_tab_viewed', { index }).catch(() => {});
                }
              }}
            >
              {child}
            </AccordionItem>
          ))}
        </div>
      )}

      <style jsx>{`
        .results-comparison-layout {
          width: 100%;
          min-height: 400px;
          position: relative;
        }

        .layout-mode-indicator {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 10;
        }

        .mode-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* Grid Layout Styles */
        .grid-layout {
          animation: fadeIn 0.3s ease-in-out;
        }

        /* Tabs Layout Styles */
        .tabs-layout {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
        }

        .tabs-header {
          display: flex;
          gap: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .tab-button {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tab-button:hover {
          color: #374151;
          background: #f9fafb;
        }

        .tab-button.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .tab-button:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        .tabs-content {
          padding: 1rem;
          animation: fadeIn 0.2s ease-in-out;
        }

        .tab-panel {
          width: 100%;
        }

        /* Accordion Layout Styles */
        .accordion-layout {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Breakpoints */
        @media (max-width: 767px) {
          .grid-layout {
            grid-template-columns: 1fr !important;
            padding: 1rem;
            gap: 1rem;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .grid-layout {
            grid-template-columns: repeat(2, 1fr) !important;
            padding: 1.25rem;
            gap: 1.25rem;
          }
        }

        @media (min-width: 1024px) {
          .grid-layout {
            padding: 1.5rem;
            gap: 1.5rem;
          }
        }

        /* Smooth transitions */
        .results-comparison-layout * {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Accordion Item Component
// ============================================================================

interface AccordionItemProps {
  children: React.ReactNode;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  children,
  index,
  isOpen,
  onToggle,
}) => {
  return (
    <div className="accordion-item">
      <button
        className="accordion-header"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${index}`}
        id={`accordion-header-${index}`}
      >
        <span className="accordion-title">Technique {index + 1}</span>
        <span className={`accordion-icon ${isOpen ? 'open' : ''}`}>
          {isOpen ? '▼' : '▶'}
        </span>
      </button>

      <div
        id={`accordion-content-${index}`}
        aria-labelledby={`accordion-header-${index}`}
        className={`accordion-content ${isOpen ? 'open' : ''}`}
      >
        {children}
      </div>

      <style jsx>{`
        .accordion-item {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          background: white;
        }

        .accordion-header {
          width: 100%;
          padding: 1rem;
          background: #f9fafb;
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 600;
          color: #374151;
          transition: background 0.2s ease;
        }

        .accordion-header:hover {
          background: #f3f4f6;
        }

        .accordion-header:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: -2px;
        }

        .accordion-title {
          font-size: 1rem;
        }

        .accordion-icon {
          font-size: 0.875rem;
          transition: transform 0.2s ease;
        }

        .accordion-icon.open {
          transform: rotate(0deg);
        }

        .accordion-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }

        .accordion-content.open {
          max-height: 5000px;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Export Default
// ============================================================================

export default ResultsComparisonLayout;

