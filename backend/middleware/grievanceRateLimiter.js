const rateLimitData = {};

/**
 * Basic IP rate limiter: maximum 5 grievance submissions per hour per IP
 */
const grievanceSubmitRateLimiter = (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'default-ip';
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    if (!rateLimitData[ip]) {
        rateLimitData[ip] = [];
    }

    // Filter out request timestamps older than 1 hour
    rateLimitData[ip] = rateLimitData[ip].filter(timestamp => now - timestamp < ONE_HOUR);

    if (rateLimitData[ip].length >= 5) {
        return res.status(429).json({
            success: false,
            message: 'Too many grievance submissions from this IP address. Limit is 5 per hour. Please try again later.'
        });
    }

    rateLimitData[ip].push(now);
    next();
};

const feedbackSubmitRateLimiter = (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'default-ip';
    const key = `feedback:${ip}`;
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    rateLimitData[key] = (rateLimitData[key] || []).filter(timestamp => now - timestamp < ONE_HOUR);
    if (rateLimitData[key].length >= 5) {
        return res.status(429).json({ success: false, message: 'Too many feedback submissions. Please try again in an hour.' });
    }
    rateLimitData[key].push(now);
    next();
};

module.exports = { grievanceSubmitRateLimiter, feedbackSubmitRateLimiter };
