import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db } from '../firebase';
import SEO from '../components/SEO';

import { FaSignOutAlt, FaUserCircle, FaShieldAlt, FaFileContract, FaChevronRight } from 'react-icons/fa';
import Loader from './Loader';

const AccountPage = () => {
    const navigate = useNavigate();
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.phoneNumber) {
                try {
                    const vendorQuery = query(ref(db, 'vendors'), orderByChild('phone'), equalTo(user.phoneNumber));
                    const snapshot = await get(vendorQuery);
                    if (snapshot.exists()) {
                        const vendorData = Object.values(snapshot.val())[0];
                        setVendor(vendorData);
                    } else {
                        navigate('/register');
                    }
                } catch (error) {
                    toast.error("Could not fetch profile.");
                } finally {
                    setLoading(false);
                }
            } else {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleSignOut = () => {
        signOut(auth).catch((error) => toast.error("Failed to sign out."));
    };

    if (loading) {
        return <Loader fullscreen />;
    }

    return (
        <>
            <SEO title="My Account - Trade2Cart Vendor" description="Manage your vendor profile, view policies, and sign out." />
            <div className="p-4">
                <div className="flex items-center space-x-4 mb-6">
                    {vendor?.profilePhotoURL ? (
                        <img src={vendor.profilePhotoURL} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" />
                    ) : (
                        <FaUserCircle className="text-6xl text-gray-400" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{vendor?.name}</h1>
                        <p className="text-sm text-gray-500">{vendor?.phone}</p>
                    </div>
                </div>

                <div className="bg-white p-2 sm:p-4 rounded-xl shadow-md space-y-2">
                    <button className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-4">
                            <FaShieldAlt className="text-xl text-green-500" />
                            <span>Privacy Policy</span>
                        </div>
                        <FaChevronRight className="text-gray-400" />
                    </button>
                    <button className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-4">
                            <FaFileContract className="text-xl text-blue-500" />
                            <span>Terms of Service</span>
                        </div>
                        <FaChevronRight className="text-gray-400" />
                    </button>
                </div>

                <div className="mt-6">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-lg font-bold shadow-lg hover:bg-red-700"
                    >
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default AccountPage;

