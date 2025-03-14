const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key"; // Use env variable for security

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "http://localhost:5500", credentials: true })); // Allow frontend requests
app.use("/uploads", express.static("uploads"));

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/webcafe", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// =========================== USER SCHEMA ===========================
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    description: String,
    avatar: String
});

const User = mongoose.model("User", userSchema);

// =========================== REVIEW SCHEMA (WITH BRANCH) ===========================
const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String,
    branch: String,
    rating: Number,
    text: String,
    date: { type: String, default: new Date().toLocaleDateString() }
});

const Review = mongoose.model("Review", reviewSchema);

// =========================== FILE UPLOAD (MULTER) ===========================
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// =========================== AUTH ROUTES ===========================

// Register
app.post("/register", upload.single("avatar"), async (req, res) => {
    try {
        const { username, email, password, description } = req.body;
        const avatar = req.file ? "/uploads/" + req.file.filename : null;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "❌ Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, description, avatar });
        await newUser.save();

        res.json({ message: "✅ User registered successfully!" });
    } catch (err) {
        res.status(500).json({ message: "❌ Error registering user." });
    }
});

// Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "❌ Invalid credentials." });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY, { expiresIn: "7d" });

        res.json({ message: "✅ Login successful!", user, token });
    } catch (err) {
        res.status(500).json({ message: "❌ Error logging in." });
    }
});

// =========================== REVIEW ROUTES ===========================

// Middleware to verify JWT
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "❌ Unauthorized. No token provided." });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "❌ Invalid token." });
    }
};

// Add a review (with branch) - Protected Route
app.post("/reviews", authenticate, async (req, res) => {
    try {
        const { branch, rating, text } = req.body;

        const newReview = new Review({
            userId: req.user.userId,
            username: req.user.username,
            branch,
            rating,
            text
        });

        await newReview.save();
        res.json({ message: "✅ Review added successfully!", review: newReview });
    } catch (error) {
        res.status(500).json({ message: "❌ Error adding review." });
    }
});

// Fetch reviews by branch
app.get("/reviews", async (req, res) => {
    try {
        const { branch } = req.query;
        if (!branch) return res.status(400).json({ message: "❌ Branch parameter is required." });

        const reviews = await Review.find({ branch }).populate("userId", "username email avatar");
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "❌ Error fetching reviews." });
    }
});

// =========================== EDIT REVIEW (PUT) ===========================
// Only allow the owner to edit their review
app.put("/reviews/:id", authenticate, async (req, res) => {
    try {
        const { text, rating } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) return res.status(404).json({ message: "❌ Review not found." });
        if (review.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: "❌ Unauthorized to edit this review." });
        }

        review.text = text;
        review.rating = rating;
        await review.save();

        res.json({ message: "✅ Review updated successfully!", review });
    } catch (error) {
        res.status(500).json({ message: "❌ Error updating review." });
    }
});

// =========================== DELETE REVIEW (DELETE) ===========================
// Only allow the owner to delete their review
app.delete("/reviews/:id", authenticate, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: "❌ Review not found." });

        if (review.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: "❌ Unauthorized to delete this review." });
        }

        await review.deleteOne();
        res.json({ message: "✅ Review deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "❌ Error deleting review." });
    }
});

// =========================== START SERVER ===========================
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
