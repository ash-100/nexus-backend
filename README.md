# Creative Content Manager Backend

A simple Express.js backend that provides API endpoints for the Creative Content Manager application.

## Features

- RESTful API endpoints for content plan, operational metadata, screen config, and media
- Supabase integration for database operations
- CORS support for frontend integration
- JSON and XML response formats
- Error handling and validation

## API Endpoints

### 1. Content Plan API
```
GET /api/content_plan
```
Returns the content plan as JSON.

### 2. Operational Metadata API
```
GET /api/operational_metadata
```
Returns the latest operational metadata configuration as JSON.

### 3. Screen Config API
```
GET /api/config
```
Returns the latest screen configuration as JSON.

### 4. Media API
```
GET /api/media?assetId=<asset_id>
```
Returns VAST XML for the specified asset ID.

### 5. Health Check
```
GET /health
```
Returns server status.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3001
   ```

3. **Start the server:**
   
   Development mode (with auto-restart):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

4. **Server will be available at:**
   ```
   http://localhost:3001
   ```

## Integration with Frontend

The backend is configured to work with your React frontend. Make sure your frontend is running on one of these ports:
- `http://localhost:8080` (Vite default)
- `http://localhost:3000` (Create React App default)
- `http://localhost:5173` (Vite alternative)

## API Usage Examples

### Get Content Plan
```bash
curl http://localhost:3001/api/content_plan
```

### Get Operational Metadata
```bash
curl http://localhost:3001/api/operational_metadata
```

### Get Screen Config
```bash
curl http://localhost:3001/api/config
```

### Get Media XML
```bash
curl "http://localhost:3001/api/media?assetId=12345678-1234-1234-1234-123456789abc"
```

## Development

- The server uses nodemon for development, which automatically restarts when files change
- CORS is configured to allow requests from common development ports
- Error handling includes both client and server error responses
- Logging is implemented for debugging

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Configure proper CORS origins for your production domains
3. Use a process manager like PM2 for production
4. Set up proper logging and monitoring

## Notes

- The content plan API currently returns mock data. Integrate with your actual content management system as needed.
- The media API generates sample VAST XML. Customize this based on your actual asset management requirements.
- Custom fields from operational metadata and screen config are automatically included in the API responses.
