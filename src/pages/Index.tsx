
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';
import { useAuth } from '@/context/AuthContext';
import { seedInitialData } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

const Index: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize data on first load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Seed initial data if needed
        await seedInitialData();
        setIsInitialized(true);
      } catch (error: any) {
        console.error("Error initializing app:", error);
        toast({
          title: "Initialization Error",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    initializeApp();
  }, [toast]);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar fixed top-0 bottom-0">
        <Navbar />
      </div>
      <div className="ml-64 w-full p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          {isInitialized ? (
            <Dashboard />
          ) : (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
