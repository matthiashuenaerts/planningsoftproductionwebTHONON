
import { supabase } from './client';

// Function to ensure the project_files bucket exists and has proper permissions
export const ensureStorageBucket = async () => {
  try {
    console.log("Checking if storage buckets are ready...");
    
    // Check if the attachments bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return { success: false, error: bucketsError };
    }
    
    // Check if our buckets exist
    const attachmentsBucketExists = buckets.some(bucket => bucket.name === 'attachments');
    const projectFilesBucketExists = buckets.some(bucket => bucket.name === 'project_files');
    
    if (attachmentsBucketExists && projectFilesBucketExists) {
      console.log("All required storage buckets exist");
      return { success: true, data: { message: "All required buckets exist" } };
    }
    
    // If any bucket doesn't exist, we'll use the edge function to create them
    console.log("One or more required buckets don't exist, creating them...");
    const { data, error } = await supabase.functions.invoke('create-storage-bucket');
    
    if (error) {
      console.error('Error ensuring storage buckets exist:', error);
      return { success: false, error };
    }
    
    console.log("Storage bucket response:", data);
    return { success: true, data };
  } catch (err) {
    console.error('Error in ensureStorageBucket function:', err);
    return { success: false, error: err };
  }
};
