# WhatsApp Bot API

A WhatsApp Bot API built with Express.js, MySQL, and Baileys library. This is an API-only implementation without GUI.

## Features

- Multi-session WhatsApp connections
- QR code generation for login
- Send text messages
- Send media files (images, videos, audio, documents)
- Session management with database persistence
- Automatic cleanup of expired sessions
- RESTful API endpoints

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- WhatsApp account

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd WhatsAppBot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=whatsapp_bot
```

4. Start the server:
```bash
npm start
```

## API Endpoints

### 1. Get QR Code for Login
**GET** `/get-qr/:id`

Generates a QR code for WhatsApp Web login.

**Parameters:**
- `id` (string): Unique session ID

**Response:**
```json
{
    "status": true,
    "loggedIn": false,
    "qr": {
        "success": true,
        "img": "data:image/png;base64,..."
    }
}
```

### 2. Send Text Message
**POST** `/send-message`

Sends a text message to a WhatsApp number.

**Payload:**
```json
{
    "id": "85_37c691f0-603c-11f0-a7ad-bf17d5f03bfb",
    "number": "919372210593@s.whatsapp.net",
    "message": "Hello World!"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Message sent successfully"
}
```

### 3. Send Media File
**POST** `/send-media`

Sends a media file (image, video, audio, document) to a WhatsApp number.

**Form Data:**
- `id` (string): Session ID
- `number` (string): WhatsApp number
- `message` (string): Caption (optional)
- `media` (file): Media file to send

**Response:**
```json
{
    "success": true,
    "message": "Media sent successfully"
}
```

### 4. Logout
**POST** `/logout`

Logs out from WhatsApp and cleans up the session.

**Payload:**
```json
{
    "id": "296_040d49b0-6318-11f0-9b61-19dbefb0007c"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

### 5. Clean Expired Sessions
**POST** `/clean-expired`

Removes expired sessions (older than 24 hours and not logged in).

**Response:**
```json
{
    "success": true,
    "message": "Cleaned 5 expired sessions"
}
```

### 6. Health Check
**GET** `/health`

Returns server status and active connections count.

**Response:**
```json
{
    "status": "OK",
    "timestamp": "2025-08-27T10:30:00.000Z",
    "activeConnections": 3
}
```

## Database Schema

The API uses the following MySQL table structure:

```sql
CREATE TABLE wa_tokens (
    id INT NOT NULL AUTO_INCREMENT,
    token VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
    status ENUM('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '0="not scanned", 1="scanned"',
    scan_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
    scan_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
    delete_status ENUM('0','1') COLLATE utf8mb4_general_ci DEFAULT '0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## Usage Examples

### Using cURL

1. **Get QR Code:**
```bash
curl -X GET "http://localhost:3000/get-qr/293_8a396f20-7d79-11f0-be15-ab8bd71840d8"
```

2. **Send Message:**
```bash
curl -X POST "http://localhost:3000/send-message" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "293_8a396f20-7d79-11f0-be15-ab8bd71840d8",
    "number": "919372210593@s.whatsapp.net",
    "message": "Hello from API!"
  }'
```

3. **Send Media:**
```bash
curl -X POST "http://localhost:3000/send-media" \
  -F "id=293_8a396f20-7d79-11f0-be15-ab8bd71840d8" \
  -F "number=919372210593@s.whatsapp.net" \
  -F "message=Check this image!" \
  -F "media=@/path/to/image.jpg"
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- `400 Bad Request`: Missing or invalid parameters
- `500 Internal Server Error`: Server-side errors

Example error response:
```json
{
    "success": false,
    "message": "Session not found or not logged in"
}
```

## Session Management

- Each WhatsApp connection requires a unique session ID
- Sessions are stored in the database with their status
- Authentication files are stored in `./auth_sessions/{sessionId}/`
- Expired sessions are automatically cleaned up

## Security Notes

- Ensure your MySQL database is properly secured
- Use environment variables for sensitive configuration
- Consider implementing API authentication for production use
- Regularly clean up expired sessions

## Support

For more information about Baileys library, visit: https://baileys.wiki/

## License

ISC
