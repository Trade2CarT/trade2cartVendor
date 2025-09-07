import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white py-4 mt-auto">
            <div className="container mx-auto text-center">
                <p>&copy; {new Date().getFullYear()} Trade2Cart. All Rights Reserved.</p>
                <div className="mt-2">
                    <a href="/privacy-policy" className="text-gray-400 hover:text-white mx-2">Privacy Policy</a>
                    <span className="text-gray-400">|</span>
                    <a href="/terms-of-service" className="text-gray-400 hover:text-white mx-2">Terms of Service</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;