
import { supabase } from "@/integrations/supabase/client";

export const initializeDatabase = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('init-database');
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Error initializing database:', error);
    throw new Error(`Failed to initialize database: ${error.message}`);
  }
};
