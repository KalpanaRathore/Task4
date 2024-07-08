import React, { useState } from 'react';
import axios from 'axios';

const Upload = () => {
    const [email, setEmail] = useState('');
    const [otp, setOTP] = useState('');
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');

    const sendOTP = async () => {
        try {
            const response = await axios.post('http://localhost:5000/api/sendOTP', { email });
            setMessage(response.data.message);
        } catch (error) {
            setMessage(error.response.data.error);
        }
    };

    const uploadAudio = async () => {
        if (!file) {
            setMessage('Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('email', email);
        formData.append('otp', otp);
        formData.append('audio', file);

        try {
            const response = await axios.post('http://localhost:5000/api/uploadAudio', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage(response.data.message);
        } catch (error) {
            setMessage(error.response.data.error);
        }
    };

    return (
        <div>
            <h1>Upload Audio</h1>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <button onClick={sendOTP}>Send OTP</button>
            <input type="text" value={otp} onChange={(e) => setOTP(e.target.value)} placeholder="OTP" />
            <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={uploadAudio}>Upload</button>
            <p>{message}</p>
        </div>
    );
};

export default Upload;
