import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// ✅ IMPORTED NEW QUERY TOOLS HERE:
import { getDatabase, ref, get, onValue, query, orderByChild, equalTo } from "firebase/database";
import { toast, Toaster } from "react-hot-toast";
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
    FaLocationArrow,
    FaInfoCircle,
    FaPlus,
    FaTrash,
    FaTimes
} from "react-icons/fa";

const Process = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const db = getDatabase();

    const initialAssignment = state?.assignment || (state?.id ? state : null);

    const [assignment, setAssignment] = useState(initialAssignment);
    const [loading, setLoading] = useState(true);
    const [isOtpVerified, setIsOtpVerified] = useState(() => state?.otpVerified || state?.bypassOtp || false);
    const [otpInput, setOtpInput] = useState("");
    const [customerGps, setCustomerGps] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Vendor Building the Bill Locally
    const [masterItems, setMasterItems] = useState([]);
    const [billItems, setBillItems] = useState([]);
    const [wasteEntries, setWasteEntries] = useState([]);

    // Custom Item Modal
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customRate, setCustomRate] = useState('');

    const targetUserId = assignment?.userId || assignment?.userID || assignment?.customerId;
    const targetAssignmentId = assignment?.id || assignment?.assignmentID || assignment?.orderId;

    useEffect(() => {
        if (!assignment || !targetUserId) {
            toast.error("Invalid order data. Please select the order from the Dashboard.");
            navigate(-1);
            return;
        }
        fetchCustomerData();
        fetchWasteEntries();
        fetchMasterItems();
    }, []);

    const fetchCustomerData = async () => {
        try {
            const userRef = ref(db, `users/${targetUserId}`);
            const snap = await get(userRef);
            if (snap.exists()) {
                const userData = snap.val();
                if (userData.lastLat && userData.lastLng) {
                    setCustomerGps({ lat: userData.lastLat, lng: userData.lastLng });
                }
            }
        } catch (error) {
            console.log("Could not fetch user GPS");
        }
    };

    // ✅ THE SECURE QUERY FIX: Only downloads this specific user's cart to pass Firebase Security Rules
    const fetchWasteEntries = async () => {
        setLoading(true);
        try {
            const entriesRef = query(
                ref(db, "wasteEntries"),
                orderByChild("userID"),
                equalTo(targetUserId)
            );

            const snapshot = await get(entriesRef);

            if (snapshot.exists()) {
                const allEntries = snapshot.val();
                const userEntries = Object.keys(allEntries)
                    .map((key) => ({ id: key, ...allEntries[key] }))
                    .filter(
                        (entry) => (!entry.assignmentID || entry.assignmentID === targetAssignmentId)
                    );
                setWasteEntries(userEntries);
            }
        } catch (error) {
            toast.error("Failed to load user cart data.");
            console.error(error);
        } finally {
            setLoading(false);
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
        }, (error) => {
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
        } catch (error) {
            toast.error("Verification failed. Check your connection.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- ADD / EDIT ITEM LOGIC ---
    const getRateDisplay = (item) => {
        const min = parseFloat(item.minRate || item.rate || 0);
        const max = parseFloat(item.maxRate || item.rate || 0);
        return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
    };

    const handleAddItem = (item) => {
        if (navigator.vibrate) navigator.vibrate(20);
        const existingItem = billItems.find(billItem => billItem.id === item.id);
        if (existingItem) {
            toast.error(`${item.name} is already added. Change weight below.`);
        } else {
            const minRateVal = parseFloat(item.minRate || item.rate) || 0;
            const newBillItem = {
                ...item,
                billItemId: `${item.id}-${Date.now()}`,
                rateInput: minRateVal.toString(),
                rate: minRateVal,
                weightInput: "1",
                weight: 1,
                total: minRateVal * 1,
            };
            setBillItems(prev => [...prev, newBillItem]);
        }
    };

    const handleAddCustom = () => {
        if (!customName.trim() || !customRate.trim()) return toast.error("Please enter a name and price.");
        const rateVal = parseFloat(customRate) || 0;
        const newItem = {
            id: `custom-${Date.now()}`,
            billItemId: `custom-${Date.now()}`,
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

    const generateBill = () => {
        if (billItems.length === 0) {
            return toast.error("Please add at least one item to generate a bill.");
        }

        // STRICT VALIDATION
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

        // FORMAT DATA FOR BILLING PAGE
        const weightsObj = {};
        const pricesObj = {};
        billItems.forEach(item => {
            weightsObj[item.id] = item.weight;
            pricesObj[item.name.toLowerCase()] = item.rate;
        });

        navigate(`/billing/${targetAssignmentId}`, {
            state: {
                assignment: assignment,
                selectedItems: billItems,
                weights: weightsObj,
                prices: pricesObj
            }
        });
    };

    if (loading || !assignment) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-bold tracking-widest uppercase">Loading Details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24 relative">
            <Toaster position="top-center" />

            <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white pt-6 pb-8 px-5 rounded-b-[40px] shadow-lg relative z-20">
                <div className="flex items-center gap-4 relative z-10">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-sm">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Process Order</h1>
                        <p className="text-blue-100 text-xs uppercase tracking-widest font-bold mt-1">ID: #{targetAssignmentId.substring(0, 8)}</p>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-4 relative z-30 max-w-2xl mx-auto space-y-4">

                {/* CUSTOMER CARD */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-gray-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FaUser size={12} /></div>
                            Customer Details
                        </h2>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
                            {assignment.status}
                        </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-xl font-black text-gray-900 mb-1">{assignment.userName}</p>
                        <div className="flex items-center gap-4 text-gray-600 font-medium">
                            <span className="flex items-center gap-1.5"><FaPhoneAlt size={12} /> {assignment.userMobile}</span>
                            <span className="flex items-center gap-1.5"><FaCalendarAlt size={12} /> {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* LOCATION CARD */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-[14px] font-black uppercase tracking-widest mb-4 text-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><FaMapMarkerAlt size={12} /></div>
                        Pickup Location
                    </h2>
                    <p className="text-gray-700 font-bold mb-4 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        {assignment.userAddress || "Address not provided"}
                    </p>
                    {customerGps ? (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${customerGps.lat},${customerGps.lng}`} target="_blank" rel="noopener noreferrer" className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 hover:bg-green-700 active:scale-95 transition-all shadow-md">
                            <FaLocationArrow size={18} /> Open in Google Maps
                        </a>
                    ) : (
                        <div className="p-4 bg-orange-50 text-orange-800 rounded-2xl border border-orange-100 text-sm font-bold flex items-center gap-3">
                            <FaInfoCircle size={20} className="flex-shrink-0 text-orange-500" />
                            No GPS Pin. Please call customer for directions.
                        </div>
                    )}
                </div>

                {/* OTP VERIFICATION OR WEIGHING */}
                {!isOtpVerified ? (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center animate-fade-in-up">
                        <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><FaLock size={24} /></div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Verify Customer OTP</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">Ask the customer for the PIN shown on their app.</p>
                        <input
                            type="text" inputMode="numeric" maxLength={6} value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-center text-4xl font-black tracking-[0.5em] py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-6 focus:border-blue-500 focus:ring-4 outline-none" placeholder="0000"
                        />
                        <button onClick={handleVerifyOtp} disabled={isProcessing || otpInput.length < 4} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-gray-800 disabled:bg-gray-300 transition-all">
                            {isProcessing ? "Verifying..." : "Verify & Start Weighing"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in-up">
                        <div className="bg-green-50 p-4 rounded-3xl border border-green-200 flex items-center gap-3 shadow-sm">
                            <FaCheckCircle className="text-green-600 text-2xl flex-shrink-0" />
                            <div>
                                <p className="font-black text-green-900">Verified & Unlocked</p>
                                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mt-0.5">Build the customer's bill below</p>
                            </div>
                        </div>

                        {/* VENDOR ADD ITEM GRID */}
                        <div>
                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1">Tap to Add Scrap Items</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {masterItems.map(item => (
                                    <div key={item.id} onClick={() => handleAddItem(item)} className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform hover:border-blue-300 h-24">
                                        <span className="font-extrabold text-sm text-gray-800 leading-tight mb-2 line-clamp-2">{item.name}</span>
                                        <span className="mt-auto text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{getRateDisplay(item)}/{item.unit || 'kg'}</span>
                                    </div>
                                ))}
                                <div onClick={() => setShowCustomModal(true)} className="bg-blue-50 p-3 rounded-2xl border-2 border-dashed border-blue-400 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform text-blue-700 h-24">
                                    <FaPlus className="text-xl mb-1" />
                                    <span className="font-extrabold text-sm">Custom</span>
                                </div>
                            </div>
                        </div>

                        {/* BILL ITEMS LIST */}
                        {billItems.length > 0 && (
                            <div className="mt-6">
                                <h2 className="text-[14px] font-black uppercase tracking-widest mb-3 text-gray-800 flex items-center gap-2"><FaWeightHanging className="text-blue-500" /> Current Bill</h2>
                                {billItems.map(item => (
                                    <div key={item.billItemId} className="bg-white p-4 rounded-2xl border-2 border-gray-100 mb-3 shadow-sm relative overflow-hidden">
                                        <button onClick={() => handleRemoveItem(item.billItemId)} className="absolute top-0 right-0 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors p-3 rounded-bl-2xl"><FaTrash size={14} /></button>
                                        <h4 className="font-extrabold text-lg text-gray-900 pr-10">{item.name}</h4>

                                        <div className="flex gap-3 mt-4 items-end">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Rate (₹)</label>
                                                <input type="number" value={item.rateInput} onChange={(e) => handleUpdateRate(item.billItemId, e.target.value)} className="w-full px-2 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 outline-none text-center" />
                                                {!item.id.startsWith('custom-') && (item.minRate !== item.maxRate) && (
                                                    <p className="text-[9px] text-gray-400 mt-1 text-center font-bold">Limit: ₹{item.minRate || item.rate} - ₹{item.maxRate || item.rate}</p>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Wt ({item.unit || 'kg'})</label>
                                                <input type="number" value={item.weightInput} onChange={(e) => handleUpdateWeight(item.billItemId, e.target.value)} className="w-full px-2 py-3 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-900 focus:border-blue-500 outline-none text-center" />
                                            </div>
                                            <div className="flex-1 text-right pb-2">
                                                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Total</label>
                                                <div className="font-black text-xl text-green-600">₹{item.total.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button onClick={generateBill} disabled={billItems.length === 0} className="w-full py-4 mt-6 bg-green-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none">
                            <FaFileInvoiceDollar /> Continue to Billing
                        </button>
                    </div>
                )}
            </main>

            {/* CUSTOM ITEM MODAL */}
            {showCustomModal && (
                <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-up">
                        <button onClick={() => setShowCustomModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full"><FaTimes /></button>
                        <h3 className="text-2xl font-black text-gray-900 mb-6">Add Custom Scrap</h3>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Item Name</label>
                                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Copper Wire" className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Rate / Price (₹)</label>
                                <input type="number" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="e.g. 50" className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                        <button onClick={handleAddCustom} className="w-full py-4 bg-blue-600 text-white font-black text-xl rounded-xl shadow-lg active:scale-95 transition-transform">
                            Add to Bill
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Process;