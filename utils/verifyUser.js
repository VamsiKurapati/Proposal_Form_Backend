const { errorHandler } = require("./error");
const jwt = require('jsonwebtoken');

const verifyUser = (roles) => (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(errorHandler(401, "Unauthorized: Missing or malformed token"));
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next(errorHandler(401, "Unauthorized: Token is empty or incorrect"));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(errorHandler(403, `Forbidden: ${err}`));
            }
            
            const user = decoded.user;
            if (!user || !user.role) {
                return next(errorHandler(401, "Unauthorized: Invalid user payload"));
            }

            req.user = user;

            const userRole = user.role;
            const accessLevel = user.role === "employee" ? user.accessLevel || "viewer" : "viewer";

            // If user's role is allowed directly
            if (roles.includes(userRole)) {
                return next();
            }

            // If user is employee, and accessLevel matches allowed roles
            if (userRole === "employee" && roles.includes(accessLevel)) {
                return next();
            }

            return next(errorHandler(403, "Forbidden: Role or access level not permitted"));
        });
    } catch (err) {
        return next(errorHandler(500, `Internal Server Error: ${err}`));
    }
};

module.exports = verifyUser;
