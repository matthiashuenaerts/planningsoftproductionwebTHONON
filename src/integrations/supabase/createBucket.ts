
import { supabase } from "./client";

interface StorageBucketResult {
  success: boolean;
  data?: any;
  error?: Error;
}

export const ensureStorageBucket = async (bucketName: string = 'project_files'): Promise<StorageBucketResult> => {
  try {
    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      console.error('Error checking for bucket:', listError);
      return {
        success: false,
        error: listError
      };
    }
    
    // If the bucket doesn't exist, create it
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: true, // Make files publicly accessible
        });
        
      if (createError) {
        console.error('Error creating bucket:', createError);
        return {
          success: false,
          error: createError
        };
      }
      
      console.log(`Storage bucket '${bucketName}' created successfully`);
    }
    
    return {
      success: true,
      data: { bucketName, exists: bucketExists }
    };
  } catch (error) {
    console.error('Error in ensureStorageBucket:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error initializing storage')
    };
  }
};
