import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

const ProcessedOrders = ({ processedOrders, usersMap }) => {

    // Group orders by user for a consolidated view
    const groupedOrders = processedOrders.reduce((acc, order) => {
        const key = order.userId || order.mobile;
        if (!acc[key]) {
            acc[key] = { ...order, productsList: [] };
        }
        acc[key].productsList.push(order.products);
        return acc;
    }, {});
    const groupedList = Object.values(groupedOrders);

    return (
        <div className="overflow-x-auto">
            {groupedList.length === 0 ? (
                <p className="text-center text-gray-500 py-8">You have no completed orders yet.</p>
            ) : (
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Total Amount</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedList.map(order => (
                            <tr key={order.id} className="bg-white border-b">
                                <td className="px-4 py-4 font-medium text-gray-900">{usersMap[order.userId]?.name || 'N/A'}</td>
                                <td className="px-4 py-4 font-semibold">₹{order.totalAmount?.toFixed(2) || '0.00'}</td>
                                <td className="px-4 py-4">
                                    <span className="flex items-center gap-2 text-green-600">
                                        <FaCheckCircle /> Completed
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ProcessedOrders;