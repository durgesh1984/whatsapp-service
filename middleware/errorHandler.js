function errorHandler(err, req, res, next) {
    console.error('Unhandled error:', err);
    
    if (err.code === 'ENOENT') {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }
    
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            success: false,
            message: 'Database connection failed'
        });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: err.details
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
}

function notFound(req, res) {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
}

module.exports = {
    errorHandler,
    notFound
};