# AWS Amplify Deployment Guide

## Prerequisites

- AWS Account with Amplify access
- GitHub/GitLab/Bitbucket repository (or AWS CodeCommit)
- Project pushed to version control

## Deployment Steps

### 1. **Push Code to Repository**

```bash
git add .
git commit -m "Ready for Amplify deployment"
git push origin main
```

### 2. **AWS Amplify Console Setup**

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Select your repository provider (GitHub/GitLab/Bitbucket)
4. Authorize AWS Amplify to access your repository
5. Select your repository and branch (main/master)

### 3. **Build Settings**

The `amplify.yml` file is already configured with optimal settings:

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node.js version**: Automatically detected
- **Cache**: node_modules for faster builds

**Amplify will automatically detect and use the `amplify.yml` file.**

### 4. **Environment Variables** (Optional)

If you plan to add Firebase or API keys later:

1. In Amplify Console → Your App → Environment variables
2. Add variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID`
   - etc.

### 5. **Deploy**

1. Review settings and click **"Save and Deploy"**
2. Wait for build to complete (~2-5 minutes)
3. Your app will be available at: `https://[branch-name].[app-id].amplifyapp.com`

## Build Configuration Details

### Current Setup

- **Framework**: Vite
- **Build Output**: `dist/`
- **Package Manager**: npm
- **Node Version**: 18.x or higher (auto-detected)

### Included Files

- `amplify.yml` - Amplify build configuration
- `package.json` - Dependencies and build scripts
- `vite.config.js` - Vite configuration
- `tailwind.config.js` - Tailwind CSS setup

## Post-Deployment

### Custom Domain (Optional)

1. Go to Amplify Console → Domain management
2. Click "Add domain"
3. Follow DNS configuration steps

### Branch Deployments

Amplify automatically:

- Deploys on every push to connected branch
- Creates preview deployments for pull requests
- Maintains deployment history

### Performance Features

✅ Global CDN (CloudFront)
✅ Automatic HTTPS
✅ Asset optimization
✅ Gzip compression
✅ Cache headers

## Monitoring

Access in Amplify Console:

- **Build logs**: Real-time build output
- **Access logs**: Traffic analytics
- **Metrics**: Performance monitoring

## Troubleshooting

### Build Fails

1. Check build logs in Amplify Console
2. Verify `package.json` dependencies
3. Test build locally: `npm run build`

### Blank Page After Deploy

1. Check browser console for errors
2. Verify routing configuration (already handled with React Router)
3. Check base path in `vite.config.js`

### CSS Not Loading

- Already configured correctly with Tailwind
- Check build output includes CSS files

## Local Testing Before Deploy

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test production build locally
npm run build
npm run preview
```

## Estimated Costs

**AWS Amplify Pricing (as of 2025):**

- **Free Tier**:
  - 1000 build minutes/month
  - 15 GB data transfer/month
  - 5 GB storage
- **Beyond Free Tier**:
  - Build minutes: $0.01/minute
  - Hosting: $0.15/GB data transfer
  - Storage: $0.023/GB/month

**Your app should stay within free tier for development/testing.**

## Ready to Deploy! ✅

Your application is fully configured for AWS Amplify deployment with:

- ✅ Optimized build configuration
- ✅ Proper asset handling
- ✅ CDN-ready static files
- ✅ Responsive design for all devices
- ✅ Production-ready code

Simply push to your repository and connect to Amplify Console!
