
import { supabase } from "./client";

export const ensureStorageBucket = async (bucketName: string): Promise<void> => {
  try {
    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      console.error('Error checking for bucket:', listError);
      return;
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
        return;
      }
      
      console.log(`Storage bucket '${bucketName}' created successfully`);
    }
  } catch (error) {
    console.error('Error in ensureStorageBucket:', error);
  }
};
