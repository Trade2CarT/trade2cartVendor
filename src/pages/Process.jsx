import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get, onValue, push, update } from 'firebase/database';
import { db, auth } from '../firebase';
import { FaPlus, FaMinus, FaTrash, FaUser, FaMapMarkerAlt, FaPhoneAlt, FaSearch } from 'react-icons/fa';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [billCalculated, setBillCalculated] = useState(false);

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
            } finally {
                setLoading(false);
            }
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

    const searchResults = useMemo(() => {
        const vendorLocation = vendor?.location?.toLowerCase();
        if (!vendorLocation) return [];
        const itemsInLocation = masterItems.filter(item => item.location?.toLowerCase() === vendorLocation);

        if (isSearchFocused && !searchTerm) return itemsInLocation;
        if (searchTerm) return itemsInLocation.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return [];
    }, [searchTerm, masterItems, vendor, isSearchFocused]);

    const handleUpdateQuantity = (billItemId, newQuantity) => {
        setBillItems(prevItems => {
            if (newQuantity < 1) return prevItems.filter(item => item.billItemId !== billItemId);
            return prevItems.map(item => {
                if (item.billItemId === billItemId) {
                    return { ...item, weight: newQuantity, total: (parseFloat(item.rate) || 0) * newQuantity };
                }
                return item;
            });
        });
    };

    const handleAddItem = (item) => {
        if (!item) return;
        const existingItem = billItems.find(billItem => billItem.id === item.id);

        if (existingItem) {
            handleUpdateQuantity(existingItem.billItemId, existingItem.weight + 1);
            toast.success(`${item.name} quantity increased.`);
        } else {
            const newBillItem = {
                ...item,
                billItemId: `${item.id}-${Date.now()}`,
                weight: 1,
                total: (parseFloat(item.rate) || 0) * 1,
            };
            setBillItems(prev => [...prev, newBillItem]);
            toast.success(`${item.name} added to bill.`);
        }
        setSearchTerm('');
        setIsSearchFocused(false);
    };

    const handleRemoveItem = (billItemId) => {
        setBillItems(prev => prev.filter(item => item.billItemId !== billItemId));
    };

    const totalBill = useMemo(() => billItems.reduce((acc, item) => acc + (item.total || 0), 0), [billItems]);

    const handleCalculateBill = () => {
        if (billItems.length === 0) return toast.error("Please add at least one item.");
        setBillCalculated(true);
    };

    const handleSubmitBill = async () => {
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
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || !assignment || !customer || !vendor) return <Loader fullscreen />;

    return (
        <>
            <SEO title={`Process Order - ${assignmentId.slice(-6)}`} />
            <div className="pb-32 bg-gray-50 min-h-screen">

                {/* Header Section */}
                <div className="bg-blue-600 text-white p-6 pt-8 rounded-b-3xl shadow-md mb-6">
                    <h1 className="text-2xl font-extrabold mb-1">Process Pickup</h1>
                    <p className="text-blue-100 font-medium text-sm">Order ID: #{assignmentId.slice(-6).toUpperCase()}</p>
                </div>

                <div className="max-w-2xl mx-auto px-4 space-y-6">

                    {/* Customer Card */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-4">Customer Details</h2>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4 text-gray-800 font-bold">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><FaUser /></div>
                                <span className="text-lg">{customer.name || 'N/A'}</span>
                            </div>
                            <a href={`tel:${customer.phone}`} className="flex items-center gap-4 text-gray-700 hover:text-blue-600 font-semibold">
                                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center"><FaPhoneAlt /></div>
                                <span>{customer.phone}</span>
                            </a>
                            <div className="flex items-start gap-4 text-gray-600 font-medium mt-1">
                                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center flex-shrink-0"><FaMapMarkerAlt /></div>
                                <span className="mt-2">{customer.address || 'No address provided'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Search & Add Items */}
                    {!billCalculated && (
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative z-20">
                            <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">Add Scrap Items</h2>
                            <div className="relative">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    placeholder="Search items (e.g., Iron, Plastic)..."
                                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-800 text-lg placeholder-gray-400"
                                />
                                {isSearchFocused && searchResults.length > 0 && (
                                    <div className="absolute w-full bg-white border border-gray-200 rounded-xl mt-2 max-h-60 overflow-y-auto shadow-xl z-50 divide-y divide-gray-100">
                                        {searchResults.map(item => (
                                            <div key={item.id} onMouseDown={() => handleAddItem(item)} className="px-5 py-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                                                <span className="font-bold text-gray-800 text-lg">{item.name}</span>
                                                <span className="font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">₹{item.rate} / {item.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Cart/Bill Summary using Mobile Cards instead of Table */}
                    {billItems.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50">
                                <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider">Bill Summary</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {billItems.map((item) => (
                                    <div key={item.billItemId} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">

                                        {/* Item Info */}
                                        <div className="flex-1">
                                            <h4 className="font-extrabold text-xl text-gray-900">{item.name}</h4>
                                            <p className="text-gray-500 font-semibold text-sm mt-1">Rate: ₹{parseFloat(item.rate).toFixed(2)} / {item.unit}</p>
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center justify-between sm:justify-end gap-6">
                                            {!billCalculated ? (
                                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
                                                    <button onClick={() => handleUpdateQuantity(item.billItemId, item.weight - 1)} className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                                                        {item.weight <= 1 ? <FaTrash size={14} /> : <FaMinus size={14} />}
                                                    </button>
                                                    <span className="font-extrabold text-lg w-12 text-center text-gray-900">{item.weight}</span>
                                                    <button onClick={() => handleUpdateQuantity(item.billItemId, item.weight + 1)} className="w-10 h-10 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                                                        <FaPlus size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-2 bg-gray-100 rounded-xl">
                                                    <span className="font-extrabold text-gray-700">{item.weight} {item.unit}</span>
                                                </div>
                                            )}

                                            {/* Item Total */}
                                            <div className="text-right min-w-[80px]">
                                                <span className="block text-xs font-bold text-gray-400 uppercase mb-1">Total</span>
                                                <span className="font-extrabold text-xl text-gray-900">₹{item.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Bottom Checkout Bar */}
                {billItems.length > 0 && (
                    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] p-4 sm:p-6 z-40 pb-safe">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-gray-500 font-extrabold uppercase tracking-widest text-sm">Grand Total</span>
                                <span className="text-4xl font-extrabold text-green-600">₹{totalBill.toFixed(2)}</span>
                            </div>

                            {!billCalculated ? (
                                <button onClick={handleCalculateBill} className="w-full py-4 bg-blue-600 text-white font-extrabold text-xl rounded-xl shadow-lg active:scale-95 transition-transform">
                                    Confirm Bill Amount
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button onClick={() => setBillCalculated(false)} disabled={isSubmitting} className="flex-1 py-4 bg-gray-100 text-gray-800 font-extrabold text-lg rounded-xl active:bg-gray-200 transition-colors">
                                        Edit
                                    </button>
                                    <button onClick={handleSubmitBill} disabled={isSubmitting} className="flex-[2] py-4 bg-green-600 text-white font-extrabold text-xl rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100">
                                        {isSubmitting ? 'Saving...' : 'Finish Pickup'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Process;