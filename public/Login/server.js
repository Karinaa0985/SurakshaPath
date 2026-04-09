const express = require('express');
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For authentication
const nodemailer = require('nodemailer'); // To send OTP to mail
const mysql = require('mysql2/promise'); // SQL Database driver
const cors = require('cors'); // Allows frontend HTML to communicate with backend

const app = express();
app.use(cors()); // Enable CORS
app.use(express.json());

// Setup SQL Connection (Ensure you have a MySQL server running)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Divya@123', // change as per your local DB
    database: 'SurakshaPath'
});

// Test Database Connection
pool.getConnection()
    .then(() => console.log('✅ Connected to MySQL Database successfully!'))
    .catch((err) => console.error('❌ MySQL connection failed:', err.message));

// Configure Nodemailer for OTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'divyabagde2020@gmail.com', // Replace with a team testing email
        pass: 'ceyq gyro tyvz aaqb'
    }
});

// 1. REGISTER API
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Hashing the password (cost factor of 10)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert into SQL
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        // Print the REAL error to the Node.js terminal
        console.error("❌ Registration Error:", err.message); 
        
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: "This email is already registered! Please use a different email." });
        } else if (err.code === 'ER_NO_SUCH_TABLE') {
            res.status(500).json({ error: "Database table 'users' does not exist. Please run the SQL script in Workbench." });
        } else {
            res.status(500).json({ error: "Server error. Check your terminal for details." });
        }
    }
});

// 2. LOGIN API
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(404).json({ error: "User not found!" });

        const user = rows[0];
        
        // Verify Hash
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: "Invalid password!" });

        // Generate JWT Token for Authentication
        const token = jwt.sign({ id: user.user_id, email: user.email }, 'secret_key', { expiresIn: '1h' });
        
        res.status(200).json({ message: "Login successful!", token });
    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
});

// 3. FORGOT PASSWORD (OTP Generation) API
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        // 1. Check if user actually exists first
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: "Email not registered!" });

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); // OTP valid for 10 mins

        // Store in DB
        await pool.query(
            'INSERT INTO password_resets (email, otp_code, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        // Send Email
        await transporter.sendMail({
            from: '"SurakshaPath Team" <divyabagde2020@gmail.com>', // Adds a professional display name!
            to: email, // This variable sends it to whatever email the user typed!
            subject: 'SurakshaPath - Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`
        });

        res.status(200).json({ message: "OTP sent to your email!" });
    } catch (err) {
        console.error("❌ OTP Error:", err.message);
        res.status(500).json({ error: "Error sending OTP." });
    }
});

// 4. RESET PASSWORD API
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        // 1. Verify OTP
        const [resets] = await pool.query(
            'SELECT * FROM password_resets WHERE email = ? AND otp_code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );
        if (resets.length === 0) return res.status(400).json({ error: "Invalid or expired OTP!" });

        // 2. Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 3. Update the user's password in the database
        await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hashedPassword, email]);

        // 4. Delete the used OTP so it can't be used again
        await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

        res.status(200).json({ message: "Password reset successfully! You can now login." });
    } catch (err) {
        res.status(500).json({ error: "Server error during reset." });
    }
});

app.listen(3000, () => console.log('SurakshaPath Server running on port 3000'));