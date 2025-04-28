
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { initializeDatabase } from '@/services/edgeFunctions';

const SeedDataButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSeedData = async () => {
    try {
      setLoading(true);
      const result = await initializeDatabase();
      
      toast({
        title: "Database Initialized",
        description: "Sample data has been created successfully.",
      });
      
      // Reload the page to show the new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Initialization Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSeedData} 
      disabled={loading}
      className="mt-4"
    >
      {loading ? "Initializing..." : "Initialize Database with Sample Data"}
    </Button>
  );
};

export default SeedDataButton;
