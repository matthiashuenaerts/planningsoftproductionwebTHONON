
import React from 'react';
import BrokenPartForm from '@/components/broken-parts/BrokenPartForm';

const NewBrokenPart: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Report Broken Part</h1>
      <BrokenPartForm />
    </div>
  );
};

export default NewBrokenPart;
