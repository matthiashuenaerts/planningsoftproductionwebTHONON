
import { supabase } from "./client";

interface StorageBucketResult {
  success: boolean;
  data?: any;
  error?: Error;
}

export const ensureStorageBucket = async (bucketName: string = 'project_files'): Promise<StorageBucketResult> => {
  try {
    console.log(`Ensuring storage bucket exists: ${bucketName}`);
    
    // First, try to check if the bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      console.error('Error checking for bucket:', listError);
      
      // Try to call the edge function as a fallback
      return await callStorageBucketFunction(bucketName);
    }
    
    // If the bucket doesn't exist, create it
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      // Try creating the bucket directly
      const { error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: true, // Make files publicly accessible
        });
        
      if (createError) {
        console.error('Error creating bucket directly:', createError);
        
        // If direct creation fails, try the edge function
        return await callStorageBucketFunction(bucketName);
      }
      
      console.log(`Storage bucket '${bucketName}' created successfully`);
    } else {
      console.log(`Storage bucket '${bucketName}' already exists`);
    }
    
    return {
      success: true,
      data: { bucketName, exists: bucketExists }
    };
  } catch (error) {
    console.error('Error in ensureStorageBucket:', error);
    
    // Try the edge function as a final fallback
    return await callStorageBucketFunction(bucketName);
  }
};

// Helper function to call the edge function for bucket creation
async function callStorageBucketFunction(bucketName: string): Promise<StorageBucketResult> {
  try {
    console.log("Attempting to create bucket via edge function...");
    
    const { data, error } = await supabase.functions.invoke('create-storage-bucket', {
      body: { bucketName }
    });
    
    if (error) {
      console.error("Edge function error:", error);
      return {
        success: false,
        error: new Error(`Edge function error: ${error.message || 'Unknown error'}`)
      };
    }
    
    console.log("Edge function response:", data);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Failed to call edge function:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to initialize storage via edge function')
    };
  }
}
