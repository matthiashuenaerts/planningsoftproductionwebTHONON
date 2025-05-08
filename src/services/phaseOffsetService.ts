
import { supabase } from "@/integrations/supabase/client";

export interface PhaseOffset {
  id: string;
  phase_id: string;
  phase_name: string;
  days_before_installation: number;
  created_at: string;
  updated_at: string;
}

export const initializePhaseOffsets = async () => {
  try {
    // Create the phase_offsets table if it doesn't exist
    const { data, error: setupError } = await supabase.rpc('setup_phase_offsets_table');
    
    if (setupError) {
      console.error("Error setting up phase_offsets table:", setupError);
      throw setupError;
    }
    
    return true;
  } catch (error) {
    console.error("Could not initialize phase offsets:", error);
    throw error;
  }
};

export const getPhaseOffsets = async (): Promise<PhaseOffset[]> => {
  try {
    const { data, error } = await supabase.rpc('get_phase_offsets');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching phase offsets:", error);
    throw error;
  }
};

export const addPhaseOffset = async (
  phaseId: string, 
  daysBeforeInstallation: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('phase_offsets')
      .insert({
        phase_id: phaseId,
        days_before_installation: daysBeforeInstallation
      });
    
    if (error) throw error;
  } catch (error) {
    console.error("Error adding phase offset:", error);
    throw error;
  }
};

export const updatePhaseOffset = async (
  id: string,
  daysBeforeInstallation: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('phase_offsets')
      .update({
        days_before_installation: daysBeforeInstallation,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error updating phase offset:", error);
    throw error;
  }
};

export const deletePhaseOffset = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('phase_offsets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting phase offset:", error);
    throw error;
  }
};
