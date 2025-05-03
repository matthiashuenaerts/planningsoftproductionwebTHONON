
import { supabase } from "@/integrations/supabase/client";

export const initializeDatabase = async () => {
  try {
    // Make sure constraints are properly set up
    const { error: constraintError } = await supabase.rpc('check_and_fix_constraints');
    
    if (constraintError) {
      console.warn('Constraint check warning:', constraintError);
    }
    
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
