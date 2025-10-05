import { supabase } from './supabase';

/**
 * Generate a time-limited signed URL for a private object in Supabase Storage.
 * Defaults to the 'pdfs' bucket per PRD and infrastructure tasks.
 */
export async function createSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600,
  bucket: string = 'pdfs'
): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown error'}`);
  }

  return data.signedUrl;
}

/**
 * Convenience helper for PDFs in the default 'pdfs' bucket.
 */
export async function getSignedPdfUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
  return createSignedUrl(filePath, expiresInSeconds, 'pdfs');
}


