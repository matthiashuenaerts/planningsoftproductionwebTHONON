
import { supabase } from './client';

// Function to ensure the project_files bucket exists and has proper permissions
export const ensureStorageBucket = async () => {
  try {
    // Call our edge function to create the bucket if it doesn't exist
    const { data, error } = await supabase.functions.invoke('create-storage-bucket');
    
    if (error) {
      console.error('Error ensuring storage bucket exists:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Error in ensureStorageBucket function:', err);
    return { success: false, error: err };
  }
};
