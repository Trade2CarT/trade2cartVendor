import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db } from '../firebase';

import Header from '../components/Header';
import Footer from '../components/Footer';
import AssignedOrders from '../components/AssignedOrders';
import ProcessedOrders from '../components/ProcessedOrders';
import Loader from './Loader';
import SEO from '../components/SEO';

const firebaseObjectToArray = (data) =>
    data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];

const Dashboard = () => {
    const [vendor, setVendor] = useState(null);
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [processedOrders, setProcessedOrders] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [wasteEntriesMap, setWasteEntriesMap] = useState({});
    const [activeTab, setActiveTab] = useState('assigned');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const vendorRef = ref(db, `vendors/${user.uid}`);
                const unsubscribeVendor = onValue(vendorRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setVendor({ uid: user.uid, ...snapshot.val() });
                    } else {
                        setLoading(false);
                    }
                });
                return () => unsubscribeVendor();
            } else {
                setVendor(null);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!vendor) return;

        setLoading(true);

        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorPhone'), equalTo(vendor.phone));
        const usersRef = ref(db, 'users');
        const wasteEntriesRef = ref(db, 'wasteEntries');

        const unsubscribeAssignments = onValue(assignmentsQuery, (snapshot) => {
            const allOrders = firebaseObjectToArray(snapshot);
            setAssignedOrders(allOrders.filter(o => o.status === 'assigned'));
            setProcessedOrders(allOrders.filter(o => o.status === 'completed'));
        });

        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            setUsersMap(snapshot.val() || {});
        });

        const unsubscribeWaste = onValue(wasteEntriesRef, (snapshot) => {
            setWasteEntriesMap(snapshot.val() || {});
        });

        setLoading(false);

        return () => {
            unsubscribeAssignments();
            unsubscribeUsers();
            unsubscribeWaste();
        };
    }, [vendor]);

    if (loading || !vendor) {
        return <Loader fullscreen />;
    }

    const totalEarningsToday = processedOrders
        .filter(o => o.timestamp && new Date(o.timestamp).toDateString() === new Date().toDateString())
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const completedTodayCount = processedOrders.filter(o => o.timestamp && new Date(o.timestamp).toDateString() === new Date().toDateString()).length;

    return (
        <>
            <SEO title="Vendor Dashboard" description="Manage your assigned and processed scrap pickup orders." />
            <Header />
            <div className="p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome, {vendor.name}!</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Completed Today</p>
                                <p className="text-3xl font-bold text-gray-800">{completedTodayCount}</p>
                            </div>
                            <div className="text-green-500"><i className="fas fa-check-circle fa-2x"></i></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Earnings Today</p>
                                <p className="text-3xl font-bold text-gray-800">₹{totalEarningsToday.toFixed(2)}</p>
                            </div>
                            <div className="text-blue-500"><i className="fas fa-rupee-sign fa-2x"></i></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex gap-6 px-6">
                                <button
                                    onClick={() => setActiveTab('assigned')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'assigned' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    Assigned Orders ({assignedOrders.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('processed')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'processed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    Processed Orders ({processedOrders.length})
                                </button>
                            </nav>
                        </div>
                        <div className="p-4">
                            {activeTab === 'assigned' ? (
                                <AssignedOrders assignedOrders={assignedOrders} usersMap={usersMap} wasteEntriesMap={wasteEntriesMap} vendor={vendor} />
                            ) : (
                                <ProcessedOrders processedOrders={processedOrders} usersMap={usersMap} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Dashboard;