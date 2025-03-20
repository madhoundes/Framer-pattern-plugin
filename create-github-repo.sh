#!/bin/bash

# Script to create a GitHub repository using curl
# You'll need to manually run this script with your personal access token

echo "Creating GitHub repository for Framer Grid Pattern Plugin"
echo "=================================================="
echo ""
echo "To create the repository, you'll need to:"
echo "1. Go to https://github.com/settings/tokens and create a new token"
echo "2. Give it 'repo' permissions"
echo "3. Copy the token"
echo "4. Run this script with your token as follows:"
echo "   ./create-github-repo.sh YOUR_TOKEN_HERE"
echo ""

if [ -z "$1" ]; then
  echo "Please provide your GitHub personal access token"
  echo "Example: ./create-github-repo.sh YOUR_TOKEN_HERE"
  exit 1
fi

TOKEN=$1

# Create the repository
echo "Creating repository 'framer-grid-plugin-release'..."
curl -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{
    "name": "framer-grid-plugin-release",
    "description": "Clean version of the Framer Grid Pattern Plugin for submission to Framer Marketplace",
    "private": false,
    "has_issues": true,
    "has_wiki": false
  }'

echo ""
echo "Setting up Git remote..."
git remote add origin https://github.com/madhoundes/framer-grid-plugin-release.git

echo ""
echo "Pushing code to GitHub..."
git push -u origin main

echo ""
echo "Done! Your repository should now be available at:"
echo "https://github.com/madhoundes/framer-grid-plugin-release"
echo ""
echo "Instructions for submitting to Framer Marketplace:"
echo "1. Go to https://framer.com/marketplace/submissions"
echo "2. Click 'New Submission'"
echo "3. Provide the GitHub repository URL: https://github.com/madhoundes/framer-grid-plugin-release"
echo "4. Complete the submission form"
echo "" 