import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { useVendor } from '../App';
import SEO from '../components/SEO';
import ProcessedOrders from '../components/ProcessedOrders';
import Loader from './Loader';

const HistoryPage = () => {
    const { vendor } = useVendor();
    const [processedOrders, setProcessedOrders] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!vendor) return;

        const assignmentsQuery = query(ref(db, 'assignments'), orderByChild('vendorPhone'), equalTo(vendor.phone));
        const unsubscribeAssignments = onValue(assignmentsQuery, (snapshot) => {
            const data = snapshot.val();
            const allOrders = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setProcessedOrders(allOrders.filter(o => o.status === 'completed'));
            setLoading(false);
        });

        const usersRef = ref(db, 'users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            setUsersMap(snapshot.val() || {});
        });

        return () => {
            unsubscribeAssignments();
            unsubscribeUsers();
        };
    }, [vendor]);

    if (loading) return <Loader fullscreen />;

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <SEO title="Order History" />
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Completed Orders</h1>

            <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100">
                <ProcessedOrders processedOrders={processedOrders} usersMap={usersMap} />
            </div>
        </div>
    );
};

export default HistoryPage;