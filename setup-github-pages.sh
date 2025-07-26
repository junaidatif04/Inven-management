#!/bin/bash

# GitHub Pages Setup Script for Inventory Management System
# This script helps verify and set up GitHub Pages deployment

echo "🚀 GitHub Pages Setup for Inventory Management System"
echo "================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: This is not a git repository"
    exit 1
fi

# Get repository information
REPO_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REPO_URL" ]; then
    echo "❌ Error: No git remote 'origin' found"
    exit 1
fi

# Extract username and repo name from URL
if [[ $REPO_URL =~ github\.com[:/]([^/]+)/([^/\.]+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
else
    echo "❌ Error: Could not parse GitHub repository URL: $REPO_URL"
    exit 1
fi

echo "📋 Repository Information:"
echo "   Username: $USERNAME"
echo "   Repository: $REPO_NAME"
echo "   Expected URL: https://$USERNAME.github.io/$REPO_NAME/"
echo ""

# Check if repository name matches expected base path
if [ "$REPO_NAME" != "Inven-management" ]; then
    echo "⚠️  WARNING: Repository name '$REPO_NAME' doesn't match expected 'Inven-management'"
    echo "   You may need to update the base path in vite.config.ts"
    echo ""
fi

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file missing - this may cause issues"
fi

# Check if Firebase config is present
if grep -q "VITE_FIREBASE_API_KEY" .env 2>/dev/null; then
    echo "✅ Firebase configuration found in .env"
else
    echo "❌ Firebase configuration missing in .env"
fi

# Test build
echo ""
echo "🔨 Testing GitHub Pages build..."
if VITE_GITHUB_PAGES=true GITHUB_PAGES=true npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - check npm run build output"
fi

# Check if dist directory was created
if [ -d "dist" ]; then
    echo "✅ dist directory created"
else
    echo "❌ dist directory not found"
fi

echo ""
echo "📝 Manual Steps Required:"
echo ""
echo "1. 🔧 GitHub Repository Settings:"
echo "   - Go to: https://github.com/$USERNAME/$REPO_NAME/settings/pages"
echo "   - Set Source to 'GitHub Actions'"
echo ""
echo "2. 🔥 Firebase Authorized Domains:"
echo "   - Go to: https://console.firebase.google.com/"
echo "   - Navigate to Authentication > Settings > Authorized domains"
echo "   - Add: $USERNAME.github.io"
echo ""
echo "3. 🚀 Deploy:"
echo "   git add ."
echo "   git commit -m 'Configure GitHub Pages deployment'"
echo "   git push origin main"
echo ""
echo "4. 🌐 Access your site:"
echo "   https://$USERNAME.github.io/$REPO_NAME/"
echo ""
echo "📖 For detailed troubleshooting, see: GITHUB_PAGES_TROUBLESHOOTING.md"
echo ""
echo "✨ Setup script completed!"