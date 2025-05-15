
import React from 'react';
import BrokenPartsList from '@/components/broken-parts/BrokenPartsList';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

const BrokenParts: React.FC = () => {
  const { currentEmployee } = useAuth();
  
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 h-full">
        <Navbar />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">Broken Parts</h1>
          <BrokenPartsList />
        </div>
      </div>
    </div>
  );
};

export default BrokenParts;
