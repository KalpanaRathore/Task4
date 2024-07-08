const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Schema for OTP
const OTPSchema = new mongoose.Schema({
    email: String,
    otp: String,
    createdAt: { type: Date, default: Date.now, expires: 300 } // OTP expires in 5 minutes
});

const OTP = mongoose.model('OTP', OTPSchema);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Multer setup for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Endpoint to send OTP
app.post('/api/sendOTP', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({ email, otp });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP for audio upload',
        text: `Your OTP is ${otp}. It will expire in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ message: 'OTP sent' });
    });
});

// Endpoint to upload audio
app.post('/api/uploadAudio', upload.single('audio'), async (req, res) => {
    const { email, otp } = req.body;
    const { path: audioPath, mimetype, size } = req.file;

    const currentHour = new Date().getUTCHours() + 5.5; // Convert to IST
    if (currentHour < 14 || currentHour >= 19) {
        fs.unlinkSync(audioPath); // Delete the uploaded file
        return res.status(400).json({ error: 'Uploads are allowed only between 2 PM and 7 PM IST' });
    }

    const validOTP = await OTP.findOne({ email, otp });
    if (!validOTP) {
        fs.unlinkSync(audioPath); // Delete the uploaded file
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    const audioDuration = await getAudioDuration(audioPath); // Implement this function to get audio duration
    if (audioDuration > 300 || size > 100 * 1024 * 1024) {
        fs.unlinkSync(audioPath); // Delete the uploaded file
        return res.status(400).json({ error: 'Audio length should not exceed 5 minutes and size should not exceed 100MB' });
    }

    try {
        const mediaResponse = await axios.post(
            'https://upload.twitter.com/1.1/media/upload.json',
            { media: fs.readFileSync(audioPath) },
            { headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` } }
        );

        const mediaId = mediaResponse.data.media_id_string;

        const tweetResponse = await axios.post(
            'https://api.twitter.com/1.1/statuses/update.json',
            { status: 'Here is my audio tweet', media_ids: mediaId },
            { headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` } }
        );

        fs.unlinkSync(audioPath); // Delete the uploaded file after posting
        res.json({ message: 'Audio uploaded successfully', tweet: tweetResponse.data });
    } catch (error) {
        fs.unlinkSync(audioPath); // Delete the uploaded file
        res.status(500).json({ error: error.message });
    }
});

// Helper function to get audio duration
const getAudioDuration = async (filePath) => {
    // Implement this function to return the audio duration in seconds
    // You can use a library like ffmpeg to get the duration
    return 0;
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
