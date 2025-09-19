import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import Header from "../components/Header";
import SEO from "../components/SEO";

function Process() {
    const [masterItems, setMasterItems] = useState([]);
    const [items, setItems] = useState([]);
    const [billItems, setBillItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState("");
    const [weight, setWeight] = useState("");
    const [totalBill, setTotalBill] = useState(0);
    const [vendor, setVendor] = useState(null);
    const [userId, setUserId] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [assignmentID, setAssignmentID] = useState(null); // New state for assignment ID

    useEffect(() => {
        const fetchVendorData = onAuthStateChanged(auth, (user) => {
            if (user) {
                const vendorRef = ref(db, `vendors/${user.uid}`);
                onValue(vendorRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        setVendor(data);
                    }
                });
            } else {
                setVendor(null);
            }
        });

        return () => fetchVendorData();
    }, []);

    //fetches all items from the database
    useEffect(() => {
        const itemsRef = ref(db, "items");
        // Firebase listener
        const unsubscribe = onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const allItems = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                setMasterItems(allItems);
            } else {
                setMasterItems([]);
            }
        });

        // Cleanup function: This will detach the listener when the component unmounts
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (vendor && masterItems.length > 0) {
            const vendorLocation = vendor.location.toLowerCase();
            const filteredItems = masterItems.filter(
                (item) => item.location && item.location.toLowerCase() === vendorLocation
            );
            setItems(filteredItems);
        } else {
            setItems([]);
        }
    }, [vendor, masterItems]);

    const handleAddItem = () => {
        if (selectedItem && weight) {
            const item = items.find((i) => i.name === selectedItem);
            if (item) {
                const total = parseFloat(weight) * parseFloat(item.rate);
                const newBillItem = {
                    name: item.name,
                    weight: weight,
                    rate: item.rate,
                    total: total,
                };
                setBillItems([...billItems, newBillItem]);
                setTotalBill(totalBill + total);
                setSelectedItem("");
                setWeight("");
            }
        }
    };

    // New useEffect to find the assignment ID
    useEffect(() => {
        if (userId) {
            const assignmentsRef = ref(db, "assignments");
            const unsubscribe = onValue(assignmentsRef, (snapshot) => {
                const assignments = snapshot.val();
                let foundAssignmentID = null;
                for (const id in assignments) {
                    if (assignments[id].userId === userId && assignments[id].status === "assigned") {
                        foundAssignmentID = id;
                        break;
                    }
                }
                setAssignmentID(foundAssignmentID);
            });
            return () => unsubscribe();
        }
    }, [userId]);


    const handleSubmitBill = async () => {
        if (billItems.length > 0 && userId) {
            const billData = {
                userId: userId,
                vendorId: auth.currentUser.uid,
                mobile: mobileNumber,
                billItems: billItems,
                totalBill: totalBill,
                timestamp: new Date().toISOString(),
                assignmentID: assignmentID,
            };

            const newBillRef = push(ref(db, 'bills'));
            await set(newBillRef, billData);

            // Update the assignment status to 'processed'
            if (assignmentID) {
                const assignmentRef = ref(db, `assignments/${assignmentID}`);
                const updates = {};
                updates['status'] = 'processed';
                await update(assignmentRef, updates);
            }

            // Also update the waste entries' isAssigned status
            const wasteEntriesRef = ref(db, 'wasteEntries');
            const wasteSnapshot = await get(wasteEntriesRef);
            if (wasteSnapshot.exists()) {
                const updates = {};
                const assignment = (await get(ref(db, `assignments/${assignmentID}`))).val();
                if (assignment && assignment.entryIds) {
                    assignment.entryIds.forEach(entryId => {
                        updates[`${entryId}/isAssigned`] = false;
                    });
                    await update(wasteEntriesRef, updates);
                }
            }

            setShowConfirmation(true);
            setTimeout(() => {
                setShowConfirmation(false);
                setBillItems([]);
                setTotalBill(0);
                setUserId("");
                setMobileNumber("");
                setAssignmentID(null);
            }, 3000);
        } else {
            alert("Please add items to the bill and ensure a user is selected.");
        }
    };

    const handleUserSearch = () => {
        if (mobileNumber) {
            const usersRef = ref(db, "users");
            onValue(usersRef, (snapshot) => {
                const users = snapshot.val();
                const foundUser = Object.keys(users).find(
                    (key) => users[key].mobile === mobileNumber
                );
                if (foundUser) {
                    setUserId(foundUser);
                } else {
                    alert("User not found!");
                    setUserId("");
                }
            });
        }
    };

    return (
        <>
            <SEO
                title="Process Order - Trade2Cart Vendor"
                description="Process customer orders, weigh items, and generate bills for scrap collection."
                keywords="scrap collection, order processing, bill generation, trade2cart vendor"
            />
            <Header />
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">Process Order</h1>
                {vendor ? (
                    <div>
                        <div className="mb-4">
                            <label className="block mb-2">Customer Mobile Number</label>
                            <div className="flex">
                                <input
                                    type="text"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    className="border p-2 flex-grow"
                                    placeholder="Enter 10-digit mobile number"
                                />
                                <button
                                    onClick={handleUserSearch}
                                    className="bg-blue-500 text-white p-2 ml-2"
                                >
                                    Search
                                </button>
                            </div>
                            {userId && <p className="text-green-500">User found: {userId}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block mb-2">Item Name</label>
                                {items.length > 0 ? (
                                    <select
                                        value={selectedItem}
                                        onChange={(e) => setSelectedItem(e.target.value)}
                                        className="border p-2 w-full"
                                    >
                                        <option value="">Select an item</option>
                                        {items.map((item) => (
                                            <option key={item.id} value={item.name}>
                                                {item.name} ({item.rate}/{item.unit})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-red-500">No items available for your location.</p>
                                )}
                            </div>
                            <div>
                                <label className="block mb-2">Weight/Quantity</label>
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="border p-2 w-full"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddItem}
                            className="bg-green-500 text-white p-2 mb-4 w-full"
                        >
                            Add Item
                        </button>

                        <div>
                            <h2 className="text-xl font-bold mb-2">Bill Details</h2>
                            <table className="w-full border">
                                <thead>
                                    <tr>
                                        <th className="border p-2">Item Name</th>
                                        <th className="border p-2">Weight/Qty</th>
                                        <th className="border p-2">Rate</th>
                                        <th className="border p-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billItems.map((item, index) => (
                                        <tr key={index}>
                                            <td className="border p-2">{item.name}</td>
                                            <td className="border p-2">{item.weight}</td>
                                            <td className="border p-2">{item.rate}</td>
                                            <td className="border p-2">{item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="text-right font-bold text-xl mt-4">
                                Total Bill: ₹{totalBill.toFixed(2)}
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitBill}
                            className="bg-blue-500 text-white p-2 mt-4 w-full"
                        >
                            Submit Bill
                        </button>
                        {showConfirmation && (
                            <div className="mt-4 p-4 bg-green-200 text-green-800">
                                Bill submitted successfully!
                            </div>
                        )}
                    </div>
                ) : (
                    <p>Loading vendor details...</p>
                )}
            </div>
        </>
    );
}

export default Process;