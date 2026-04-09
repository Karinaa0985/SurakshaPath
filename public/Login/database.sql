-- Create Main Database
CREATE DATABASE IF NOT EXISTS SurakshaPath;
USE SurakshaPath;

-- Create Users Table (Sub-branch 1)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Storing hashed password for preventing hacking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create OTPs Table for Forgot Password (Sub-branch 2)
CREATE TABLE password_resets (
    reset_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
);

-- Additional tables (like safe zones, emergency contacts) can be added here