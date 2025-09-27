import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get, onValue, push, update } from 'firebase/database';
import { db, auth } from '../firebase';
import { FaPlus, FaMinus, FaTrash, FaUser, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
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

    // State for the new UI
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
                    if (vendorSnapshot.exists()) {
                        setVendor(vendorSnapshot.val());
                    }
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
                    if (userSnapshot.exists()) {
                        setCustomer(userSnapshot.val());
                    }
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

        if (isSearchFocused && !searchTerm) {
            return itemsInLocation; // Show all items on focus
        }

        if (searchTerm) {
            return itemsInLocation.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return []; // Return empty if not focused and no search term
    }, [searchTerm, masterItems, vendor, isSearchFocused]);


    const handleUpdateQuantity = (billItemId, newQuantity) => {
        setBillItems(prevItems => {
            if (newQuantity < 1) {
                // Remove item if quantity becomes 0 or less
                return prevItems.filter(item => item.billItemId !== billItemId);
            }
            return prevItems.map(item => {
                if (item.billItemId === billItemId) {
                    return {
                        ...item,
                        weight: newQuantity,
                        total: (parseFloat(item.rate) || 0) * newQuantity,
                    };
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
                weight: 1, // Default quantity
                total: (parseFloat(item.rate) || 0) * 1,
            };
            setBillItems(prev => [...prev, newBillItem]);
            toast.success(`${item.name} added to bill.`);
        }
        setSearchTerm('');
    };

    const handleRemoveItem = (billItemId) => {
        setBillItems(prev => prev.filter(item => item.billItemId !== billItemId));
    };

    const totalBill = useMemo(() => {
        return billItems.reduce((acc, item) => acc + (item.total || 0), 0);
    }, [billItems]);

    const handleCalculateBill = () => {
        if (billItems.length === 0) {
            return toast.error("Please add at least one item to the bill.");
        }
        setBillCalculated(true);
        toast.success("Total calculated. Please confirm to complete.");
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
            toast.success("Bill saved and order completed!");
            navigate('/dashboard');
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || !assignment || !customer || !vendor) {
        return <Loader fullscreen />;
    }

    return (
        <>
            <SEO title={`Process Order - ${assignmentId.slice(-6)}`} description="Generate bill for the customer and complete the scrap pickup order." />
            <div className="p-4 md:p-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6">Generate Bill</h1>

                    <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Customer Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-3"><FaUser className="text-gray-400" /> <span>{customer.name || 'N/A'}</span></div>
                            <div className="flex items-center gap-3"><FaPhoneAlt className="text-gray-400" /> <span>{customer.phone}</span></div>
                            <div className="flex items-center gap-3 col-span-full"><FaMapMarkerAlt className="text-gray-400" /> <span>{customer.address || 'No address provided'}</span></div>
                        </div>
                    </div>

                    {!billCalculated && (
                        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                            <h2 className="text-lg font-semibold text-gray-700 mb-3">Add Item</h2>
                            <div className="relative">
                                <label className="text-xs font-medium text-gray-600">Search Item</label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                    placeholder="Click to see items or type to search..."
                                    className="w-full mt-1 p-2 border rounded-md"
                                    disabled={billCalculated}
                                />
                                {isSearchFocused && searchResults.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                                        {searchResults.map(item => (
                                            <li key={item.id} onMouseDown={() => handleAddItem(item)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                                                {item.name} (₹{item.rate}/{item.unit})
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}


                    {billItems.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-md">
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">Bill Summary</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="p-2">Item</th>
                                            <th className="p-2 text-center">Quantity</th>
                                            <th className="p-2 text-right">Rate</th>
                                            <th className="p-2 text-right">Total</th>
                                            <th className="p-2 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {billItems.map((item) => (
                                            <tr key={item.billItemId} className="border-t">
                                                <td className="p-2 font-medium text-gray-800">{item.name}</td>
                                                <td className="p-2 text-center text-gray-600">
                                                    {!billCalculated ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => handleUpdateQuantity(item.billItemId, item.weight - 1)} className="w-7 h-7 border rounded-full flex items-center justify-center text-lg text-red-500 hover:bg-red-50">-</button>
                                                            <span className="font-semibold w-12 text-center">{item.weight} {item.unit}</span>
                                                            <button onClick={() => handleUpdateQuantity(item.billItemId, item.weight + 1)} className="w-7 h-7 border rounded-full flex items-center justify-center text-lg text-green-600 hover:bg-green-50">+</button>
                                                        </div>
                                                    ) : (
                                                        <span>{item.weight} {item.unit}</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right text-gray-600">₹{parseFloat(item.rate).toFixed(2)}</td>
                                                <td className="p-2 text-right font-semibold text-gray-800">₹{item.total.toFixed(2)}</td>
                                                <td className="p-2 text-center">
                                                    {!billCalculated && (
                                                        <button onClick={() => handleRemoveItem(item.billItemId)} className="text-gray-400 hover:text-red-500">
                                                            <FaTrash />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 p-4 bg-green-100 border-t-4 border-green-500 rounded-b-lg flex justify-between items-center">
                        <span className="text-xl font-bold text-green-800">Total Bill</span>
                        <span className="text-2xl font-bold text-green-800">₹{totalBill.toFixed(2)}</span>
                    </div>
                    {!billCalculated ? (
                        <div className="mt-6 flex gap-4">
                            <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400">Cancel</button>
                            <button onClick={handleCalculateBill} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                                Calculate Total
                            </button>
                        </div>
                    ) : (
                        <div className="mt-6 flex gap-4">
                            <button onClick={() => setBillCalculated(false)} disabled={isSubmitting} className="w-full py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400">Edit</button>
                            <button onClick={handleSubmitBill} disabled={isSubmitting} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                {isSubmitting ? 'Saving...' : 'Confirm & Complete Order'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Process;