
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BrokenPart {
  id?: string;
  project_id: string | null;
  workstation_id: string | null;
  description: string;
  image_path?: string | null;
  reported_by: string;
  created_at?: string;
  updated_at?: string;
}

export const brokenPartsService = {
  // Upload image to Supabase storage
  async uploadImage(file: File, employeeId: string): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}_${Date.now()}.${fileExt}`;
      console.log(`Uploading file ${fileName} to broken_parts bucket`);
      
      // Check if bucket exists before upload
      const { data: buckets, error: bucketError } = await supabase
        .storage
        .listBuckets();
        
      if (bucketError) {
        console.error('Error checking buckets:', bucketError);
        return null;
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === 'broken_parts');
      if (!bucketExists) {
        console.error('Bucket broken_parts does not exist');
        toast.error('Storage configuration error');
        return null;
      }
      
      const { data, error } = await supabase.storage
        .from('broken_parts')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading file:', error);
        toast.error('Failed to upload image');
        return null;
      }
      
      console.log('File uploaded successfully:', data.path);
      return data.path;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      toast.error('Failed to upload image');
      return null;
    }
  },
  
  // Create a new broken part report
  async create(brokenPart: BrokenPart): Promise<BrokenPart | null> {
    try {
      console.log('Creating broken part record:', brokenPart);
      
      const { data, error } = await supabase
        .from('broken_parts')
        .insert([brokenPart])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating broken part record:', error);
        toast.error('Failed to save broken part information');
        return null;
      }
      
      console.log('Broken part created successfully:', data);
      toast.success('Broken part reported successfully');
      return data as BrokenPart;
    } catch (error) {
      console.error('Error in create:', error);
      toast.error('Failed to save broken part information');
      return null;
    }
  },
  
  // Get all broken parts
  async getAll(): Promise<BrokenPart[]> {
    try {
      console.log('Fetching all broken parts');
      
      const { data, error } = await supabase
        .from('broken_parts')
        .select(`
          *,
          projects:project_id (name),
          workstations:workstation_id (name),
          employees:reported_by (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching broken parts:', error);
        toast.error('Failed to fetch broken parts');
        return [];
      }
      
      console.log('Broken parts fetched successfully:', data);
      return data || [];
    } catch (error) {
      console.error('Error in getAll:', error);
      toast.error('Failed to fetch broken parts');
      return [];
    }
  }
};
