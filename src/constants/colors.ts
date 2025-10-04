/**
 * Color constants for the RAG Showcase App
 * 
 * Based on the UI design references and following the design system
 * established in the PRD Section 2.4
 */

export const COLORS = {
  // Primary colors from UI design references
  primary: '#1173d4', // Primary blue from design system
  primaryLight: '#4a9eff',
  primaryDark: '#0d5aa3',
  
  // Secondary colors
  secondary: '#6c757d',
  secondaryLight: '#adb5bd',
  secondaryDark: '#495057',
  
  // Semantic colors for metrics and states
  success: '#28a745',
  successLight: '#d4edda',
  warning: '#ffc107',
  warningLight: '#fff3cd',
  error: '#dc3545',
  errorLight: '#f8d7da',
  info: '#17a2b8',
  infoLight: '#d1ecf1',
  
  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  gray: '#6c757d',
  grayLight: '#f8f9fa',
  grayMedium: '#e9ecef',
  grayDark: '#343a40',
  
  // Background colors
  background: '#ffffff',
  backgroundSecondary: '#f8f9fa',
  backgroundTertiary: '#e9ecef',
  
  // Text colors
  textPrimary: '#212529',
  textSecondary: '#6c757d',
  textMuted: '#adb5bd',
  textWhite: '#ffffff',
  
  // Border colors
  border: '#dee2e6',
  borderLight: '#e9ecef',
  borderDark: '#adb5bd',
  
  // RAG technique specific colors (for visual distinction)
  techniqueHybrid: '#1173d4',
  techniqueRerank: '#28a745',
  techniqueContextual: '#ffc107',
  techniqueAgentic: '#dc3545',
  techniqueChunking: '#6f42c1',
  
  // Chart and visualization colors
  chart1: '#1173d4',
  chart2: '#28a745',
  chart3: '#ffc107',
  chart4: '#dc3545',
  chart5: '#6f42c1',
  chart6: '#17a2b8',
  chart7: '#fd7e14',
  chart8: '#20c997',
} as const;

export type ColorKey = keyof typeof COLORS;
