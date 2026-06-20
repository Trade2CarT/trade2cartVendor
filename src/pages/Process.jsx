import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, onValue } from "firebase/database";
import { auth } from "../firebase";
import { toast } from "react-hot-toast";
import {
    FaArrowLeft,
    FaCheckCircle,
    FaUser,
    FaPhoneAlt,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaWeightHanging,
    FaFileInvoiceDollar,
    FaLock,
    FaPlus,
    FaTrash,
    FaTimes
} from "react-icons/fa";

const Process = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const db = getDatabase();

    const initialAssignment = state?.assignment || (state?.id ? state : null);

    const [assignment] = useState(initialAssignment);
    const [vendor, setVendor] = useState(null);
    const [customerProfile, setCustomerProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [isOtpVerified, setIsOtpVerified] = useState(() => state?.otpVerified || state?.bypassOtp || false);
    const [otpInput, setOtpInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const [masterItems, setMasterItems] = useState([]);

    const targetAssignmentId = assignment?.id || assignment?.assignmentID || assignment?.orderId;
    const targetUserId = assignment?.userId || assignment?.userID || assignment?.customerId;

    // Persist the in-progress cart so the back button / refresh doesn't lose work.
    const [billItems, setBillItems] = useState(() => {
        const savedCart = sessionStorage.getItem(`cart_${targetAssignmentId}`);
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customRate, setCustomRate] = useState('');

    useEffect(() => {
        if (!assignment || !targetUserId) {
            toast.error("Invalid order data. Please select the order from the Dashboard.");
            navigate(-1);
            return;
        }
        fetchVendorProfile();
        fetchCustomerData();
        fetchMasterItems();
    }, []);

    useEffect(() => {
        if (targetAssignmentId) {
            sessionStorage.setItem(`cart_${targetAssignmentId}`, JSON.stringify(billItems));
        }
    }, [billItems, targetAssignmentId]);

    const fetchVendorProfile = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const vendorRef = ref(db, `vendors/${user.uid}`);
                const snap = await get(vendorRef);
                if (snap.exists()) setVendor(snap.val());
            }
        } catch {
            console.error("Could not fetch vendor profile");
        }
    };

    const fetchCustomerData = async () => {
        try {
            const userRef = ref(db, `users/${targetUserId}`);
            const snap = await get(userRef);
            if (snap.exists()) {
                setCustomerProfile(snap.val());
            }
        } catch {
            console.error("Could not fetch customer data");
        }
    };

    const fetchMasterItems = () => {
        setLoading(true);
        const itemsRef = ref(db, 'items');
        onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const itemsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setMasterItems(itemsArray);
            }
            setLoading(false);
        }, () => {
            toast.error("Failed to load scrap prices.");
            setLoading(false);
        });
    };

    const handleVerifyOtp = async () => {
        if (!otpInput || otpInput.length < 4) {
            return toast.error("Please enter the complete OTP.");
        }
        setIsProcessing(true);
        try {
            const userRef = ref(db, `users/${targetUserId}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists() && userSnapshot.val().otp == otpInput) {
                setIsOtpVerified(true);
                toast.success("OTP Verified Successfully!");
            } else {
                toast.error("Incorrect OTP. Please try again.");
            }
        } catch {
            toast.error("Verification failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const getRateDisplay = (item) => {
        const min = parseFloat(item.minRate || item.rate || 0);
        const max = parseFloat(item.maxRate || item.rate || 0);
        return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    };

    const handleItemClick = (item) => {
        if (navigator.vibrate) navigator.vibrate(20);

        const isAlreadyAdded = billItems.some(b => b.id === item.id);

        if (isAlreadyAdded) {
            setBillItems(prev => prev.filter(b => b.id !== item.id));
        } else {
            const defaultRate = parseFloat(item.minRate || item.rate) || 0;
            const newBillItem = {
                ...item,
                billItemId: `${item.id}-${Date.now()}`,
                rateInput: defaultRate.toString(),
                rate: defaultRate,
                weightInput: "",
                weight: 0,
                total: 0
            };
            setBillItems(prev => [...prev, newBillItem]);
        }
    };

    const handleUpdateRate = (billItemId, newRateInput) => {
        setBillItems(prev => prev.map(item => {
            if (item.billItemId === billItemId) {
                const parsedRate = parseFloat(newRateInput) || 0;
                return { ...item, rateInput: newRateInput, rate: parsedRate, total: parsedRate * item.weight };
            }
            return item;
        }));
    };

    const handleUpdateWeight = (billItemId, newWeightInput) => {
        setBillItems(prev => prev.map(item => {
            if (item.billItemId === billItemId) {
                const parsedWeight = parseFloat(newWeightInput) || 0;
                return { ...item, weightInput: newWeightInput, weight: parsedWeight, total: item.rate * parsedWeight };
            }
            return item;
        }));
    };

    const handleRemoveItem = (billItemId) => {
        setBillItems(prev => prev.filter(item => item.billItemId !== billItemId));
    };

    const handleAddCustom = () => {
        if (!customName.trim()) return toast.error("Please enter an item name.");
        const rateVal = parseFloat(customRate);
        if (!Number.isFinite(rateVal) || rateVal <= 0) return toast.error("Please enter a valid price greater than 0.");
        const uid = `custom-${Date.now()}`;
        const newItem = {
            id: uid,
            billItemId: uid,
            name: customName,
            rateInput: customRate,
            rate: rateVal,
            weightInput: "1",
            weight: 1,
            unit: 'kg',
            total: rateVal * 1,
        };
        setBillItems(prev => [...prev, newItem]);
        setShowCustomModal(false);
        setCustomName('');
        setCustomRate('');
    };

    const generateBill = () => {
        if (billItems.length === 0) return toast.error("Please add at least one item.");

        for (let item of billItems) {
            if (item.id.startsWith('custom-')) continue;
            const min = parseFloat(item.minRate || item.rate || 0);
            const max = parseFloat(item.maxRate || item.rate || Infinity);

            if (item.rate < min || item.rate > max) {
                return toast.error(`Error: ${item.name} price must be between ₹${min} and ₹${max}.`);
            }
            if (item.weight <= 0 || isNaN(item.weight)) {
                return toast.error(`Please enter a valid weight for ${item.name}.`);
            }
        }

        const weightsObj = {};
        const pricesObj = {};
        billItems.forEach(item => {
            weightsObj[item.id] = item.weight;
            pricesObj[item.name.toLowerCase()] = item.rate;
        });

        const enrichedAssignment = {
            ...assignment,
            userName: customerProfile?.name || assignment.userName || "Customer",
            userMobile: customerProfile?.phone || assignment.userMobile || "N/A",
            userAddress: customerProfile?.address || assignment.userAddress || "Address not provided"
        };

        navigate(`/billing/${targetAssignmentId}`, {
            state: { assignment: enrichedAssignment, selectedItems: billItems, weights: weightsObj, prices: pricesObj }
        });
    };

    if (loading || !assignment || !vendor) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-14 h-14 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const availableItems = vendor?.location
        ? masterItems.filter(item => item.location?.toLowerCase() === vendor.location?.toLowerCase())
        : masterItems;

    const displayUserName = customerProfile?.name || assignment.userName || "Customer";
    const displayUserPhone = customerProfile?.phone || assignment.userMobile || "N/A";
    const displayUserAddress = customerProfile?.address || assignment.userAddress || "Address not provided";
    const billTotal = billItems.reduce((sum, item) => sum + (item.total || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-32">
            {/* Header */}
            <header className="bg-gray-900 text-white px-5 pt-6 pb-10">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition active:scale-95"
                        aria-label="Go back"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <p className="text-white/50 text-[11px] uppercase tracking-[0.2em] font-bold">Order #{(targetAssignmentId || '').substring(0, 8)}</p>
                        <h1 className="text-2xl font-black tracking-tight">Process Order</h1>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-5 relative max-w-2xl mx-auto space-y-4">
                {/* Customer + address */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FaUser size={10} /> Customer
                            </p>
                            <p className="text-xl font-black text-gray-900 mt-1 truncate">{displayUserName}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500 font-medium text-sm mt-1">
                                <span className="flex items-center gap-1.5"><FaPhoneAlt size={11} /> {displayUserPhone}</span>
                                <span className="flex items-center gap-1.5"><FaCalendarAlt size={11} /> {new Date(assignment.assignedAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2 text-gray-700 font-medium text-sm">
                        <FaMapMarkerAlt className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{displayUserAddress}</span>
                    </div>
                </div>

                {/* OTP gate or weighing */}
                {!isOtpVerified ? (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4"><FaLock size={20} /></div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Verify Customer OTP</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">Ask the customer for the PIN shown on their app.</p>
                        <input
                            type="text" inputMode="numeric" maxLength={6} value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-center text-4xl font-black tracking-[0.4em] py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-5 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none" placeholder="0000"
                        />
                        <button onClick={handleVerifyOtp} disabled={isProcessing || otpInput.length < 4} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-gray-800 disabled:bg-gray-300 transition-all active:scale-[0.98]">
                            {isProcessing ? "Verifying..." : "Verify & Start Weighing"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3">
                            <FaCheckCircle className="text-green-600 text-2xl flex-shrink-0" />
                            <div>
                                <p className="font-black text-green-900">Verified & Unlocked</p>
                                <p className="text-xs font-bold text-green-700 mt-0.5">Tap an item to add it to the bill</p>
                            </div>
                        </div>

                        {/* Item grid */}
                        <div>
                            <h2 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1">Scrap Categories</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {availableItems.length > 0 ? availableItems.map(item => {
                                    const isSelected = billItems.some(b => b.id === item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleItemClick(item)}
                                            className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all h-24 relative
                                                ${isSelected ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-100 bg-white hover:border-brand-200'}`}
                                        >
                                            {isSelected && <FaCheckCircle className="absolute top-2 right-2 text-brand-500" />}
                                            <span className="font-extrabold text-sm text-gray-800 leading-tight mb-2 line-clamp-2">{item.name}</span>
                                            <span className={`mt-auto text-[10px] font-bold px-2 py-1 rounded-md ${isSelected ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'}`}>
                                                {getRateDisplay(item)}/{item.unit || 'kg'}
                                            </span>
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-2 sm:col-span-3 text-center p-4 bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 font-bold text-sm">
                                        No predefined items found for your location.
                                    </div>
                                )}
                                <div onClick={() => setShowCustomModal(true)} className="bg-brand-50 p-3 rounded-2xl border-2 border-dashed border-brand-300 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform text-brand-700 h-24">
                                    <FaPlus className="text-xl mb-1" />
                                    <span className="font-extrabold text-sm">Custom</span>
                                </div>
                            </div>
                        </div>

                        {/* Current bill */}
                        {billItems.length > 0 && (
                            <div className="pt-2">
                                <h2 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2"><FaWeightHanging /> Current Bill</h2>
                                <div className="space-y-3">
                                    {billItems.map(item => (
                                        <div key={item.billItemId} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative">
                                            <button onClick={() => handleRemoveItem(item.billItemId)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors" aria-label="Remove item"><FaTrash size={14} /></button>
                                            <h4 className="font-extrabold text-gray-900 pr-8">{item.name}</h4>

                                            <div className="flex gap-3 mt-3 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Rate (₹)</label>
                                                    <input type="number" value={item.rateInput} onChange={(e) => handleUpdateRate(item.billItemId, e.target.value)} className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:border-brand-500 outline-none text-center" />
                                                    {!item.id.startsWith('custom-') && (item.minRate !== item.maxRate) && (
                                                        <p className="text-[9px] text-gray-400 mt-1 text-center font-bold">₹{item.minRate || item.rate} - ₹{item.maxRate || item.rate}</p>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Wt ({item.unit || 'kg'})</label>
                                                    <input type="number" autoFocus={item.weightInput === ""} value={item.weightInput} onChange={(e) => handleUpdateWeight(item.billItemId, e.target.value)} placeholder="0.0" className="w-full px-2 py-2.5 bg-brand-50 border border-brand-200 rounded-xl font-bold text-brand-900 focus:border-brand-500 outline-none text-center" />
                                                </div>
                                                <div className="flex-1 text-right pb-1.5">
                                                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Total</label>
                                                    <div className="font-black text-lg text-green-600 tabular-nums">₹{item.total.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Sticky continue bar */}
            {isOtpVerified && (
                <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40">
                    <div className="max-w-2xl mx-auto flex items-center gap-4">
                        <div className="flex-shrink-0">
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Total</p>
                            <p className="font-black text-xl text-gray-900 tabular-nums">₹{billTotal.toFixed(2)}</p>
                        </div>
                        <button onClick={generateBill} disabled={billItems.length === 0} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-base shadow-lg hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none">
                            <FaFileInvoiceDollar /> Continue to Billing
                        </button>
                    </div>
                </div>
            )}

            {/* Custom item modal */}
            {showCustomModal && (
                <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-up">
                        <button onClick={() => setShowCustomModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full" aria-label="Close"><FaTimes /></button>
                        <h3 className="text-2xl font-black text-gray-900 mb-6">Add Custom Scrap</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Item Name</label>
                                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Copper Wire" className="w-full mt-1.5 p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-brand-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Rate / Price (₹)</label>
                                <input type="number" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="e.g. 50" className="w-full mt-1.5 p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-brand-500 outline-none" />
                            </div>
                        </div>
                        <button onClick={handleAddCustom} className="w-full py-4 bg-gray-900 text-white font-black text-lg rounded-2xl shadow-lg active:scale-[0.98] transition-transform">
                            Add to Bill
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Process;
