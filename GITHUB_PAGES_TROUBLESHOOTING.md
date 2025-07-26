# GitHub Pages Deployment Troubleshooting Guide

This guide provides step-by-step instructions to resolve GitHub Pages deployment issues for your Inventory Management System.

## Current Status

✅ **Fixed Issues:**
- Environment variables are properly configured
- Build process works correctly
- Base path configuration is set to `/Inven-management/`
- Router basename is configured for GitHub Pages
- GitHub Actions workflow includes all necessary environment variables

## Manual Setup Steps Required

### 1. Repository Settings (CRITICAL)

**You MUST configure these settings manually in GitHub:**

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/Inven-management`
2. Click **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions** (NOT Deploy from a branch)
5. Save the settings

### 2. Firebase Authorized Domains (CRITICAL)

**This is likely the main cause of your white page issue:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `inventory-management-92166`
3. Go to **Authentication** > **Settings** > **Authorized domains**
4. Add your GitHub Pages domain:
   ```
   YOUR_USERNAME.github.io
   ```
   Replace `YOUR_USERNAME` with your actual GitHub username

5. **Important:** The full URL will be `https://YOUR_USERNAME.github.io/Inven-management/`

### 3. Verify Your Repository Name

**Make sure your repository is named exactly:** `Inven-management`

If it's named differently, you need to either:
- Rename the repository to `Inven-management`, OR
- Update the base path in `vite.config.ts` and `src/App.tsx` to match your actual repository name

### 4. Push Changes and Deploy

1. Commit and push all the recent changes:
   ```bash
   git add .
   git commit -m "Fix GitHub Pages routing and configuration"
   git push origin main
   ```

2. Check the **Actions** tab in your GitHub repository to see the deployment progress

3. Once deployed, your site should be available at:
   ```
   https://YOUR_USERNAME.github.io/Inven-management/
   ```

## Common Issues and Solutions

### Issue 1: White Page After Deployment

**Cause:** Firebase authorized domains not configured

**Solution:** Add `YOUR_USERNAME.github.io` to Firebase authorized domains (see step 2 above)

### Issue 2: 404 Errors on Page Refresh

**Cause:** GitHub Pages doesn't handle client-side routing by default

**Solution:** ✅ Already fixed with `404.html` and SPA fallback script

### Issue 3: Assets Not Loading

**Cause:** Incorrect base path configuration

**Solution:** ✅ Already fixed with proper base path in `vite.config.ts`

### Issue 4: Firebase Authentication Errors

**Cause:** Domain not authorized in Firebase

**Solution:** Ensure GitHub Pages domain is added to Firebase authorized domains

## Testing Your Deployment

### Local Testing

1. Test the GitHub Pages build locally:
   ```bash
   VITE_GITHUB_PAGES=true GITHUB_PAGES=true npm run build
   npm run preview
   ```

2. The preview should show how the app will behave on GitHub Pages

### Production Testing

1. After deployment, test these URLs:
   - Landing page: `https://YOUR_USERNAME.github.io/Inven-management/`
   - Login page: `https://YOUR_USERNAME.github.io/Inven-management/login`
   - Direct navigation to dashboard: `https://YOUR_USERNAME.github.io/Inven-management/dashboard`

2. Test Firebase authentication:
   - Try signing up with email
   - Try Google sign-in
   - Check browser console for any Firebase errors

## Debugging Steps

### 1. Check GitHub Actions Logs

1. Go to your repository's **Actions** tab
2. Click on the latest workflow run
3. Check for any build or deployment errors
4. Look for the deployment URL in the logs

### 2. Check Browser Console

1. Open your GitHub Pages site
2. Open browser developer tools (F12)
3. Check the **Console** tab for errors
4. Look for Firebase authentication errors or routing issues

### 3. Verify Firebase Configuration

1. Check that all Firebase environment variables are correctly set in the GitHub Actions workflow
2. Verify that the Firebase project ID matches your actual project
3. Ensure Firebase services (Auth, Firestore, Storage) are enabled

## Expected Deployment URL

Your app should be accessible at:
```
https://YOUR_USERNAME.github.io/Inven-management/
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

## Next Steps

1. **Complete the manual setup steps above**
2. **Push the changes to trigger a new deployment**
3. **Add the GitHub Pages domain to Firebase authorized domains**
4. **Test the deployment**

If you continue to experience issues after following these steps, please:
1. Check the GitHub Actions logs for specific error messages
2. Verify your GitHub username and repository name
3. Ensure Firebase authorized domains include your GitHub Pages domain
4. Test Firebase authentication in the browser console

## Support

If you need further assistance:
1. Share the exact error messages from browser console
2. Provide your GitHub username and repository URL
3. Share any GitHub Actions workflow error logs
4. Confirm that Firebase authorized domains have been updated