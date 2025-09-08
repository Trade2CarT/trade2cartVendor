import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaThLarge, FaUserAlt } from 'react-icons/fa';

const Footer = () => {
    const commonClasses = "flex flex-col items-center justify-center gap-1 w-full h-16 text-gray-500 transition-colors duration-200";
    const activeClasses = "text-blue-600 font-bold";

    return (
        <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-40">
            <nav className="flex justify-around items-center">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) => `${commonClasses} ${isActive ? activeClasses : ''}`}
                >
                    <FaThLarge className="text-xl" />
                    <span className="text-xs font-medium tracking-wide">Dashboard</span>
                </NavLink>
                <NavLink
                    to="/account"
                    className={({ isActive }) => `${commonClasses} ${isActive ? activeClasses : ''}`}
                >
                    <FaUserAlt className="text-xl" />
                    <span className="text-xs font-medium tracking-wide">Account</span>
                </NavLink>
            </nav>
        </footer>
    );
};

export default Footer;