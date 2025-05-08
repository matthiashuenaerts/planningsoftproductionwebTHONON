
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
      const { error } = await supabase
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
    
    // Create direct SQL statements to set policies
    // This approach avoids the need for a custom function
    
    // CREATE OR REPLACE POLICY for SELECT
    const { error: selectPolicyError } = await supabase.rpc('stored_procedure', {
      name: `
        CREATE POLICY IF NOT EXISTS "Everyone can view project files" 
        ON storage.objects
        FOR SELECT 
        USING (bucket_id = 'project_files');
        
        -- If policy already exists, drop and recreate it
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' 
            AND tablename = 'objects' 
            AND policyname = 'Everyone can view project files'
          ) THEN
            DROP POLICY "Everyone can view project files" ON storage.objects;
            
            CREATE POLICY "Everyone can view project files" 
            ON storage.objects
            FOR SELECT 
            USING (bucket_id = 'project_files');
          END IF;
        END$$;
      `
    });
    
    if (selectPolicyError) {
      console.error("Error creating/updating SELECT policy:", selectPolicyError);
    } else {
      console.log("SELECT policy created/updated successfully");
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
            AND policyname = 'Everyone can upload project files'
          ) THEN
            DROP POLICY "Everyone can upload project files" ON storage.objects;
          END IF;
          
          CREATE POLICY "Everyone can upload project files" 
          ON storage.objects
          FOR INSERT 
          WITH CHECK (bucket_id = 'project_files');
        END$$;
      `
    });
    
    if (insertPolicyError) {
      console.error("Error creating/updating INSERT policy:", insertPolicyError);
    } else {
      console.log("INSERT policy created/updated successfully");
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
            AND policyname = 'Everyone can update project files'
          ) THEN
            DROP POLICY "Everyone can update project files" ON storage.objects;
          END IF;
          
          CREATE POLICY "Everyone can update project files" 
          ON storage.objects
          FOR UPDATE 
          USING (bucket_id = 'project_files');
        END$$;
      `
    });
    
    if (updatePolicyError) {
      console.error("Error creating/updating UPDATE policy:", updatePolicyError);
    } else {
      console.log("UPDATE policy created/updated successfully");
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
            AND policyname = 'Everyone can delete project files'
          ) THEN
            DROP POLICY "Everyone can delete project files" ON storage.objects;
          END IF;
          
          CREATE POLICY "Everyone can delete project files" 
          ON storage.objects
          FOR DELETE 
          USING (bucket_id = 'project_files');
        END$$;
      `
    });
    
    if (deletePolicyError) {
      console.error("Error creating/updating DELETE policy:", deletePolicyError);
    } else {
      console.log("DELETE policy created/updated successfully");
    }
    
    // Return success message
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
