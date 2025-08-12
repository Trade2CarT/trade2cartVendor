import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref as dbRef, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { FaUser, FaMapMarkerAlt, FaIdCard, FaFileUpload } from 'react-icons/fa';
import Loader from './Loader'; // Assuming you have a Loader component

const FileInput = ({ label, icon, onChange, fileName }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <label htmlFor={label} className="w-full flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            {icon}
            <span className="text-gray-600 truncate">{fileName || 'Choose a file...'}</span>
        </label>
        <input id={label} type="file" className="hidden" accept="image/*" onChange={onChange} />
    </div>
);

const LoaderOverlay = () => (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-2xl z-10">
        <Loader />
    </div>
);

const RegisterForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        address: '',
        aadhaar: '',
        pan: '',
        license: '',
    });
    const [files, setFiles] = useState({
        profilePhoto: null,
        aadhaarPhoto: null,
        panPhoto: null,
        licensePhoto: null,
    });
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    // --- IMPLEMENTATION START: Fetch locations from DB on component mount ---
    useEffect(() => {
        const fetchLocations = async () => {
            setIsFetching(true);
            try {
                const locationsRef = dbRef(db, 'locations');
                const snapshot = await get(locationsRef);
                if (snapshot.exists()) {
                    const locationsArray = snapshot.val();
                    setLocations(locationsArray);
                    // Set default location to the first one from the DB
                    if (locationsArray.length > 0) {
                        setFormData(prev => ({ ...prev, location: locationsArray[0] }));
                    }
                } else {
                    toast.error("Could not fetch locations. Please add them to the database.");
                    setLocations([]); // Fallback to an empty array
                }
            } catch (error) {
                toast.error("Error fetching locations.");
                console.error("Error fetching locations:", error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchLocations();
    }, []);
    // --- IMPLEMENTATION END ---

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e, key) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 200 * 1024) { // 200KB limit
                toast.error(`'${file.name}' is too large. Please upload files under 200KB.`);
                return;
            }
            setFiles(prev => ({ ...prev, [key]: file }));
        }
    };

    const uploadFile = async (file, path) => {
        if (!file) return null;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            toast.error("Authentication error. Please log in again.");
            return navigate('/');
        }
        if (!formData.name || !formData.address || !formData.aadhaar || !formData.pan || !formData.license) {
            return toast.error("Please fill all text fields.");
        }
        if (!files.profilePhoto || !files.aadhaarPhoto || !files.panPhoto || !files.licensePhoto) {
            return toast.error("Please upload all required documents.");
        }

        setLoading(true);
        try {
            const [profilePhotoURL, aadhaarPhotoURL, panPhotoURL, licensePhotoURL] = await Promise.all([
                uploadFile(files.profilePhoto, `vendors/${user.uid}/profile.jpg`),
                uploadFile(files.aadhaarPhoto, `vendors/${user.uid}/aadhaar.jpg`),
                uploadFile(files.panPhoto, `vendors/${user.uid}/pan.jpg`),
                uploadFile(files.licensePhoto, `vendors/${user.uid}/license.jpg`),
            ]);

            const vendorData = { ...formData, uid: user.uid, phone: user.phoneNumber, status: 'pending', createdAt: new Date().toISOString(), profilePhotoURL, aadhaarPhotoURL, panPhotoURL, licensePhotoURL };
            await set(dbRef(db, `vendors/${user.uid}`), vendorData);
            toast.success('Registration submitted for verification!');
            navigate('/dashboard');
        } catch (error) {
            console.error("Registration Error:", error);
            toast.error("Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (isFetching) {
        return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><Loader /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl relative">
                {loading && <LoaderOverlay />}
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Become a Partner</h2>
                <p className="text-center text-gray-500 mb-8">Provide your details for verification.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center">
                        <label htmlFor="profilePhoto" className="cursor-pointer">
                            <img src={files.profilePhoto ? URL.createObjectURL(files.profilePhoto) : `https://ui-avatars.com/api/?name=${formData.name || 'P'}&background=0D8ABC&color=fff&size=96`} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                        </label>
                        <input id="profilePhoto" type="file" className="hidden" onChange={(e) => handleFileChange(e, 'profilePhoto')} />
                        <p className="text-sm text-gray-500 mt-2">Tap to upload profile photo</p>
                    </div>

                    {/* Name Input */}
                    <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                    </div>

                    {/* Address Textarea */}
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-4 text-gray-400" />
                        <textarea name="address" placeholder="Full Address" value={formData.address} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows="2" required />
                    </div>

                    {/* --- IMPLEMENTATION: Dynamic Location Dropdown --- */}
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select name="location" value={formData.location} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white" required disabled={locations.length === 0}>
                            {locations.length > 0 ? (
                                locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)
                            ) : (
                                <option>No locations found...</option>
                            )}
                        </select>
                    </div>

                    {/* Document Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" name="aadhaar" placeholder="Aadhaar Number" value={formData.aadhaar} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div className="relative">
                            <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" name="pan" placeholder="PAN Number" value={formData.pan} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                        </div>
                    </div>
                    <div className="relative">
                        <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" name="license" placeholder="Driving License Number" value={formData.license} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                    </div>

                    {/* File Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FileInput label="Aadhaar Photo" icon={<FaFileUpload className="text-blue-500" />} onChange={(e) => handleFileChange(e, 'aadhaarPhoto')} fileName={files.aadhaarPhoto?.name} />
                        <FileInput label="PAN Photo" icon={<FaFileUpload className="text-green-500" />} onChange={(e) => handleFileChange(e, 'panPhoto')} fileName={files.panPhoto?.name} />
                        <FileInput label="License Photo" icon={<FaFileUpload className="text-yellow-500" />} onChange={(e) => handleFileChange(e, 'licensePhoto')} fileName={files.licensePhoto?.name} />
                    </div>

                    <button type="submit" disabled={loading || isFetching} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {loading ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterForm;