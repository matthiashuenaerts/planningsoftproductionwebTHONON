
import React from 'react';
import BrokenPartsList from '@/components/broken-parts/BrokenPartsList';

const BrokenParts: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Broken Parts</h1>
      <BrokenPartsList />
    </div>
  );
};

export default BrokenParts;
