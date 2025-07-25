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

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return next(errorHandler(403, `Forbidden: ${err}`));
            }
            req.user = user.user;
            if (roles.includes(user.user.role)) {
                next();
            } else {
                return next(errorHandler(403, "Forbidden: You are not authorized to access this resource"));
            }
        });
    } catch (err) {
        return next(errorHandler(500, `Internal Server Error: ${err}`));
    }
};

module.exports = verifyUser;
