# Frontend Deployment Guide

## Environment Variables

The frontend is now configured to use the deployed backend at:
- **Backend URL**: `https://ecochat-ep0h.onrender.com`
- **API URL**: `https://ecochat-ep0h.onrender.com/api`
- **Socket URL**: `https://ecochat-ep0h.onrender.com`

### Local Development

If you want to use a local backend for development, create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Production Deployment

For production (Vercel, Netlify, etc.), set these environment variables:

```env
REACT_APP_API_URL=https://ecochat-ep0h.onrender.com/api
REACT_APP_SOCKET_URL=https://ecochat-ep0h.onrender.com
```

## Backend CORS Configuration

Make sure your backend's `.env` file on Render includes:

```env
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

Or if you want to allow multiple origins, you may need to update the backend CORS configuration.

## Deployment Steps

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repository
   - Set environment variables in Vercel dashboard
   - Deploy

3. **Update Backend CORS:**
   - Update `FRONTEND_URL` in your Render backend environment variables
   - Restart the backend service

## Testing

After deployment, test:
- ✅ User registration
- ✅ User login
- ✅ Socket.io connection
- ✅ Real-time messaging
- ✅ File uploads

