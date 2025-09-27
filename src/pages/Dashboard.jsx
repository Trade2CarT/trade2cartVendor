import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get } from 'firebase/database';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AssignedOrders from '../components/AssignedOrders';
import ProcessedOrders from '../components/ProcessedOrders';
import SEO from '../components/SEO';
import Loader from './Loader'; // Assuming Loader component exists
import { FaTimes, FaTag } from 'react-icons/fa';


// Modal Component for Today's Price List
const PriceListModal = ({ isOpen, onClose, items, vendorLocation }) => {
    if (!isOpen) return null;

    const itemsByLocation = items.filter(item => item.location === vendorLocation);

    const groupedItems = itemsByLocation.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Today's Price List - {vendorLocation}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100">
                        <FaTimes className="text-xl" />
                    </button>
                </header>
                <main className="overflow-y-auto p-6">
                    {Object.keys(groupedItems).length > 0 ? (
                        Object.keys(groupedItems).map(category => (
                            <div key={category} className="mb-6">
                                <h4 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">{category}</h4>
                                <ul className="space-y-2">
                                    {groupedItems[category].map(item => (
                                        <li key={item.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-50">
                                            <span className="text-gray-800 font-medium">{item.name}</span>
                                            <span className="font-bold text-green-600">₹{parseFloat(item.rate).toFixed(2)} / {item.unit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500">No items found for your location.</p>
                    )}
                </main>
            </div>
        </div>
    );
};


const Dashboard = () => {
    const [vendor, setVendor] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('assigned');
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [allItems, setAllItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const vendorRef = ref(db, `vendors/${user.uid}`);
                const vendorSnapshot = await get(vendorRef);
                if (vendorSnapshot.exists()) {
                    const vendorData = vendorSnapshot.val();
                    if (vendorData.status === 'approved') {
                        setVendor({ uid: user.uid, ...vendorData });
                    } else {
                        toast.error("Your account is not approved. Please contact support.");
                        navigate('/login');
                    }
                } else {
                    toast.error("Vendor profile not found. Please register.");
                    navigate('/register');
                }
            } else {
                navigate('/login');
            }
        });

        const itemsRef = ref(db, 'items');
        const unsubscribeItems = onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            const itemsArray = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setAllItems(itemsArray);
        });


        return () => {
            unsubscribeAuth();
            unsubscribeItems();
        };
    }, [navigate]);

    useEffect(() => {
        if (!vendor) return;

        const assignmentsRef = ref(db, 'assignments');
        const unsubscribeAssignments = onValue(assignmentsRef, (snapshot) => {
            const allAssignments = [];
            snapshot.forEach(childSnapshot => {
                const assignment = { id: childSnapshot.key, ...childSnapshot.val() };
                if (assignment.vendorId === vendor.uid) {
                    allAssignments.push(assignment);
                }
            });
            setAssignments(allAssignments.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt)));
            setLoading(false);
        });

        return () => unsubscribeAssignments();
    }, [vendor]);

    const assignedOrders = useMemo(() => assignments.filter(a => a.status === 'assigned'), [assignments]);
    const processedOrders = useMemo(() => assignments.filter(a => a.status === 'completed'), [assignments]);

    if (loading) {
        return <Loader fullscreen />;
    }

    return (
        <>
            <SEO
                title={`Dashboard - ${vendor?.name || 'Vendor'}`}
                description="View your assigned and completed scrap pickup orders."
            />
            <div className="min-h-screen bg-gray-100 flex flex-col">
                <Header vendorName={vendor?.name} />
                <main className="flex-grow p-4 md:p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <button onClick={() => setIsPriceModalOpen(true)} className="w-full flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                <FaTag /> Today's Price
                            </button>
                            <button onClick={() => toast.success("Data collection initiated!")} className="w-full flex-1 bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors">
                                Collect Data
                            </button>
                        </div>


                        <div className="bg-white rounded-xl shadow-md">
                            <div className="flex border-b">
                                <button
                                    onClick={() => setActiveTab('assigned')}
                                    className={`flex-1 p-3 font-semibold text-center ${activeTab === 'assigned' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                                >
                                    Assigned ({assignedOrders.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('processed')}
                                    className={`flex-1 p-3 font-semibold text-center ${activeTab === 'processed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                                >
                                    Processed ({processedOrders.length})
                                </button>
                            </div>
                            <div className="p-4">
                                {activeTab === 'assigned' ? <AssignedOrders orders={assignedOrders} /> : <ProcessedOrders orders={processedOrders} />}
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>

            <PriceListModal
                isOpen={isPriceModalOpen}
                onClose={() => setIsPriceModalOpen(false)}
                items={allItems}
                vendorLocation={vendor?.location}
            />

        </>
    );
};

export default Dashboard;