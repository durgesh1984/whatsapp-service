function validateMessageRequest(req, res, next) {
    // Support both JSON body and form-data
    const { id, number, message } = req.body;
    
    if (!id || typeof id !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing session ID'
        });
    }
    
    if (!number || typeof number !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing phone number'
        });
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing message'
        });
    }
    
    next();
}


function validateSessionId(req, res, next) {
    const sessionId = req.params.id || req.body.id;
    
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing session ID'
        });
    }
    
    next();
}

function validateMediaURLRequest(req, res, next) {
    const { id, number, filePath } = req.body;
    
    if (!id || typeof id !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing session ID'
        });
    }
    
    if (!number || typeof number !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing phone number'
        });
    }
    
    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid or missing file URL'
        });
    }
    
    // Basic URL validation
    try {
        new URL(filePath);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid file URL format'
        });
    }
    
    next();
}

module.exports = {
    validateMessageRequest,
    validateMediaURLRequest,
    validateSessionId
};