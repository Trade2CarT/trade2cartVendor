import React from 'react';
import { Link } from 'react-router-dom';
import { useVendor } from '../App'; // Import the useVendor hook
import logo from '/src/assets/images/logo.PNG';
import { FaUserCircle, FaDownload } from 'react-icons/fa'; // <-- 1. Add FaDownload

const Header = () => {
    // --- 2. Destructure vendor and installPrompt from the context ---
    const { vendor, installPrompt } = useVendor(); // Get vendor data and prompt from the context

    // --- 3. Add the install click handler ---
    const handleInstallClick = async () => {
        if (!installPrompt) {
            // If the prompt isn't available, do nothing
            return;
        }
        // Show the browser's install prompt
        installPrompt.prompt();

        // Log the result (optional)
        const { outcome } = await installPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
    };

    return (
        <header className="sticky top-0 bg-white shadow-sm p-4 flex justify-between items-center z-40">
            <Link to="/dashboard">
                <img src={logo} alt="Trade2Cart Logo" className="h-8 w-auto" />
            </Link>

            {/* --- 4. Add a wrapper div for right-side icons --- */}
            <div className="flex items-center gap-4">

                {/* 5. The new Install Button (conditional) */}
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

                {/* 6. Your existing profile link */}
                <Link to="/account">
                    {vendor?.profilePhotoURL ? (
                        <img src={vendor.profilePhotoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                    ) : (
                        <FaUserCircle className="w-10 h-10 text-gray-300" />
                    )}
                </Link>
            </div>
        </header>
    );
};

export default Header;