/**
 * Supabase Client Configuration
 * 
 * Sets up the Supabase client with proper configuration for React Native
 * Based on PRD Section 3.3 - Backend: Supabase Implementation
 */

import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Environment variables - these should be set in your .env file
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types (these should match your Supabase schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      domains: {
        Row: {
          id: number;
          name: string;
          description?: string;
          source_type: 'preloaded' | 'uploaded';
          document_count: number;
          created_at: string;
          updated_at: string;
          user_id?: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string;
          source_type: 'preloaded' | 'uploaded';
          document_count?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string;
          source_type?: 'preloaded' | 'uploaded';
          document_count?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      rag_sessions: {
        Row: {
          id: string;
          user_id?: string;
          domain_id: number;
          query_text: string;
          results: any; // JSON field containing RAGResult[]
          created_at: string;
          updated_at: string;
          session_name?: string;
          is_favorite?: boolean;
        };
        Insert: {
          id?: string;
          user_id?: string;
          domain_id: number;
          query_text: string;
          results: any;
          created_at?: string;
          updated_at?: string;
          session_name?: string;
          is_favorite?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          domain_id?: number;
          query_text?: string;
          results?: any;
          created_at?: string;
          updated_at?: string;
          session_name?: string;
          is_favorite?: boolean;
        };
      };
      documents: {
        Row: {
          id: string;
          domain_id: number;
          filename: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          processing_status: 'pending' | 'processing' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
          user_id?: string;
        };
        Insert: {
          id?: string;
          domain_id: number;
          filename: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          id?: string;
          domain_id?: number;
          filename?: string;
          file_path?: string;
          file_size?: number;
          mime_type?: string;
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Export typed Supabase client
export type TypedSupabaseClient = typeof supabase;
