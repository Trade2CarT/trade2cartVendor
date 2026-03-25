import React from 'react';
import logo from '../assets/images/logo.PNG'; // Pulls your Trade2Cart logo

const Loader = ({ fullscreen = false }) => {
  const PremiumLoader = () => (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Background soft ring */}
        <div className="absolute w-28 h-28 border-4 border-blue-100 rounded-full"></div>

        {/* Smooth spinning accent ring */}
        <div className="absolute w-28 h-28 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>

        {/* Central breathing logo card */}
        <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center z-10 animate-pulse">
          <img src={logo} alt="Loading" className="w-12 h-12 object-contain drop-shadow-sm" />
        </div>
      </div>
      {/* Pulsing subtle text */}
      <p className="mt-6 text-blue-600 font-extrabold tracking-widest text-sm uppercase animate-pulse">
        Please Wait
      </p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-white/90 z-50 backdrop-blur-md">
        <PremiumLoader />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-center items-center py-8">
      <PremiumLoader />
    </div>
  );
};

export default Loader;