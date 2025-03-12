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
    avatar: String
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

        // Send user data (without password)
        res.json({
            message: "✅ Login successful!",
            user: {
                username: user.username,
                email: user.email,
                description: user.description,
                avatar: user.avatar,
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
        const { username, email, description, password } = req.body;
        let updateData = { username, email, description };

        // If password is provided, hash it before updating
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

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



// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
