import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref, get, onValue, push, update } from 'firebase/database';
import { db } from './firebase';
import { FaPlus, FaTrash, FaUser, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';

// --- Main Process Component ---
const Process = () => {
    const navigate = useNavigate();
    const { assignmentId } = useParams(); // Get assignmentId from URL
    const { state } = useLocation();
    const vendorLocation = state?.vendorLocation;

    const [assignment, setAssignment] = useState(null);
    const [billItems, setBillItems] = useState([{ name: '', rate: '', weight: '', total: 0 }]);
    const [masterItems, setMasterItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch assignment details and master item list
    useEffect(() => {
        if (!assignmentId) {
            toast.error("No order specified.");
            navigate('/dashboard');
            return;
        }

        // 1. Fetch the specific assignment
        const assignmentRef = ref(db, `assignments/${assignmentId}`);
        get(assignmentRef).then(snapshot => {
            if (snapshot.exists()) {
                setAssignment({ id: snapshot.key, ...snapshot.val() });
            } else {
                toast.error("Order not found.");
                navigate('/dashboard');
            }
        });

        // 2. Fetch the master list of all items for autocompletion
        const itemsRef = ref(db, 'items');
        onValue(itemsRef, (snapshot) => {
            const items = [];
            snapshot.forEach(child => {
                items.push({ id: child.key, ...child.val() });
            });
            setMasterItems(items);
            setLoading(false);
        });

    }, [assignmentId, navigate]);

    const handleItemNameChange = (index, value) => {
        const newBillItems = [...billItems];
        newBillItems[index].name = value;

        // Auto-fill rate if item exists in master list for the vendor's location
        const matchedItem = masterItems.find(item => item.name.toLowerCase() === value.toLowerCase() && item.location.toLowerCase() === vendorLocation.toLowerCase());
        if (matchedItem) {
            newBillItems[index].rate = matchedItem.rate;
        }

        updateItemTotal(index, newBillItems);
    };

    const handleNumericChange = (index, field, value) => {
        const newBillItems = [...billItems];
        // Allow decimal values
        newBillItems[index][field] = value;
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
        const newBillItems = billItems.filter((_, i) => i !== index);
        setBillItems(newBillItems);
    };

    const totalBill = billItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);

    const handleSubmitBill = async () => {
        if (billItems.some(item => !item.name || !item.rate || !item.weight)) {
            return toast.error("Please fill all fields for each item.");
        }
        setLoading(true);

        try {
            // 1. Create a new bill record
            const newBillRef = push(ref(db, 'bills'));
            await set(newBillRef, {
                assignmentId,
                vendorId: assignment.vendorId,
                userId: assignment.userId,
                items: billItems,
                totalAmount: totalBill,
                createdAt: new Date().toISOString(),
            });

            // 2. Update the status of the assignment and the user
            const updates = {};
            updates[`/assignments/${assignmentId}/status`] = 'completed';
            updates[`/users/${assignment.userId}/Status`] = 'completed'; // Assuming user status is stored this way
            updates[`/users/${assignment.userId}/otp`] = null; // Clear the OTP

            await update(ref(db), updates);

            toast.success("Bill saved and order completed!");
            navigate('/dashboard');

        } catch (error) {
            console.error("Failed to submit bill:", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !assignment) {
        return <div className="flex items-center justify-center min-h-screen">Loading Order Details...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Generate Bill</h1>

                {/* Customer Info Card */}
                <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Customer Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-3"><FaUser className="text-gray-400" /> <span>{assignment.userName}</span></div>
                        <div className="flex items-center gap-3"><FaPhoneAlt className="text-gray-400" /> <span>{assignment.mobile}</span></div>
                        <div className="flex items-center gap-3 col-span-full"><FaMapMarkerAlt className="text-gray-400" /> <span>{assignment.userAddress}</span></div>
                    </div>
                </div>

                {/* Bill Items */}
                <div className="space-y-4">
                    {billItems.map((item, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl shadow-md relative">
                            {billItems.length > 1 && (
                                <button onClick={() => removeItem(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
                                    <FaTrash />
                                </button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-gray-600">Item Name</label>
                                    <input
                                        type="text"
                                        list="master-items"
                                        value={item.name}
                                        onChange={(e) => handleItemNameChange(index, e.target.value)}
                                        placeholder="e.g., Newspaper"
                                        className="w-full mt-1 p-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600">Rate (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={item.rate}
                                        onChange={(e) => handleNumericChange(index, 'rate', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full mt-1 p-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600">Weight/Unit</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={item.weight}
                                        onChange={(e) => handleNumericChange(index, 'weight', e.target.value)}
                                        placeholder="e.g., 1.5"
                                        className="w-full mt-1 p-2 border rounded-md"
                                    />
                                </div>
                            </div>
                            <p className="text-right font-semibold mt-2 text-gray-700">Item Total: ₹{item.total.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
                <datalist id="master-items">
                    {masterItems.map(item => <option key={item.id} value={item.name} />)}
                </datalist>

                <button onClick={addAnotherItem} className="flex items-center gap-2 text-blue-600 font-semibold mt-4 hover:underline">
                    <FaPlus size={12} /> Add Another Item
                </button>

                {/* Total and Actions */}
                <div className="mt-8 p-4 bg-green-100 border-t-4 border-green-500 rounded-b-lg flex justify-between items-center">
                    <span className="text-xl font-bold text-green-800">Total Bill</span>
                    <span className="text-2xl font-bold text-green-800">₹{totalBill.toFixed(2)}</span>
                </div>

                <div className="mt-6 flex gap-4">
                    <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400">Cancel</button>
                    <button onClick={handleSubmitBill} disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                        {loading ? 'Saving...' : 'Save Bill & Complete Order'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Process;
