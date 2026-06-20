import React from "react";
import Loader from "./Loader";

const PendingPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
            <Loader />

            <h2 className="text-2xl font-bold mt-6 text-gray-800">
                Registration Submitted
            </h2>

            <p className="text-gray-600 text-center mt-2 max-w-md">
                Your documents have been uploaded successfully.
                <br />
                Please wait while our team verifies your account.
                You will be notified once approved.
            </p>
        </div>
    );
};

export default PendingPage;
