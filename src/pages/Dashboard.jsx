import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db, auth } from '../firebase';
import { ref, get, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { FaBoxOpen, FaRupeeSign, FaTasks, FaPhoneAlt, FaMapPin, FaTimes } from 'react-icons/fa';
import Loader from '../components/Loader';
import SEO from '../components/SEO';


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

const OtpModal = ({ order, onClose, onVerify, loading }) => {
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
                <p className="text-gray-600 mt-2">Enter the 4-digit OTP from the customer's app to process the order.</p>
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
                    <button onClick={handleVerifyClick} disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                        {loading ? 'Verifying...' : 'Verify & Proceed'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---
const Dashboard = () => {
    const navigate = useNavigate();
    const [vendor, setVendor] = useState(null);
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [otpModalOrder, setOtpModalOrder] = useState(null);
    const [usersMap, setUsersMap] = useState({});
    const [verifyLoading, setVerifyLoading] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user && user.phoneNumber) {
                try {
                    const vendorPhone = user.phoneNumber;
                    const vendorQuery = query(ref(db, 'vendors'), orderByChild('phone'), equalTo(vendorPhone));

                    const snapshot = await get(vendorQuery);

                    if (snapshot.exists()) {
                        const vendorData = firebaseObjectToArray(snapshot)[0];
                        setVendor(vendorData);
                    } else {
                        toast.error("Vendor profile not found. Please complete your registration.");
                        navigate('/register');
                    }
                } catch (error) {
                    console.error("Failed to fetch vendor data:", error);
                    toast.error("Could not fetch your profile. Please try again later.");
                } finally {
                    setLoading(false);
                }
            } else {
                toast.error("Authentication required. Please log in.");
                navigate('/');
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, [navigate]);

    useEffect(() => {
        if (!vendor) return;

        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorPhone'), equalTo(vendor.phone));

        const unsubscribeAssignments = onValue(assignmentsQuery, (snapshot) => {
            const assigned = firebaseObjectToArray(snapshot).filter(o => o.status === 'assigned');
            setAssignedOrders(assigned);
        }, (error) => {
            console.error("Error fetching assignments:", error);
            toast.error("Could not load assigned orders.");
        });

        return () => unsubscribeAssignments();
    }, [vendor]);

    useEffect(() => {
        const usersRef = ref(db, 'users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const usersData = snapshot.val() || {};
            setUsersMap(usersData);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast.error("Could not load user data.");
        });

        return () => unsubscribeUsers();
    }, []);


    const handleProcessOrder = async (enteredOtp) => {
        if (!otpModalOrder || !otpModalOrder.userId) {
            return toast.error("Cannot process order: User ID is missing.");
        };
        setVerifyLoading(true);

        try {
            const userRef = ref(db, `users/${otpModalOrder.userId}`);
            const userSnapshot = await get(userRef);

            if (!userSnapshot.exists()) {
                setVerifyLoading(false);
                return toast.error("Customer data could not be found!");
            }

            const userData = userSnapshot.val();

            if (String(userData.otp) === String(enteredOtp)) {
                toast.success("OTP Verified!");
                setOtpModalOrder(null);
                navigate(`/process/${otpModalOrder.id}`, { state: { vendorLocation: vendor.location } });
            } else {
                toast.error("Invalid OTP. Please ask the customer to check again.");
            }
        } catch (error) {
            console.error("OTP Verification Error:", error);
            toast.error("An error occurred during verification.");
        } finally {
            setVerifyLoading(false);
        }
    };

    const groupedOrders = assignedOrders.reduce((acc, order) => {
        const key = order.userId || order.mobile;
        if (!acc[key]) {
            acc[key] = { ...order, productsList: [], };
        }
        acc[key].productsList.push(order.products);
        return acc;
    }, {});
    const groupedList = Object.values(groupedOrders);

    if (loading) {
        return <Loader fullscreen />;
    }

    if (vendor?.status === 'pending' || vendor?.status === 'rejected') {
        const isPending = vendor.status === 'pending';
        return (
            <div className={`min-h-[80vh] flex flex-col items-center justify-center text-center p-4 ${isPending ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <FaTasks className={`text-6xl mb-4 ${isPending ? 'text-yellow-500' : 'text-red-500'}`} />
                <h1 className={`text-3xl font-bold ${isPending ? 'text-yellow-800' : 'text-red-800'}`}>
                    {isPending ? 'Verification Pending' : 'Profile Rejected'}
                </h1>
                <p className={`mt-2 max-w-md ${isPending ? 'text-yellow-700' : 'text-red-700'}`}>
                    {isPending
                        ? "Your profile is under review. We'll notify you once verification is complete."
                        : "Your profile could not be approved. Please contact support for more information."}
                </p>
            </div>
        );
    }


    return (
        <>
            <SEO
                title="Vendor Dashboard – Trade2Cart"
                description="Manage your assigned scrap pickup orders, view customer details, and process payments."
            />
            <main className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatCard icon={<FaBoxOpen size={24} className="text-white" />} title="Pending Orders" value={groupedList.length} color="bg-blue-500" />
                    <StatCard icon={<FaTasks size={24} className="text-white" />} title="Completed Today" value="0" color="bg-green-500" />
                    <StatCard icon={<FaRupeeSign size={24} className="text-white" />} title="Earnings Today" value="₹0" color="bg-purple-500" />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">My Assigned Orders</h2>
                    <div className="overflow-x-auto">
                        {groupedList.length === 0 ? (
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
                                    {groupedList.map(order => (
                                        <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-4 font-medium text-gray-900">{usersMap[order.userId]?.name || 'N/A'}</td>
                                            <td className="px-4 py-4"><FaMapPin className="inline mr-2 text-gray-400" />{usersMap[order.userId]?.address || 'N/A'}</td>
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

            {otpModalOrder && <OtpModal order={otpModalOrder} onClose={() => setOtpModalOrder(null)} onVerify={handleProcessOrder} loading={verifyLoading} />}
        </>
    );
};

export default Dashboard;
