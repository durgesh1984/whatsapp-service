const express = require('express');
const { getQRCode, getFreshQRCode } = require('../controllers/qrController');
const { sendTextMessage, sendMediaFromURL } = require('../controllers/messageController');
const { logout, cleanExpiredSessions } = require('../controllers/sessionController');
const { healthCheck } = require('../controllers/healthController');
const { validateSessionId, validateMessageRequest, validateMediaURLRequest } = require('../middleware/validation');
const multer = require('multer');

const router = express.Router();

const upload = multer();
router.get('/get-qr/:id', validateSessionId, getQRCode);
router.get('/get-fresh-qr/:id', validateSessionId, getFreshQRCode);
router.post('/send-message', upload.none(), validateMessageRequest, sendTextMessage);
router.post('/send-media', upload.none(), validateMediaURLRequest, sendMediaFromURL);
router.post('/logout', upload.none(), validateSessionId, logout);
router.post('/clean-expired', upload.none(), cleanExpiredSessions);
router.get('/health', healthCheck);

module.exports = router;