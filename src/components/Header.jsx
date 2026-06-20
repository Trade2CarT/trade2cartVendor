import React from 'react';
import { Link } from 'react-router-dom';
import { useVendor } from '../App';
import logo from '/src/assets/images/logo.PNG';
import { FaUserCircle, FaDownload } from 'react-icons/fa';

const Header = () => {
    const { vendor, installPrompt } = useVendor();

    const handleInstallClick = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
    };

    // Safely grab the photo whether it was saved as profilePhotoURL or profilePhoto
    const photoURL = vendor?.profilePhotoURL || vendor?.profilePhoto;

    return (
        <header className="sticky top-0 bg-white shadow-sm p-4 flex justify-between items-center z-40">
            <Link to="/dashboard">
                <img src={logo} alt="Trade2Cart Logo" className="h-8 w-auto" />
            </Link>

            <div className="flex items-center gap-4">
                {installPrompt && (
                    <button
                        onClick={handleInstallClick}
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-700"
                        title="Install Trade2Cart Vendor App"
                    >
                        <FaDownload />
                        <span className="hidden sm:block">Install</span>
                    </button>
                )}

                <Link to="/account">
                    {photoURL ? (
                        <img src={photoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                    ) : (
                        <FaUserCircle className="w-10 h-10 text-gray-300" />
                    )}
                </Link>
            </div>
        </header>
    );
};

export default Header;