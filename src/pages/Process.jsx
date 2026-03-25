import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get, onValue, push, update } from 'firebase/database';
import { db, auth } from '../firebase';
import { FaPlus, FaTrash, FaUser, FaMapMarkerAlt, FaPhoneAlt, FaTimes } from 'react-icons/fa';
import Loader from './Loader';
import SEO from '../components/SEO';

const Process = () => {
    const navigate = useNavigate();
    const { assignmentId } = useParams();

    const [vendor, setVendor] = useState(null);
    const [assignment, setAssignment] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [masterItems, setMasterItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [billItems, setBillItems] = useState([]);
    const [billCalculated, setBillCalculated] = useState(false);

    // Custom Modal State
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customRate, setCustomRate] = useState('');

    useEffect(() => {
        if (!assignmentId) {
            toast.error("No order specified.");
            navigate('/dashboard');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const user = auth.currentUser;
                if (user) {
                    const vendorRef = ref(db, `vendors/${user.uid}`);
                    const vendorSnapshot = await get(vendorRef);
                    if (vendorSnapshot.exists()) setVendor(vendorSnapshot.val());
                }

                const assignmentRef = ref(db, `assignments/${assignmentId}`);
                const assignmentSnapshot = await get(assignmentRef);
                if (!assignmentSnapshot.exists()) {
                    toast.error("Order not found.");
                    navigate('/dashboard');
                    return;
                }
                const assignmentData = { id: assignmentSnapshot.key, ...assignmentSnapshot.val() };
                setAssignment(assignmentData);

                if (assignmentData.userId) {
                    const userRef = ref(db, `users/${assignmentData.userId}`);
                    const userSnapshot = await get(userRef);
                    if (userSnapshot.exists()) setCustomer(userSnapshot.val());
                }
            } catch (error) {
                toast.error("Failed to load critical order data.");
            } finally { setLoading(false); }
        };

        fetchData();
    }, [assignmentId, navigate]);

    useEffect(() => {
        const itemsRef = ref(db, 'items');
        const unsubscribe = onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            const itemsArray = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setMasterItems(itemsArray);
        });
        return () => unsubscribe();
    }, []);

    // Add item from Grid
    const handleAddItem = (item) => {
        const existingItem = billItems.find(billItem => billItem.id === item.id);
        if (existingItem) {
            toast.error(`${item.name} is already added. You can change weight below.`);
        } else {
            const rateVal = parseFloat(item.rate) || 0;
            const newBillItem = {
                ...item,
                billItemId: `${item.id}-${Date.now()}`,
                rateInput: item.rate.toString(),
                rate: rateVal,
                weightInput: "1",
                weight: 1,
                total: rateVal * 1,
            };
            setBillItems(prev => [...prev, newBillItem]);
        }
    };

    // Add custom item
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

    // Handle Manual Rate Edit
    const handleUpdateRate = (billItemId, newRateInput) => {
        setBillItems(prev => prev.map(item => {
            if (item.billItemId === billItemId) {
                const parsedRate = parseFloat(newRateInput) || 0;
                return { ...item, rateInput: newRateInput, rate: parsedRate, total: parsedRate * item.weight };
            }
            return item;
        }));
    };

    // Handle Manual Weight Edit
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

    const totalBill = useMemo(() => billItems.reduce((acc, item) => acc + (item.total || 0), 0), [billItems]);

    const handleSubmitBill = async () => {
        if (billItems.length === 0) return toast.error("Please add items to the bill.");
        setIsSubmitting(true);
        try {
            const billData = {
                assignmentID: assignmentId,
                vendorId: assignment.vendorId,
                userId: assignment.userId,
                billItems: billItems.map(({ id, billItemId, ...item }) => item),
                totalBill,
                timestamp: new Date().toISOString(),
                mobile: assignment.mobile,
            };

            const updates = {};
            const newBillRef = push(ref(db, 'bills'));
            updates[`/bills/${newBillRef.key}`] = billData;
            updates[`/assignments/${assignmentId}/status`] = 'completed';
            updates[`/assignments/${assignmentId}/totalAmount`] = totalBill;
            updates[`/assignments/${assignmentId}/timestamp`] = new Date().toISOString();
            updates[`/users/${assignment.userId}/Status`] = 'available';
            updates[`/users/${assignment.userId}/otp`] = null;
            updates[`/users/${assignment.userId}/currentAssignmentId`] = null;

            await update(ref(db), updates);
            toast.success("Order completed successfully!");
            navigate('/dashboard');
        } catch (error) {
            toast.error("Error saving bill.");
        } finally { setIsSubmitting(false); }
    };

    if (loading || !assignment || !customer || !vendor) return <Loader fullscreen />;

    const availableItems = masterItems.filter(item => item.location?.toLowerCase() === vendor.location?.toLowerCase());

    return (
        <>
            <SEO title={`Process Order - ${assignmentId.slice(-6)}`} />
            <div className="pb-40 bg-gray-50 min-h-screen">

                {/* Header */}
                <div className="bg-blue-600 text-white p-6 pt-8 rounded-b-3xl shadow-md mb-6">
                    <h1 className="text-2xl font-extrabold mb-1">Process Pickup</h1>
                    <p className="text-blue-100 font-medium text-sm">Order ID: #{assignmentId.slice(-6).toUpperCase()}</p>
                </div>

                <div className="max-w-2xl mx-auto px-4 space-y-6">

                    {/* Customer Details */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Customer Info</h2>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4 text-gray-800 font-bold">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><FaUser /></div>
                                <span className="text-lg">{customer.name || 'N/A'}</span>
                            </div>
                            <a href={`tel:${customer.phone}`} className="flex items-center gap-4 text-gray-700 hover:text-blue-600 font-semibold">
                                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center"><FaPhoneAlt /></div>
                                <span>{customer.phone}</span>
                            </a>
                        </div>
                    </div>

                    {/* TAP GRID */}
                    {!billCalculated && (
                        <div>
                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1">Tap to Add Items</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
                                {availableItems.map(item => (
                                    <div key={item.id} onClick={() => handleAddItem(item)} className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform hover:border-blue-300 h-full">
                                        <span className="font-extrabold text-sm text-gray-800 leading-tight mb-3 line-clamp-2">{item.name}</span>
                                        <span className="mt-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">₹{item.rate}/{item.unit}</span>
                                    </div>
                                ))}
                                {/* Custom Item Button */}
                                <div onClick={() => setShowCustomModal(true)} className="bg-blue-50 p-3 rounded-2xl border-2 border-dashed border-blue-400 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform text-blue-700 h-full">
                                    <FaPlus className="text-xl mb-2" />
                                    <span className="mt-auto font-extrabold text-sm">Custom</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BILL ITEMS (Editable Cart) */}
                    {billItems.length > 0 && (
                        <div className="mt-6">
                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3 ml-1">Current Bill</h2>
                            {billItems.map(item => (
                                <div key={item.billItemId} className="bg-white p-4 rounded-2xl border-2 border-gray-100 mb-3 shadow-sm relative">
                                    {!billCalculated && (
                                        <button onClick={() => handleRemoveItem(item.billItemId)} className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-2 active:scale-90"><FaTrash size={14} /></button>
                                    )}
                                    <h4 className="font-extrabold text-lg text-gray-900 pr-8">{item.name}</h4>

                                    {/* FIXED: Added items-end, min-w-0 to children, and removed tracking-widest */}
                                    <div className="flex gap-2 mt-3 items-end">
                                        {/* Editable Price */}
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1 truncate">Rate (₹)</label>
                                            <input type="number" value={item.rateInput} disabled={billCalculated} onChange={(e) => handleUpdateRate(item.billItemId, e.target.value)} className="w-full px-2 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg font-bold text-gray-900 focus:border-blue-500 focus:ring-0 text-center disabled:opacity-70 min-w-0" />
                                        </div>
                                        {/* Editable Weight */}
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1 truncate">Qty/Wt</label>
                                            <input type="number" value={item.weightInput} disabled={billCalculated} onChange={(e) => handleUpdateWeight(item.billItemId, e.target.value)} className="w-full px-2 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg font-bold text-gray-900 focus:border-blue-500 focus:ring-0 text-center disabled:opacity-70 min-w-0" />
                                        </div>
                                        {/* Item Total */}
                                        <div className="flex-1 min-w-0 text-right pb-1">
                                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1 truncate">Total</label>
                                            <div className="font-extrabold text-lg text-gray-900 truncate">₹{item.total.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sticky Checkout Bar */}
                {billItems.length > 0 && (
                    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] p-4 sm:p-6 z-30 pb-safe">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-gray-500 font-extrabold uppercase tracking-widest text-sm">Grand Total</span>
                                <span className="text-4xl font-extrabold text-green-600">₹{totalBill.toFixed(2)}</span>
                            </div>

                            {!billCalculated ? (
                                <button onClick={() => setBillCalculated(true)} className="w-full py-4 bg-blue-600 text-white font-extrabold text-xl rounded-xl shadow-lg active:scale-95 transition-transform">
                                    Calculate Bill
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button onClick={() => setBillCalculated(false)} disabled={isSubmitting} className="flex-1 py-4 bg-gray-100 text-gray-800 font-extrabold text-lg rounded-xl active:bg-gray-200 transition-colors">
                                        Edit
                                    </button>
                                    <button onClick={handleSubmitBill} disabled={isSubmitting} className="flex-[2] py-4 bg-green-600 text-white font-extrabold text-xl rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-70">
                                        {isSubmitting ? 'Saving...' : 'Finish Pickup'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* CUSTOM ITEM MODAL */}
            {showCustomModal && (
                <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 pb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-up">
                        <button onClick={() => setShowCustomModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full"><FaTimes /></button>
                        <h3 className="text-2xl font-extrabold text-gray-900 mb-6">Add Custom Scrap</h3>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Item Name</label>
                                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Copper Wire" className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 focus:ring-0" />
                            </div>
                            <div>
                                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Rate / Price (₹)</label>
                                <input type="number" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="e.g. 50" className="w-full mt-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:border-blue-500 focus:ring-0" />
                            </div>
                        </div>

                        <button onClick={handleAddCustom} className="w-full py-4 bg-blue-600 text-white font-extrabold text-xl rounded-xl shadow-lg active:scale-95">
                            Add to Bill
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Process;