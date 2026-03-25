import React from 'react';

const Loader = ({ fullscreen = false }) => {
  // A universal, modern skeleton UI that looks good on any page
  const SkeletonUI = () => (
    <div className="w-full max-w-sm mx-auto p-6 animate-pulse flex flex-col items-center justify-center space-y-6">
      {/* Pulsing Avatar/Logo Placeholder */}
      <div className="w-24 h-24 bg-gray-200 rounded-full shadow-sm"></div>

      {/* Text Placeholders */}
      <div className="w-3/4 h-6 bg-gray-200 rounded-lg mt-4"></div>
      <div className="w-1/2 h-4 bg-gray-200 rounded-lg"></div>

      {/* Input/Button Placeholders */}
      <div className="w-full h-14 bg-gray-200 rounded-2xl mt-8"></div>
      <div className="w-full h-14 bg-gray-200 rounded-2xl"></div>
      <div className="w-full h-14 bg-gray-200 rounded-2xl"></div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-white z-50 backdrop-blur-sm">
        <SkeletonUI />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center items-center py-8">
      <SkeletonUI />
    </div>
  );
};

export default Loader;