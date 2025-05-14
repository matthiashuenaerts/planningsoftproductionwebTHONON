
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Get environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Check if the buckets exist first
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      throw listError;
    }
    
    // Define the buckets we need to ensure
    const requiredBuckets = ['project_files', 'attachments'];
    const results = [];
    
    // Check each required bucket
    for (const bucketName of requiredBuckets) {
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        // Create the bucket
        const { error } = await supabase
          .storage
          .createBucket(bucketName, {
            public: true, // Make bucket public
            fileSizeLimit: 52428800, // 50MB
          });
          
        if (error) {
          console.error(`Error creating bucket ${bucketName}:`, error);
          results.push({ bucket: bucketName, status: 'error', message: error.message });
          continue;
        }
        
        console.log(`Created storage bucket '${bucketName}'`);
        results.push({ bucket: bucketName, status: 'created' });
      } else {
        results.push({ bucket: bucketName, status: 'exists' });
      }
      
      // Set up policies for this bucket
      await setupBucketPolicies(supabase, bucketName);
    }
    
    // Return success message
    return new Response(
      JSON.stringify({ 
        message: "Storage buckets have been configured", 
        results 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in bucket creation:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});

async function setupBucketPolicies(supabase, bucketName) {
  // CREATE OR REPLACE POLICY for SELECT
  const { error: selectPolicyError } = await supabase.rpc('stored_procedure', {
    name: `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Everyone can view ${bucketName} files'
        ) THEN
          DROP POLICY "Everyone can view ${bucketName} files" ON storage.objects;
        END IF;
        
        CREATE POLICY "Everyone can view ${bucketName} files" 
        ON storage.objects
        FOR SELECT 
        USING (bucket_id = '${bucketName}');
      END$$;
    `
  });
  
  if (selectPolicyError) {
    console.error(`Error creating/updating SELECT policy for ${bucketName}:`, selectPolicyError);
  } else {
    console.log(`SELECT policy for ${bucketName} created/updated successfully`);
  }
  
  // CREATE OR REPLACE POLICY for INSERT
  const { error: insertPolicyError } = await supabase.rpc('stored_procedure', {
    name: `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Everyone can upload ${bucketName} files'
        ) THEN
          DROP POLICY "Everyone can upload ${bucketName} files" ON storage.objects;
        END IF;
        
        CREATE POLICY "Everyone can upload ${bucketName} files" 
        ON storage.objects
        FOR INSERT 
        WITH CHECK (bucket_id = '${bucketName}');
      END$$;
    `
  });
  
  if (insertPolicyError) {
    console.error(`Error creating/updating INSERT policy for ${bucketName}:`, insertPolicyError);
  } else {
    console.log(`INSERT policy for ${bucketName} created/updated successfully`);
  }
  
  // CREATE OR REPLACE POLICY for UPDATE
  const { error: updatePolicyError } = await supabase.rpc('stored_procedure', {
    name: `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Everyone can update ${bucketName} files'
        ) THEN
          DROP POLICY "Everyone can update ${bucketName} files" ON storage.objects;
        END IF;
        
        CREATE POLICY "Everyone can update ${bucketName} files" 
        ON storage.objects
        FOR UPDATE 
        USING (bucket_id = '${bucketName}');
      END$$;
    `
  });
  
  if (updatePolicyError) {
    console.error(`Error creating/updating UPDATE policy for ${bucketName}:`, updatePolicyError);
  } else {
    console.log(`UPDATE policy for ${bucketName} created/updated successfully`);
  }
  
  // CREATE OR REPLACE POLICY for DELETE
  const { error: deletePolicyError } = await supabase.rpc('stored_procedure', {
    name: `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Everyone can delete ${bucketName} files'
        ) THEN
          DROP POLICY "Everyone can delete ${bucketName} files" ON storage.objects;
        END IF;
        
        CREATE POLICY "Everyone can delete ${bucketName} files" 
        ON storage.objects
        FOR DELETE 
        USING (bucket_id = '${bucketName}');
      END$$;
    `
  });
  
  if (deletePolicyError) {
    console.error(`Error creating/updating DELETE policy for ${bucketName}:`, deletePolicyError);
  } else {
    console.log(`DELETE policy for ${bucketName} created/updated successfully`);
  }
}
