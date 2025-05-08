
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
    // Check if the bucket exists first
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      throw listError;
    }
    
    // Check if our bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === 'project_files');
    
    if (!bucketExists) {
      // Create the bucket
      const { data, error } = await supabase
        .storage
        .createBucket('project_files', {
          public: true, // Make bucket public
          fileSizeLimit: 52428800, // 50MB
        });
        
      if (error) {
        throw error;
      }
      
      console.log("Created storage bucket 'project_files'");
    }
    
    // After ensuring the bucket exists, create or update the storage policies regardless
    // This ensures policies are set even if the bucket already existed
    
    // 1. Create policy for authenticated users to upload files
    const { error: uploadPolicyError } = await supabase
      .rpc('create_storage_policy', {
        bucket_name: 'project_files',
        policy_name: 'Allow authenticated uploads',
        definition: `(bucket_id = 'project_files'::text AND (auth.role() = 'authenticated'::text OR auth.role() = 'anon'::text))`,
        operation: 'INSERT'
      });
    
    if (uploadPolicyError) {
      console.error("Error creating upload policy:", uploadPolicyError);
    } else {
      console.log("Created upload policy for project_files bucket");
    }
    
    // 2. Create policy for authenticated users to select files
    const { error: selectPolicyError } = await supabase
      .rpc('create_storage_policy', {
        bucket_name: 'project_files',
        policy_name: 'Allow authenticated downloads',
        definition: `(bucket_id = 'project_files'::text AND (auth.role() = 'authenticated'::text OR auth.role() = 'anon'::text))`,
        operation: 'SELECT'
      });
    
    if (selectPolicyError) {
      console.error("Error creating select policy:", selectPolicyError);
    } else {
      console.log("Created select policy for project_files bucket");
    }
    
    // 3. Create policy for authenticated users to update files
    const { error: updatePolicyError } = await supabase
      .rpc('create_storage_policy', {
        bucket_name: 'project_files',
        policy_name: 'Allow authenticated updates',
        definition: `(bucket_id = 'project_files'::text AND (auth.role() = 'authenticated'::text OR auth.role() = 'anon'::text))`,
        operation: 'UPDATE'
      });
    
    if (updatePolicyError) {
      console.error("Error creating update policy:", updatePolicyError);
    } else {
      console.log("Created update policy for project_files bucket");
    }
    
    // 4. Create policy for authenticated users to delete files
    const { error: deletePolicyError } = await supabase
      .rpc('create_storage_policy', {
        bucket_name: 'project_files',
        policy_name: 'Allow authenticated deletes',
        definition: `(bucket_id = 'project_files'::text AND (auth.role() = 'authenticated'::text OR auth.role() = 'anon'::text))`,
        operation: 'DELETE'
      });
    
    if (deletePolicyError) {
      console.error("Error creating delete policy:", deletePolicyError);
    } else {
      console.log("Created delete policy for project_files bucket");
    }
    
    return new Response(
      JSON.stringify({ 
        message: bucketExists ? "Bucket already exists, policies updated" : "Bucket created successfully with proper policies" 
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
