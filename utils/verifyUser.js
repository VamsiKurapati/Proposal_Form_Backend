const { errorHandler } = require("./error");
const jwt = require('jsonwebtoken');

const verifyUser = (req, res, next) => {
    try
    {
        console.log("Entered Auth...");
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(errorHandler(401, "Unauthorized: Missing or malformed token"));
        }

        const token = authHeader.split(' ')[1];
        console.log("Token : ",token);
        if (!token) {
            return next(errorHandler(401, "Unauthorized: Token is empty or incorrect"));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err){
                return next(errorHandler(403, `Forbidden: ${err}`));
            }
            req.user = user;
            console.log(user);
            next();
        });
    } catch (err) {
        return next(errorHandler(500, `Internal Server Error: ${err}`));
    }
};

module.exports = verifyUser;
