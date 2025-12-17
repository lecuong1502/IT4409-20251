require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log("Check URI:", process.env.MONGO_URI);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log("MongoDB Error:", err))

// Create Schema
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên không được để trống'],
        minlength: [2, 'Tên phải có ít nhất 2 ký tự'],
        trim: true
    },

    age: {
        type: Number,
        required: [true, 'Tuổi không được để trống'],
        min: [0, 'Tuổi phải >= 0']
    },

    email: {
        type: String,
        required: [true, 'Email không được để trống'],
        match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
        unique: true, // Đảm bảo email là duy nhất trong DB
        trim: true,
        lowercase: true
    },

    address: {
        type: String
    }
});

const User = mongoose.model("User", UserSchema);

// Implement API endpoints
// Pagination + Search
app.get("/api/users", async (req, res) => {
    try {
        // Page tối thiểu là 1
        const page = Math.max(1, parseInt(req.query.page) || 1);
        // Limit tối thiểu là 1, tối đa là 100 (tránh user yêu cầu quá lớn)
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
        
        // Chuẩn hóa từ khóa tìm kiếm
        const search = (req.query.search || "").trim();

        const filter = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { address: { $regex: search, $options: "i" } }
                ]
            }
            : {};

        // Skip
        const skip = (page - 1) * limit;

        // Query dtbase
        const [users, total] = await Promise.all([
            User.find(filter)
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        // Return JSON
        res.json({
            page,
            limit,
            total,
            totalPages,
            data: users
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new users
app.post("/api/users", async (req, res) => {
    try {
        const { name, age, email, address } = req.body;

        const newUser = await User.create({ name, age, email, address });

        res.status(201).json({
            message: "Tạo người dùng thành công",
            data: newUser
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "Email đã tồn tại trong hệ thống" });
        }
        res.status(400).json({ error: err.message });
    }
});

// PUT an user
app.put("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "User ID không hợp lệ" });
        }

        // const { name, age, email, address } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({
            message: "Cập nhật người dùng thành công",
            data: updatedUser
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "Email đã tồn tại trong hệ thống" });
        }
        res.status(400).json({ error: err.message });
    }
});

// DELETE an user
app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "User ID không hợp lệ" });
        }

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        res.json({ message: "Xóa người dùng thành công" });
    } catch (error) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
})