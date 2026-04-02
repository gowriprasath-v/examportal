const jwt = require("jsonwebtoken");
const JWT_SECRET = "super_secret_key_123";

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) return res.status(401).json({ success: false, message: "Access Denied. No token provided." });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ success: false, message: "Invalid Token" });
    }
};

exports.verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.some(r => r.toLowerCase() === req.user.role.toLowerCase())) {
            return res.status(403).json({ success: false, message: "Forbidden: You do not have the right role" });
        }
        next();
    };
};
