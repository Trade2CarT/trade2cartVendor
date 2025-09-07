import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaThLarge, FaUserAlt } from 'react-icons/fa';

const Footer = () => {
    const activeLinkStyle = {
        color: '#2563EB', // blue-600
    };

    return (
        <footer className="sticky bottom-0 bg-white rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-40">
            <nav className="flex justify-around items-center p-2">
                <NavLink
                    to="/dashboard"
                    className="flex flex-col items-center text-gray-500 p-2 no-underline hover:text-blue-600"
                    style={({ isActive }) => isActive ? activeLinkStyle : undefined}
                >
                    <FaThLarge className="text-2xl" />
                    <span className="text-xs font-medium">Dashboard</span>
                </NavLink>
                <NavLink
                    to="/account"
                    className="flex flex-col items-center text-gray-500 p-2 no-underline hover:text-blue-600"
                    style={({ isActive }) => isActive ? activeLinkStyle : undefined}
                >
                    <FaUserAlt className="text-2xl" />
                    <span className="text-xs font-medium">Account</span>
                </NavLink>
            </nav>
        </footer>
    );
};

export default Footer;
