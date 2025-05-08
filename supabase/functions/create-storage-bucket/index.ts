
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
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        
      if (error) {
        throw error;
      }
      
      console.log("Created storage bucket 'project_files'");
      
      // Setup public access policy
      const { error: policyError } = await supabase
        .rpc('create_storage_policy', {
          bucket_name: 'project_files',
          policy_name: 'Public Access',
          definition: `(auth.role() = 'authenticated'::text)`
        });
        
      if (policyError) {
        console.error("Error creating policy:", policyError);
        // Don't throw here, as the bucket itself was created
      }
    }
    
    return new Response(
      JSON.stringify({ 
        message: bucketExists ? "Bucket already exists" : "Bucket created successfully" 
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
