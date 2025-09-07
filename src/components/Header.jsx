import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.PNG';
import { FaUserCircle } from 'react-icons/fa';

const Header = ({ vendor }) => {
    return (
        <header className="sticky top-0 bg-white shadow-sm p-4 flex justify-between items-center z-40">
            <Link to="/dashboard">
                <img src={logo} alt="Trade2Cart Logo" className="h-8 w-auto" />
            </Link>
            <Link to="/account">
                {vendor?.profilePhotoURL ? (
                    <img src={vendor.profilePhotoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                    <FaUserCircle className="w-10 h-10 text-gray-400" />
                )}
            </Link>
        </header>
    );
};

export default Header;

