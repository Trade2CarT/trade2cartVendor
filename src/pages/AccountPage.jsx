import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, query, orderByChild, equalTo, push } from 'firebase/database';
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
    FaIdCard,
    FaQuestionCircle,
    FaPaperPlane
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

const faqs = [
    {
        q: 'How do I get new orders?',
        a: 'New orders are assigned to you by our admin team based on your location and availability. Keep an eye on the "Assigned Orders" tab on your dashboard.'
    },
    {
        q: 'When will I receive payment for orders?',
        a: 'You are responsible for collecting payment directly from the customer at the time of pickup. Trade2Cart does not handle transactions between you and the customer.'
    },
    {
        q: 'What if the customer provides an incorrect OTP?',
        a: 'Please double-check the OTP with the customer from their app. If it still fails, you can contact our support team for assistance.'
    },
    {
        q: 'How are the scrap prices determined?',
        a: 'You can view the current trade prices for your registered location by tapping the "Today\'s Trade Price" button on your dashboard.'
    }
];

const AccountPage = () => {
    const navigate = useNavigate();
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalContent, setModalContent] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const [queryText, setQueryText] = useState('');
    const [submittingQuery, setSubmittingQuery] = useState(false);

    const handleSubmitQuery = async () => {
        if (queryText.trim().length < 5) return toast.error('Please describe your query.');
        setSubmittingQuery(true);
        try {
            await push(ref(db, 'queries'), {
                vendorId: vendor?.uid || auth.currentUser?.uid || null,
                vendorName: vendor?.name || '',
                vendorPhone: vendor?.phone || auth.currentUser?.phoneNumber || '',
                message: queryText.trim(),
                status: 'open',
                createdAt: new Date().toISOString(),
            });
            toast.success('Query submitted! We\'ll get back to you within 24 hours.');
            setQueryText('');
        } catch {
            toast.error('Could not submit. Please try again.');
        } finally {
            setSubmittingQuery(false);
        }
    };

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

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
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

                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 px-2 flex items-center gap-2"><FaQuestionCircle className="text-brand-500" /> Raise a Query</h3>
                    <textarea
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="Describe your issue or question…"
                        rows={3}
                        className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium text-gray-800 focus:border-brand-500 focus:ring-0 outline-none resize-none transition-colors"
                    />
                    <button
                        onClick={handleSubmitQuery}
                        disabled={submittingQuery || queryText.trim().length < 5}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 active:scale-[0.98] transition-all disabled:bg-gray-300"
                    >
                        <FaPaperPlane size={14} /> {submittingQuery ? 'Submitting…' : 'Submit Query'}
                    </button>
                    <p className="text-xs text-gray-500 px-1 mt-2">We'll address your query within 24 hours. You can also email <a href="mailto:trade@trade2cart.in" className="text-brand-600 font-bold">trade@trade2cart.in</a>.</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 px-2">Frequently Asked Questions</h3>
                    <div className="space-y-2">
                        {faqs.map((faq, index) => (
                            <div key={index} className="border-b border-gray-200 last:border-b-0">
                                <button onClick={() => toggleFaq(index)} className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
                                    <span>{faq.q}</span>
                                    <FaChevronDown className={`text-gray-500 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40' : 'max-h-0'}`}>
                                    <p className="p-4 pt-0 text-gray-600 text-sm">{faq.a}</p>
                                </div>
                            </div>
                        ))}
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
                            <FaFileContract className="text-xl text-brand-500" />
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