import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import Loader from '../pages/Loader';
import { FaTimes, FaRupeeSign } from 'react-icons/fa';

const TradePriceModal = ({ onClose, vendorLocation }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!vendorLocation) {
            setLoading(false);
            return;
        };

        const itemsRef = ref(db, 'items');
        const unsubscribe = onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const allItems = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                const filteredItems = allItems.filter(item => item.location?.toLowerCase() === vendorLocation.toLowerCase());
                setItems(filteredItems);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [vendorLocation]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Today's Trade Prices</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto p-4">
                    {loading ? (
                        <Loader />
                    ) : items.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No trade prices available for your location.</p>
                    ) : (
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Product Name</th>
                                    <th className="px-4 py-3 text-right">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-4 font-semibold text-right flex items-center justify-end gap-1">
                                            <FaRupeeSign size={12} />
                                            {parseFloat(item.rate).toFixed(2)} / {item.unit}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradePriceModal;