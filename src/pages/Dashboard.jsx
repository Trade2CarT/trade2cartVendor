import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../firebase';
import { ref, get, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { FaBoxOpen, FaRupeeSign, FaTasks, FaSignOutAlt, FaUserCircle, FaPhoneAlt, FaMapPin, FaTimes } from 'react-icons/fa';

// --- Helper Function ---
const firebaseObjectToArray = (snapshot) => {
    const data = snapshot.val();
    return data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
};

// --- Reusable UI Components ---

const StatCard = ({ icon, title, value, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-md flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const OtpModal = ({ order, onClose, onVerify }) => {
    const [otp, setOtp] = useState(new Array(4).fill(''));
    const inputsRef = useRef([]);

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    const handleChange = (e, index) => {
        const { value } = e.target;
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleVerifyClick = () => {
        const enteredOtp = otp.join('');
        if (enteredOtp.length === 4) {
            onVerify(enteredOtp);
        } else {
            toast.error("Please enter the 4-digit OTP.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center">
                <h3 className="text-xl font-bold text-gray-800">Order Verification</h3>
                <p className="text-gray-600 mt-2">Enter the 4-digit OTP from the customer's app to process the order for <b className="text-blue-600">{order.userName}</b>.</p>
                <div className="my-6 flex justify-center gap-3">
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => inputsRef.current[i] = el}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={e => handleChange(e, i)}
                            onKeyDown={e => handleKeyDown(e, i)}
                            className="w-14 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    ))}
                </div>
                <div className="flex gap-4">
                    <button onClick={onClose} className="w-full py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition">Cancel</button>
                    <button onClick={handleVerifyClick} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">Verify & Proceed</button>
                </div>
            </div>
        </div>
    );
};

const ProfileModal = ({ vendor, onClose }) => {
    if (!vendor) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <FaTimes size={20} />
                </button>
                <div className="text-center">
                    <img src={vendor.profilePhoto || vendor.profilePhotoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">{vendor.name}</h2>
                    <p className="text-gray-500">{vendor.location}</p>
                </div>
                <div className="mt-6 border-t pt-6 space-y-4 text-sm">
                    <div className="flex justify-between"><span className="font-semibold text-gray-600">Phone:</span><span className="text-gray-800">{vendor.phone}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-gray-600">Aadhaar:</span><span className="text-gray-800">{vendor.aadhaar}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-gray-600">PAN:</span><span className="text-gray-800">{vendor.pan}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-gray-600">License No:</span><span className="text-gray-800">{vendor.license}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-gray-600">Status:</span><span className={`font-bold ${vendor.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>{vendor.status}</span></div>
                </div>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---
const Dashboard = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const phone = state?.phone || null;

    const [vendor, setVendor] = useState(null);
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [otpModalOrder, setOtpModalOrder] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Effect to check auth status and fetch vendor data
    useEffect(() => {
        if (!phone) {
            toast.error("Authentication error. Please log in again.");
            navigate('/');
            return;
        }

        const vendorQuery = query(ref(db, 'vendors'), orderByChild('phone'), equalTo(phone));

        const unsubscribeVendor = onValue(vendorQuery, (snapshot) => {
            if (snapshot.exists()) {
                const vendorData = firebaseObjectToArray(snapshot)[0];
                setVendor(vendorData);
            } else {
                toast.error("Vendor profile not found. Please complete your registration.");
                navigate('/register');
            }
            setLoading(false);
        });

        return () => unsubscribeVendor();
    }, [phone, navigate]);

    // Effect to fetch assigned orders once vendor data is available
    useEffect(() => {
        if (!vendor) return;

        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorId'), equalTo(vendor.id));

        const unsubscribeAssignments = onValue(assignmentsQuery, async (snapshot) => {
            const assigned = firebaseObjectToArray(snapshot).filter(o => o.status === 'assigned');

            const enrichedOrders = await Promise.all(assigned.map(async (order) => {
                const userQuery = query(ref(db, 'users'), orderByChild('phone'), equalTo(order.mobile));
                const userSnapshot = await get(userQuery);
                if (userSnapshot.exists()) {
                    const userId = Object.keys(userSnapshot.val())[0];
                    const userData = userSnapshot.val()[userId];
                    return { ...order, userName: userData.name, userAddress: userData.address, userId };
                }
                return { ...order, userName: 'Unknown User', userAddress: 'N/A' };
            }));
            setAssignedOrders(enrichedOrders);
        });

        return () => unsubscribeAssignments();
    }, [vendor]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            toast.success("You've been signed out.");
            navigate('/');
        } catch (error) {
            toast.error("Failed to sign out.");
        }
    };

    const handleProcessOrder = async (enteredOtp) => {
        if (!otpModalOrder) return;

        try {
            const userRef = ref(db, `users/${otpModalOrder.userId}`);
            const userSnapshot = await get(userRef);

            if (!userSnapshot.exists()) {
                return toast.error("Customer data could not be found!");
            }

            const userData = userSnapshot.val();
            if (userData.otp === enteredOtp) {
                toast.success("OTP Verified!");
                setOtpModalOrder(null);
                navigate(`/process`, { state: { order: otpModalOrder, vendor } });
            } else {
                toast.error("Invalid OTP. Please ask the customer to check again.");
            }
        } catch (error) {
            console.error("OTP Verification Error:", error);
            toast.error("An error occurred during verification.");
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading Vendor Dashboard...</div>;
    }

    if (vendor?.status === 'pending') {
        return (
            <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center text-center p-4">
                <FaTasks className="text-6xl text-yellow-500 mb-4" />
                <h1 className="text-3xl font-bold text-yellow-800">Verification Pending</h1>
                <p className="text-yellow-700 mt-2 max-w-md">Your profile has been submitted and is under review. We will notify you once verification is complete.</p>
                <button onClick={handleSignOut} className="mt-8 px-6 py-2 bg-red-500 text-white font-bold rounded-lg shadow hover:bg-red-600">
                    Sign Out
                </button>
            </div>
        );
    }

    if (vendor?.status === 'rejected') {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center text-center p-4">
                <FaTasks className="text-6xl text-red-500 mb-4" />
                <h1 className="text-3xl font-bold text-red-800">Profile Rejected</h1>
                <p className="text-red-700 mt-2 max-w-md">We're sorry, your profile could not be approved. Please contact support for more information.</p>
                <button onClick={handleSignOut} className="mt-8 px-6 py-2 bg-red-500 text-white font-bold rounded-lg shadow hover:bg-red-600">
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Welcome, {vendor?.name?.split(' ')[0]}</h1>
                    <p className="text-sm text-gray-500">{vendor?.location}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowProfileModal(true)} className="cursor-pointer">
                        {(vendor?.profilePhoto || vendor?.profilePhotoURL) ?
                            <img src={vendor.profilePhoto || vendor.profilePhotoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-blue-500" />
                            : <FaUserCircle className="w-10 h-10 text-gray-400" />
                        }
                    </button>
                    <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500" title="Sign Out">
                        <FaSignOutAlt size={24} />
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatCard icon={<FaBoxOpen size={24} className="text-white" />} title="Pending Orders" value={assignedOrders.length} color="bg-blue-500" />
                    <StatCard icon={<FaTasks size={24} className="text-white" />} title="Completed Today" value="0" color="bg-green-500" />
                    <StatCard icon={<FaRupeeSign size={24} className="text-white" />} title="Earnings Today" value="₹0" color="bg-purple-500" />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">My Assigned Orders</h2>
                    <div className="overflow-x-auto">
                        {assignedOrders.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No new orders assigned. Check back later!</p>
                        ) : (
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Address</th>
                                        <th className="px-4 py-3">Contact</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignedOrders.map(order => (
                                        <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-4 font-medium text-gray-900">{order.userName || 'N/A'}</td>
                                            <td className="px-4 py-4 flex items-center gap-2"><FaMapPin className="text-gray-400" />{order.userAddress || 'N/A'}</td>
                                            <td className="px-4 py-4">
                                                <a href={`tel:${order.mobile}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                                                    <FaPhoneAlt size={12} /> {order.mobile}
                                                </a>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button onClick={() => setOtpModalOrder(order)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700">
                                                    Process
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {otpModalOrder && <OtpModal order={otpModalOrder} onClose={() => setOtpModalOrder(null)} onVerify={handleProcessOrder} />}
            {showProfileModal && <ProfileModal vendor={vendor} onClose={() => setShowProfileModal(false)} />}
        </div>
    );
};

export default Dashboard;
