
import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};

export default Loading;
