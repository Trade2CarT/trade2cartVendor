import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get, onValue, push, update } from 'firebase/database';
import { db } from '../firebase';
import { useVendor } from '../App'; // <-- Import the useVendor hook
import { FaPlus, FaTrash, FaUser, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
import Loader from './Loader';
import SEO from '../components/SEO';

const Process = () => {
    const navigate = useNavigate();
    const { assignmentId } = useParams();
    const vendor = useVendor(); // <-- Get vendor data directly from context

    const [assignment, setAssignment] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [billItems, setBillItems] = useState([{ name: '', rate: '', weight: '', total: 0 }]);
    const [masterItems, setMasterItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
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
                const assignmentRef = ref(db, `assignments/${assignmentId}`);
                const assignmentSnapshot = await get(assignmentRef);
                if (!assignmentSnapshot.exists()) {
                    toast.error("Order not found.");
                    return navigate('/dashboard');
                }
                const assignmentData = { id: assignmentSnapshot.key, ...assignmentSnapshot.val() };
                setAssignment(assignmentData);

                if (assignmentData.userId) {
                    const userRef = ref(db, `users/${assignmentData.userId}`);
                    const userSnapshot = await get(userRef);
                    if (userSnapshot.exists()) setCustomer(userSnapshot.val());
                }

                const itemsRef = ref(db, 'items');
                onValue(itemsRef, (snapshot) => {
                    const itemsData = [];
                    snapshot.forEach(child => itemsData.push({ id: child.key, ...child.val() }));
                    setMasterItems(itemsData);
                });

            } catch (error) {
                toast.error("Failed to load initial order data.");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [assignmentId, navigate]);

    useEffect(() => {
        if (masterItems.length > 0 && vendor?.location) {
            const vendorLocation = vendor.location.toLowerCase();
            const filtered = masterItems.filter(
                item => item.location && item.location.toLowerCase() === vendorLocation
            );
            setFilteredItems(filtered);
        }
    }, [masterItems, vendor]);

    const handleItemSelection = (index, selectedItemName) => {
        const newBillItems = [...billItems];
        if (!selectedItemName) {
            newBillItems[index] = { name: '', rate: '', weight: '', total: 0 };
            setBillItems(newBillItems);
            return;
        }
        const matchedItem = filteredItems.find(item => item.name === selectedItemName);
        if (matchedItem) {
            newBillItems[index].name = matchedItem.name;
            newBillItems[index].rate = matchedItem.rate;
        }
        updateItemTotal(index, newBillItems);
    };

    const handleWeightChange = (index, value) => {
        const newBillItems = [...billItems];
        newBillItems[index].weight = value;
        updateItemTotal(index, newBillItems);
    };

    const updateItemTotal = (index, items) => {
        const rate = parseFloat(items[index].rate) || 0;
        const weight = parseFloat(items[index].weight) || 0;
        items[index].total = rate * weight;
        setBillItems(items);
    };

    const addAnotherItem = () => {
        setBillItems([...billItems, { name: '', rate: '', weight: '', total: 0 }]);
    };

    const removeItem = (index) => {
        setBillItems(billItems.filter((_, i) => i !== index));
    };

    const totalBill = billItems.reduce((acc, item) => acc + (item.total || 0), 0);

    const handleCalculateBill = () => {
        if (billItems.some(item => !item.name || !item.rate || !item.weight || parseFloat(item.rate) <= 0 || parseFloat(item.weight) <= 0)) {
            return toast.error("Please fill all fields for each item with valid numbers.");
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
                billItems: billItems.map(({ ...item }) => item),
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
            console.error("Failed to submit bill:", error);
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
            <div className="p-4 md:p-8">
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

                    <div className="space-y-4">
                        {billItems.map((item, index) => (
                            <div key={index} className="bg-white p-4 rounded-xl shadow-md relative">
                                {billItems.length > 1 && !billCalculated && (
                                    <button onClick={() => removeItem(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
                                        <FaTrash />
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-gray-600">Item Name</label>
                                        <select
                                            value={item.name}
                                            onChange={(e) => handleItemSelection(index, e.target.value)}
                                            className="w-full mt-1 p-2 border rounded-md bg-white"
                                            disabled={billCalculated}
                                        >
                                            <option value="">-- Select an item --</option>
                                            {filteredItems.map(filteredItem => (
                                                <option key={filteredItem.id} value={filteredItem.name}>
                                                    {filteredItem.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">Rate (₹)</label>
                                        <input
                                            type="number"
                                            value={item.rate}
                                            placeholder="0.00"
                                            className="w-full mt-1 p-2 border rounded-md bg-gray-100"
                                            readOnly
                                            disabled={billCalculated}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">Weight/Unit</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={item.weight}
                                            onChange={(e) => handleWeightChange(index, e.target.value)}
                                            placeholder="e.g., 1.5"
                                            className="w-full mt-1 p-2 border rounded-md"
                                            disabled={billCalculated}
                                        />
                                    </div>
                                </div>
                                <p className="text-right font-semibold mt-2 text-gray-700">Item Total: ₹{item.total.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    {!billCalculated &&
                        <button onClick={addAnotherItem} className="flex items-center gap-2 text-blue-600 font-semibold mt-4 hover:underline">
                            <FaPlus size={12} /> Add Another Item
                        </button>
                    }

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