# GitHub Pages Deployment Guide

This guide will help you deploy your Inventory Management System to GitHub Pages.

## Prerequisites

1. Your code should be pushed to a GitHub repository
2. You need admin access to the repository
3. The repository should be public (or you have GitHub Pro for private repos)

## Setup Steps

### 1. Configure Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**

### 2. Update Base Path (Important!)

In `vite.config.ts`, make sure the base path matches your repository name:

```typescript
base: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME/' : '/'
```

**Replace `YOUR_REPO_NAME` with your actual GitHub repository name.**

For example, if your repository URL is `https://github.com/username/my-inventory-app`, then use:
```typescript
base: process.env.NODE_ENV === 'production' ? '/my-inventory-app/' : '/'
```

### 3. Deploy

Once you push to the `main` branch, GitHub Actions will automatically:
1. Build your application
2. Deploy it to GitHub Pages
3. Make it available at `https://username.github.io/repository-name/`

### 4. Manual Deployment (Alternative)

If you prefer manual deployment:

1. Build for production:
   ```bash
   npm run build:gh-pages
   ```

2. Install GitHub Pages CLI (if not already installed):
   ```bash
   npm install -g gh-pages
   ```

3. Deploy:
   ```bash
   npx gh-pages -d dist
   ```

## Troubleshooting

### White Page with 404 Errors

This is usually caused by:

1. **Incorrect base path**: Make sure the base path in `vite.config.ts` matches your repository name
2. **Missing 404.html**: The `public/404.html` file handles client-side routing
3. **Assets not loading**: Check that all asset paths are relative

### Firebase Configuration Issues

Since this app uses Firebase, you'll need to:

1. Create a separate Firebase project for production
2. Update the Firebase configuration in your environment
3. Set up proper CORS settings for your GitHub Pages domain

### Environment Variables

For GitHub Pages deployment:

1. Go to repository **Settings** > **Secrets and variables** > **Actions**
2. Add your Firebase configuration as repository secrets
3. Update the GitHub Actions workflow to use these secrets

## Files Added/Modified for GitHub Pages

- `public/404.html` - Handles client-side routing
- `index.html` - Added GitHub Pages routing script
- `vite.config.ts` - Added base path configuration
- `.github/workflows/deploy.yml` - GitHub Actions deployment workflow
- `package.json` - Added `build:gh-pages` script

## Important Notes

1. **Repository Name**: The base path MUST match your GitHub repository name exactly
2. **Branch**: Make sure you're pushing to the `main` branch for auto-deployment
3. **Firebase**: You may need to configure Firebase for the new domain
4. **HTTPS**: GitHub Pages serves over HTTPS, ensure your Firebase project allows this

## Testing Locally

To test the GitHub Pages build locally:

```bash
# Build for production
npm run build:gh-pages

# Preview the build
npm run preview
```

The preview will show you how the app will behave on GitHub Pages.

## Support

If you encounter issues:

1. Check the GitHub Actions logs in the **Actions** tab
2. Verify the base path configuration
3. Ensure all Firebase settings are correct for the new domain
4. Check browser console for specific error messages