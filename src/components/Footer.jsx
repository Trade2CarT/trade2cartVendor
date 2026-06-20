import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBoxOpen, FaRupeeSign, FaUser } from 'react-icons/fa';

const BottomNav = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50 pb-safe">
            <div className="flex justify-around items-center h-16">
                <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    <FaHome size={20} />
                    <span className="text-[10px] mt-1 font-semibold">Home</span>
                </NavLink>
                {/* Add other links like /orders, /earnings, /account similarly */}
                <NavLink to="/account" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    <FaUser size={20} />
                    <span className="text-[10px] mt-1 font-semibold">Profile</span>
                </NavLink>
            </div>
        </div>
    );
};

export default BottomNav;