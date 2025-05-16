
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
  projects?: { name: string } | null;
  workstations?: { name: string } | null;
  employees?: { name: string } | null;
}

export const brokenPartsService = {
  // Upload image to Supabase storage
  async uploadImage(file: File, employeeId: string): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('broken_parts')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading file:', error);
        toast.error('Failed to upload image');
        return null;
      }
      
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
      
      return data || [];
    } catch (error) {
      console.error('Error in getAll:', error);
      toast.error('Failed to fetch broken parts');
      return [];
    }
  },
  
  // Get broken parts statistics
  async getStatistics(timeFilter?: string): Promise<any> {
    try {
      let query = supabase
        .from('broken_parts')
        .select(`
          *,
          projects:project_id (name),
          workstations:workstation_id (name), 
          employees:reported_by (name)
        `);
        
      if (timeFilter) {
        // Apply time filtering if needed
        // This would be implemented based on specific requirements
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching statistics:', error);
        toast.error('Failed to fetch statistics');
        return null;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getStatistics:', error);
      toast.error('Failed to fetch statistics');
      return null;
    }
  },
  
  // Get image URL from path
  getImageUrl(path: string | null): string | null {
    if (!path) return null;
    
    try {
      const { data } = supabase.storage.from('broken_parts').getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return null;
    }
  }
};
