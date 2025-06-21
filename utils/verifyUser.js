const { errorHandler } = require("./error.js");
const jwt = require('jsonwebtoken');

const verifyToken = () => {
    return (req, res, next) => {
        try
        {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return next(errorHandler(401, "Unauthorized: Missing or malformed token"));
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return next(errorHandler(401, "Unauthorized: Token is empty or incorrect"));
            }

            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (err){
                    return next(errorHandler(403, `Forbidden: ${err}`));
                }
                req.user = user;
                next();
            });
        } catch (err) {
            return next(errorHandler(500, `Internal Server Error: ${err}`));
        }
    };
};

module.exports = verifyToken;
