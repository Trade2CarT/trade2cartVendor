// src/pages/RegisterForm.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../firebase'; // Import your db instance
import { ref, set } from 'firebase/database'; // Import Firebase functions

const RegisterForm = () => {
    const { state } = useLocation();
    const { uid, phone } = state || {}; // Get UID and phone from OtpPage
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '', location: '', aadhaar: '', pan: '', license: '',
    });

    const handleInput = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // NOTE: Storing images in the database is not recommended for production.
    // Use Firebase Storage instead for better performance and scalability.

    const handleSubmit = async () => {
        if (!uid) return toast.error("Authentication error. Please restart login.");
        if (!form.name || !form.location || !form.aadhaar || !form.pan) {
            return toast.info('Please fill all required fields.');
        }

        try {
            const formDataForFirebase = {
                ...form,
                phone,
                status: 'pending', // Default status for new vendors
                createdAt: new Date().toISOString(),
            };

            // Securely write data to the path 'vendors/USER_ID'
            await set(ref(db, 'vendors/' + uid), formDataForFirebase);

            toast.success('Registered successfully! Your application is under review.');
            navigate('/dashboard', { state: { user: formDataForFirebase } });
        } catch (err) {
            toast.error('Submission failed. Please try again.');
            console.error(err);
        }
    };

    return (
        <div className="login-container">
            <h2>Become a Partner</h2>
            <p>Please provide your details to get started.</p>
            <input name="name" placeholder="Full Name" onChange={handleInput} />
            <input name="location" placeholder="Location (City, State)" onChange={handleInput} />
            <input name="aadhaar" placeholder="Aadhaar Number" onChange={handleInput} />
            <input name="pan" placeholder="PAN Card Number" onChange={handleInput} />
            <input name="license" placeholder="Driving License No." onChange={handleInput} />
            <button onClick={handleSubmit}>Submit for Verification</button>
        </div>
    );
};

export default RegisterForm;