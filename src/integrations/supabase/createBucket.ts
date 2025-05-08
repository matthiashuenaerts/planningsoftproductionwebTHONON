
import { supabase } from './client';

// Function to ensure the project_files bucket exists and has proper permissions
export const ensureStorageBucket = async () => {
  try {
    console.log("Ensuring storage bucket exists and has proper permissions...");
    
    // Call our edge function to create the bucket if it doesn't exist and set up policies
    const { data, error } = await supabase.functions.invoke('create-storage-bucket');
    
    if (error) {
      console.error('Error ensuring storage bucket exists:', error);
      return { success: false, error };
    }
    
    console.log("Storage bucket response:", data);
    return { success: true, data };
  } catch (err) {
    console.error('Error in ensureStorageBucket function:', err);
    return { success: false, error: err };
  }
};
