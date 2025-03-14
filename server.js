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

// Review Schema
const reviewSchema = new mongoose.Schema({
    userId: String,
    username: String,
    branch: String,
    rating: Number,
    text: String,
    date: { type: Date, default: Date.now }
});
const Review = mongoose.model("Review", reviewSchema);

// Multer Setup for File Uploads
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// Register Route
app.post("/register", upload.single("avatar"), async (req, res) => {
    try {
        const { username, email, password, description } = req.body;
        const avatar = req.file ? "/uploads/" + req.file.filename : null;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "❌ Email already registered." });
        }

        const newUser = new User({ username, email, password, description, avatar });
        await newUser.save();

        res.json({ message: "✅ User registered successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Error registering user." });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.password !== password) {
            return res.status(401).json({ message: "❌ Invalid email or password." });
        }

        res.json({
            message: "✅ Login successful!",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                description: user.description,
                avatar: user.avatar
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Error logging in." });
    }
});

// Fetch Reviews
app.get("/reviews", async (req, res) => {
    try {
        const { branch } = req.query;
        const reviews = await Review.find({ branch }).sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Error fetching reviews." });
    }
});

// Post Review
app.post("/reviews", async (req, res) => {
    try {
        const { userId, username, branch, rating, text } = req.body;
        const newReview = new Review({ userId, username, branch, rating, text });
        await newReview.save();
        res.json({ message: "✅ Review added!", review: newReview });
    } catch (err) {
        res.status(500).json({ message: "Error submitting review." });
    }
});

// Edit Review
app.put("/reviews/:id", async (req, res) => {
    try {
        const { text, rating } = req.body;
        const updatedReview = await Review.findByIdAndUpdate(req.params.id, { text, rating }, { new: true });

        if (!updatedReview) {
            return res.status(404).json({ message: "❌ Review not found." });
        }

        res.json({ message: "✅ Review updated!", review: updatedReview });
    } catch (err) {
        res.status(500).json({ message: "Error updating review." });
    }
});

// Delete Review
app.delete("/reviews/:id", async (req, res) => {
    try {
        const deletedReview = await Review.findByIdAndDelete(req.params.id);

        if (!deletedReview) {
            return res.status(404).json({ message: "❌ Review not found." });
        }

        res.json({ message: "✅ Review deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting review." });
    }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
