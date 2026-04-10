# AAGE Deployment Guide

## Backend Deployment (Already Complete ✅)
- **URL:** https://aage-production.up.railway.app
- **Platform:** Railway.app
- **Status:** Live & Working

## Frontend Deployment (Ready to Deploy 🚀)

### Railway Deployment Steps:

1. **Connect Your Repository to Railway:**
   - Go to https://railway.app
   - Sign in with GitHub
   - Create new project
   - Select your AAGE GitHub repository

2. **Configure Environment Variables on Railway:**
   ```
   BACKEND_URL=https://aage-production.up.railway.app
   REACT_APP_API_URL=https://aage-production.up.railway.app
   ```

3. **Deploy Frontend:**
   Railway will automatically detect the Dockerfile and:
   - Build the React app
   - Create Nginx container
   - Serve on port 3000

4. **Get Your Frontend URL:**
   - Railway will provide: `https://aage-frontend-xxxx.railway.app`
   - Update this in backend CORS settings

### Docker Compose (Local Testing)

```bash
# Test locally before deploying
docker-compose up --build

# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

## Environment Variables Reference

### Frontend (`.env.production`)
```env
REACT_APP_API_URL=https://aage-production.up.railway.app
```

### Backend (`.env.production`)
```env
PORT=5000
CLIENT_URL=https://aage-frontend-xxxx.railway.app
MONGODB_URI=mongodb+srv://AAGE:AAGE@cluster0.x6yobup.mongodb.net/AAGE
JWT_SECRET=8ad98cf102feefcfce1435b6dc7c291b96554c9d40be9fb885af87b22b50e123
NODE_ENV=production
```

## Testing Deployment

### Backend Health Check
```bash
curl https://aage-production.up.railway.app/health
```

### Frontend API Connection
1. Visit frontend URL
2. Login with: `student@aage.com` / `Student@123`
3. Check browser console for any errors

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Update CLIENT_URL in backend .env.production |
| Socket.io connection fails | Check BACKEND_URL in frontend .env.production |
| MongoDB connection error | Verify MONGODB_URI in backend .env.production |
| 502 Bad Gateway | Check backend health: `/health` endpoint |

## Files Changed

- ✅ `frontend/Dockerfile` - Updated for environment variable support
- ✅ `frontend/nginx.conf` - Enhanced proxy configuration
- ✅ `.env.production` - Updated with live URLs
- ✅ `railway.toml` - Added Railway deployment config

## Next Steps

1. Deploy frontend to Railway
2. Get frontend URL
3. Update backend CORS settings
4. Test full integration
