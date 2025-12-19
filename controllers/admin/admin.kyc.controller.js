const User = require('../../models/User.model');
const mongoose = require('mongoose');

exports.getAllKYC = async (req, res) => {
    try {
        // 1. Check DB Connection Status
        const dbName = mongoose.connection.name;
        const users = await User.find({}).lean();
        
        console.log(`--- DIAGNOSTIC ---`);
        console.log(`Connected to Database: ${dbName}`);
        console.log(`Users found in '${User.collection.name}' collection: ${users.length}`);

        let formatted = users.map(u => ({
            _id: u._id,
            user: { 
                username: u.username || u.email || 'Unnamed User', 
                email: u.email || 'No Email' 
            },
            status: u.kycStatus || 'pending',
            createdAt: u.createdAt || new Date()
        }));

        // 2. FORCE DATA (If DB is empty, show this so you know the UI works)
        if (formatted.length === 0) {
            console.log("Empty DB: Sending test user to frontend.");
            formatted = [{
                _id: "test_123",
                user: { username: "Database_Is_Empty", email: "check_your_mongodb@test.com" },
                status: "action_required",
                createdAt: new Date()
            }];
        }

        return res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        console.error("KYC Controller Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateKYCStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        await User.findByIdAndUpdate(userId, { kycStatus: status });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false });
    }
};