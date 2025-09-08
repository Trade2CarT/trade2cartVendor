import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db } from '../firebase';
import SEO from '../components/SEO';
import Loader from './Loader';
import PolicyModal from '../components/PolicyModal';
import { TermsAndConditions, PrivacyPolicy } from '../components/Agreement';
import {
    FaSignOutAlt,
    FaUserCircle,
    FaShieldAlt,
    FaFileContract,
    FaChevronRight,
    FaChevronDown,
    FaUser,
    FaMapPin,
    FaMapMarkerAlt,
    FaIdCard
} from 'react-icons/fa';

const InfoCard = ({ icon, label, value }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-gray-400 mt-1 text-lg">{icon}</div>
        <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-base text-gray-800 font-semibold break-words">{value || 'Not Provided'}</p>
        </div>
    </div>
);

const AccountPage = () => {
    const navigate = useNavigate();
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalContent, setModalContent] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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
                    console.error("Firebase fetch error:", error);
                    toast.error("Could not fetch profile. Check console for details.");
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
            <div className="p-4 space-y-6">

                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                    >
                        <div className="flex items-center space-x-4">
                            {vendor?.profilePhotoURL ? (
                                <img src={vendor.profilePhotoURL} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <FaUserCircle className="text-6xl text-gray-300" />
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">{vendor?.name || "Vendor Profile"}</h1>
                                <p className="text-sm text-gray-500">{vendor?.phone}</p>
                            </div>
                        </div>
                        <FaChevronDown className={`text-gray-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className={`transition-all duration-500 ease-in-out ${isProfileOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 border-t border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <InfoCard icon={<FaUser />} label="Full Name" value={vendor?.name} />
                                <InfoCard icon={<FaMapPin />} label="Registered Location" value={vendor?.location} />
                                <InfoCard icon={<FaMapMarkerAlt />} label="Full Address" value={vendor?.address} />
                                <InfoCard icon={<FaIdCard />} label="PAN Number" value={vendor?.pan} />
                                <InfoCard icon={<FaIdCard />} label="Aadhaar Number" value={vendor?.aadhaar} />
                                <InfoCard icon={<FaIdCard />} label="Driving License" value={vendor?.license} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-2 sm:p-4 rounded-xl shadow-md space-y-2">
                    <button
                        onClick={() => setModalContent('privacy')}
                        className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <FaShieldAlt className="text-xl text-green-500" />
                            <span>Privacy Policy</span>
                        </div>
                        <FaChevronRight className="text-gray-400" />
                    </button>
                    <button
                        onClick={() => setModalContent('terms')}
                        className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                    >
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
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-lg font-bold shadow-lg hover:bg-red-700 transition-colors"
                    >
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </div>

            <PolicyModal isOpen={!!modalContent} onClose={() => setModalContent(null)}>
                {modalContent === 'terms' && <TermsAndConditions />}
                {modalContent === 'privacy' && <PrivacyPolicy />}
            </PolicyModal>
        </>
    );
};

export default AccountPage;