const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");



const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/uploads", express.static("uploads")); // Serve uploaded files

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/webcafe", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    description: String,
    avatar: String,
    // ADDED FIELDS:
    firstName: String,
    lastName: String,
    website: String,
    facebook: String,
    twitter: String
});

const User = mongoose.model("User", userSchema);

// Multer Setup for File Uploads
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

app.post("/register", upload.single("avatar"), async (req, res) => {
    try {
        const { username, email, password, description } = req.body;
        const avatar = req.file ? "/uploads/" + req.file.filename : null;

        console.log("📥 Received Registration Data:", { username, email, password, description, avatar });

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("❌ Email already exists.");
            return res.status(400).json({ message: "❌ Email already registered." });
        }

        // Save new user
        const newUser = new User({ username, email, password, description, avatar });
        await newUser.save();

        console.log("✅ User Registered Successfully:", newUser);

        res.json({ message: "✅ User registered successfully!" });
    } catch (err) {
        console.error("❌ Error registering user:", err);
        res.status(500).json({ message: "Error registering user." });
    }
});



// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            console.log("❌ User not found.");
            return res.status(401).json({ message: "❌ User not found." });
        }

        // Check password (⚠️ No hashing yet)
        if (user.password !== password) {
            console.log("❌ Incorrect password.");
            return res.status(401).json({ message: "❌ Incorrect password." });
        }

        // Log user details in the terminal
        console.log("✅ Login successful!");
        console.log("User Details:", {
            username: user.username,
            email: user.email,
            description: user.description,
            avatar: user.avatar
        });

        // Send user data (including some fields if you want)
        res.json({
            message: "✅ Login successful!",
            user: {
                _id: user._id,             // Make sure we send _id
                username: user.username,
                email: user.email,
                description: user.description,
                avatar: user.avatar,
                // Include newly added fields if you want them on the client:
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                website: user.website || "",
                facebook: user.facebook || "",
                twitter: user.twitter || ""
            },
        });
    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ message: "Error logging in." });
    }
});

app.put("/update-profile/:id", upload.single("avatar"), async (req, res) => {
    try {
        const userId = req.params.id;
        const {
            username,
            email,
            description,
            password,
            firstName,
            lastName,
            website,
            facebook,
            twitter
        } = req.body;
        
        let updateData = {};

        // Original fields
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (description) updateData.description = description;
        if (password) {
            updateData.password = password; // no hashing in your code
        }

        // ADDED fields
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (website) updateData.website = website;
        if (facebook) updateData.facebook = facebook;
        if (twitter) updateData.twitter = twitter;

        // If avatar is uploaded, update avatar field
        if (req.file) {
            updateData.avatar = "/uploads/" + req.file.filename;
        }

        // Update user in MongoDB
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: "❌ User not found." });
        }

        res.json({ message: "✅ Profile updated successfully!", user: updatedUser });
    } catch (error) {
        console.error("❌ Error updating profile:", error);
        res.status(500).json({ message: "❌ Error updating profile." });
    }
});

app.put("/change-password/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const { oldPassword, newPassword } = req.body;

        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "❌ User not found." });
        }

        // Check old password
        if (user.password !== oldPassword) {
            return res.status(401).json({ message: "❌ Old password is incorrect." });
        }

        // Update to new password (plain text, as in your existing code)
        user.password = newPassword;
        await user.save();

        res.json({ message: "✅ Password changed successfully!" });
    } catch (error) {
        console.error("❌ Error changing password:", error);
        res.status(500).json({ message: "❌ Error changing password." });
    }
});

// Logout Route (Logs user logout in terminal)
app.post("/logout", (req, res) => {
    console.log("🔴 User logged out.");
    res.json({ message: "✅ Logout successful!" });
});



// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
