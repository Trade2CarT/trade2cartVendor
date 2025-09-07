import React from 'react';
import { Link } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import logo from '../assets/images/logo.PNG';

const Header = ({ handleSignOut }) => {
    return (
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
            <Link to="/dashboard">
                <img src={logo} alt="Trade2Cart Logo" className="h-10" />
            </Link>
            <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
            >
                <FaSignOutAlt />
                <span>Sign Out</span>
            </button>
        </header>
    );
};

export default Header;