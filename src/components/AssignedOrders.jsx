import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { useVendor } from '../App';
import { FaPhoneAlt, FaMapPin, FaRupeeSign } from 'react-icons/fa';

// OTP Modal Component (No changes needed here)
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
                            type="tel"
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


const AssignedOrders = ({ assignedOrders, usersMap, itemRates }) => {
    const navigate = useNavigate();
    const vendor = useVendor();
    const [otpModalOrder, setOtpModalOrder] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);

    const handleProcessOrder = async (enteredOtp) => {
        if (!otpModalOrder || !otpModalOrder.userId) {
            return toast.error("Cannot process order: User ID is missing.");
        }
        setVerifyLoading(true);
        try {
            const userRef = ref(db, `users/${otpModalOrder.userId}`);
            const userSnapshot = await get(userRef);
            if (!userSnapshot.exists()) {
                throw new Error("Customer data could not be found!");
            }
            const userData = userSnapshot.val();
            if (String(userData.otp) === String(enteredOtp)) {
                toast.success("OTP Verified!");
                setOtpModalOrder(null);
                navigate(`/process/${otpModalOrder.id}`, { state: { vendorLocation: vendor.location } });
            } else {
                toast.error("Invalid OTP. Please check again.");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setVerifyLoading(false);
        }
    };

    // --- NEW: Robust function to get the estimated amount ---
    const getEstimatedAmount = (order) => {
        // 1. Check for a 'total' field on the main order object first.
        if (order.total && parseFloat(order.total) > 0) {
            return parseFloat(order.total);
        }

        // 2. If no 'total', calculate it from the products list.
        let calculatedTotal = 0;
        if (order.productsList && itemRates) {
            order.productsList.forEach(product => {
                const rate = itemRates[product.name] || 0;
                const weight = parseFloat(product.weight) || 0;
                calculatedTotal += rate * weight;
            });
        }
        return calculatedTotal;
    };

    // Group orders and their products by user
    const groupedOrders = assignedOrders.reduce((acc, order) => {
        const key = order.userId || order.mobile;
        if (!acc[key]) {
            acc[key] = { ...order, productsList: [] };
        }
        if (order.products && order.products.name) {
            acc[key].productsList.push(order.products);
        }
        return acc;
    }, {});
    const groupedList = Object.values(groupedOrders);

    return (
        <div className="overflow-x-auto">
            {groupedList.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No new orders assigned. Check back later!</p>
            ) : (
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Customer Details</th>
                            <th className="px-4 py-3">Est. Amount</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedList.map(order => (
                            <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-4">
                                    <p className="font-semibold text-gray-900">{usersMap[order.userId]?.name || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-2">
                                        <FaMapPin className="flex-shrink-0 mt-0.5" />
                                        <span>{usersMap[order.userId]?.address || 'No address provided'}</span>
                                    </p>
                                    <a href={`tel:${order.mobile}`} className="flex items-center gap-2 text-xs text-blue-600 hover:underline mt-2">
                                        <FaPhoneAlt size={10} /> {order.mobile}
                                    </a>
                                </td>

                                {/* --- UPDATED: Uses the new robust function --- */}
                                <td className="px-4 py-4 font-semibold text-gray-800 align-top">
                                    <div className="flex items-center gap-1">
                                        <FaRupeeSign size={12} />
                                        {getEstimatedAmount(order).toFixed(2)}
                                    </div>
                                </td>

                                <td className="px-4 py-4 align-top">
                                    <button onClick={() => setOtpModalOrder(order)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700">
                                        Process
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {otpModalOrder && <OtpModal order={otpModalOrder} onClose={() => setOtpModalOrder(null)} onVerify={handleProcessOrder} loading={verifyLoading} />}
        </div>
    );
};

export default AssignedOrders;