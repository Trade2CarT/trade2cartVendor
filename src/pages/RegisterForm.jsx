import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ref as dbRef, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '/src/firebase';
import { FaUser, FaMapMarkerAlt, FaIdCard, FaFileUpload, FaExclamationCircle } from 'react-icons/fa';
// import Loader from '/src/components/Loader';
import SEO from '/src/components/SEO';
import Loader from './Loader';

// --- Reusable File Input Component with Validation ---
const FileInput = ({ label, icon, onChange, fileName, error, accept }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <label htmlFor={label} className={`w-full flex items-center gap-3 px-4 py-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 ${error ? 'border-red-500' : 'border-gray-300'}`}>
            {icon}
            <span className={`truncate ${fileName ? 'text-gray-800' : 'text-gray-500'}`}>{fileName || 'Choose a file...'}</span>
        </label>
        <input id={label} type="file" className="hidden" accept={accept} onChange={onChange} />
        {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><FaExclamationCircle /> {error}</p>}
    </div>
);

// --- Reusable Text Input with Validation ---
const TextInput = ({ name, placeholder, value, onChange, error, icon, maxLength, pattern }) => (
    <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
            type="text"
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            maxLength={maxLength}
            pattern={pattern}
            className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 ${error ? 'border-red-500 ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
            required
        />
        {error && <p className="text-xs text-red-600 mt-1 pl-1">{error}</p>}
    </div>
);

const LoaderOverlay = () => (
    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-2xl z-10">
        <Loader />
    </div>
);

const RegisterForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', location: '', address: '', aadhaar: '', pan: '', license: '' });
    const [files, setFiles] = useState({ profilePhoto: null, aadhaarPhoto: null, panPhoto: null, licensePhoto: null });
    const [formErrors, setFormErrors] = useState({});
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    // --- Fetch locations from DB on component mount ---
    useEffect(() => {
        const fetchLocations = async () => {
            setIsFetching(true);
            try {
                // *** FIX: Changed 'locations' to 'location' to match your Firebase rules ***
                const locationsRef = dbRef(db, 'location');
                const snapshot = await get(locationsRef);
                if (snapshot.exists()) {
                    const locationsArray = snapshot.val();
                    setLocations(locationsArray);
                    if (locationsArray.length > 0) {
                        setFormData(prev => ({ ...prev, location: locationsArray[0] }));
                    }
                } else {
                    toast.error("Could not fetch locations. Please add them to the database.");
                    setLocations([]);
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

    // --- Validation Logic ---
    const validateField = (name, value) => {
        let error = '';
        switch (name) {
            case 'aadhaar':
                if (!/^\d{12}$/.test(value)) error = 'Aadhaar must be 12 digits.';
                break;
            case 'pan':
                if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) error = 'Invalid PAN format (e.g., ABCDE1234F).';
                break;
            case 'license':
                if (!/^[A-Z]{2}[ -]?[0-9]{2}[ -]?(?:[0-9]{4})?[0-9]{7}$/.test(value)) error = 'Invalid Driving License format.';
                break;
            default:
                break;
        }
        return error;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'pan') finalValue = value.toUpperCase();

        setFormData(prev => ({ ...prev, [name]: finalValue }));
        const error = validateField(name, finalValue);
        setFormErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleFileChange = (e, key) => {
        const file = e.target.files[0];
        const MAX_SIZE = 250 * 1024; // 250KB
        let error = '';

        if (!file) return;

        // File Size Check
        if (file.size > MAX_SIZE) {
            error = `File is too large (max 250KB).`;
        }

        // File Type Check
        if (!error) {
            if (key === 'profilePhoto') {
                if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                    error = 'Only JPG, JPEG, or PNG images are allowed.';
                }
            } else {
                if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
                    error = 'Only JPG, PNG, or PDF files are allowed.';
                }
            }
        }

        if (error) {
            toast.error(error);
            setFormErrors(prev => ({ ...prev, [key]: error }));
            setFiles(prev => ({ ...prev, [key]: null }));
            e.target.value = null; // Reset the file input
        } else {
            setFiles(prev => ({ ...prev, [key]: file }));
            setFormErrors(prev => ({ ...prev, [key]: '' }));
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
        // Final validation check
        const currentErrors = {};
        Object.keys(formData).forEach(name => {
            const error = validateField(name, formData[name]);
            if (error) currentErrors[name] = error;
        });

        if (Object.values(currentErrors).some(e => e) || Object.values(formErrors).some(e => e)) {
            return toast.error("Please fix the errors before submitting.");
        }

        if (Object.values(files).some(f => f === null)) {
            return toast.error("Please upload all required documents.");
        }

        setLoading(true);
        try {
            const getFileExtension = (fileName) => fileName.split('.').pop();

            const [profilePhotoURL, aadhaarPhotoURL, panPhotoURL, licensePhotoURL] = await Promise.all([
                uploadFile(files.profilePhoto, `vendors/${user.uid}/profile.${getFileExtension(files.profilePhoto.name)}`),
                uploadFile(files.aadhaarPhoto, `vendors/${user.uid}/aadhaar.${getFileExtension(files.aadhaarPhoto.name)}`),
                uploadFile(files.panPhoto, `vendors/${user.uid}/pan.${getFileExtension(files.panPhoto.name)}`),
                uploadFile(files.licensePhoto, `vendors/${user.uid}/license.${getFileExtension(files.licensePhoto.name)}`),
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
        return <Loader fullscreen />;
    }

    return (
        <>
            <SEO
                title="Join Trade2Cart as Vendor"
                description="Register as a vendor with Trade2Cart and receive free pickup leads from users. Connect directly with customers. Free vendor onboarding for first 6 months."
            />
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl relative">
                    {loading && <LoaderOverlay />}
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Become a Partner</h2>
                    <p className="text-center text-gray-500 mb-8">Provide your details for verification.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col items-center">
                            <label htmlFor="profilePhoto" className="cursor-pointer">
                                <img src={files.profilePhoto ? URL.createObjectURL(files.profilePhoto) : `https://ui-avatars.com/api/?name=${formData.name || 'P'}&background=0D8ABC&color=fff&size=96`} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                            </label>
                            <input id="profilePhoto" type="file" className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={(e) => handleFileChange(e, 'profilePhoto')} />
                            <p className="text-sm text-gray-500 mt-2">Tap to upload profile photo</p>
                            {formErrors.profilePhoto && <p className="text-xs text-red-600 mt-1">{formErrors.profilePhoto}</p>}
                        </div>

                        <TextInput name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} icon={<FaUser />} />

                        <div className="relative">
                            <FaMapMarkerAlt className="absolute left-3 top-4 text-gray-400" />
                            <textarea name="address" placeholder="Full Address" value={formData.address} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows="2" required />
                        </div>

                        <div className="relative">
                            <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select name="location" value={formData.location} onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white" required disabled={locations.length === 0}>
                                {locations.length > 0 ? (
                                    locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)
                                ) : (
                                    <option>Loading locations...</option>
                                )}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextInput name="aadhaar" placeholder="Aadhaar Number" value={formData.aadhaar} onChange={handleInputChange} error={formErrors.aadhaar} icon={<FaIdCard />} maxLength={12} />
                            <TextInput name="pan" placeholder="PAN Number" value={formData.pan} onChange={handleInputChange} error={formErrors.pan} icon={<FaIdCard />} maxLength={10} />
                        </div>
                        <TextInput name="license" placeholder="Driving License Number" value={formData.license} onChange={handleInputChange} error={formErrors.license} icon={<FaIdCard />} maxLength={20} />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <FileInput label="Aadhaar Photo" icon={<FaFileUpload className="text-blue-500" />} onChange={(e) => handleFileChange(e, 'aadhaarPhoto')} fileName={files.aadhaarPhoto?.name} error={formErrors.aadhaarPhoto} accept="image/png, image/jpeg, application/pdf" />
                            <FileInput label="PAN Photo" icon={<FaFileUpload className="text-green-500" />} onChange={(e) => handleFileChange(e, 'panPhoto')} fileName={files.panPhoto?.name} error={formErrors.panPhoto} accept="image/png, image/jpeg, application/pdf" />
                            <FileInput label="License Photo" icon={<FaFileUpload className="text-yellow-500" />} onChange={(e) => handleFileChange(e, 'licensePhoto')} fileName={files.licensePhoto?.name} error={formErrors.licensePhoto} accept="image/png, image/jpeg, application/pdf" />
                        </div>

                        <button type="submit" disabled={loading || isFetching} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {loading ? 'Submitting...' : 'Submit for Verification'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default RegisterForm;

