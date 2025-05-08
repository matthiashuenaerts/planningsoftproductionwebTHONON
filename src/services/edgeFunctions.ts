
import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "@/integrations/supabase/createBucket";

export const initializeDatabase = async () => {
  try {
    // Call the init-database edge function
    const { data, error } = await supabase.functions.invoke('init-database');
    
    if (error) {
      throw error;
    }
    
    // Also ensure storage bucket exists with proper permissions
    const storageResult = await ensureStorageBucket();
    if (!storageResult.success) {
      console.warn("Warning: Could not initialize storage bucket:", storageResult.error);
    }
    
    return data;
  } catch (error: any) {
    console.error('Error initializing database:', error);
    throw new Error(`Failed to initialize database: ${error.message}`);
  }
};
