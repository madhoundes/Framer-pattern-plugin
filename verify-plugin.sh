#!/bin/bash

# Script to verify the Framer plugin structure
# This helps ensure the plugin meets Framer's requirements

echo "Verifying Framer Grid Pattern Plugin Structure"
echo "=============================================="
echo ""

# Check if the zip file exists
if [ ! -f "latest-plugin-build.zip" ]; then
  echo "❌ Error: latest-plugin-build.zip file not found"
  exit 1
fi

echo "✅ Plugin zip file found: latest-plugin-build.zip"

# Create a temporary directory for extraction
TEMP_DIR=$(mktemp -d)
echo "Extracting zip to temporary directory for verification..."
unzip -q latest-plugin-build.zip -d "$TEMP_DIR"

# Check for required files
echo ""
echo "Checking for required files:"

# Check framer.json
if [ -f "$TEMP_DIR/framer.json" ]; then
  echo "✅ framer.json exists"
  
  # Validate framer.json content
  if grep -q "\"id\":" "$TEMP_DIR/framer.json" && \
     grep -q "\"name\":" "$TEMP_DIR/framer.json" && \
     grep -q "\"main\":" "$TEMP_DIR/framer.json" && \
     grep -q "\"icon\":" "$TEMP_DIR/framer.json" && \
     grep -q "\"thumbnail\":" "$TEMP_DIR/framer.json"; then
    echo "   ✅ framer.json contains required fields"
  else
    echo "   ❌ framer.json is missing required fields"
  fi
else
  echo "❌ framer.json not found"
fi

# Check main JS file
MAIN_FILE=$(grep -o '"main": "[^"]*"' "$TEMP_DIR/framer.json" | cut -d'"' -f4)
if [ -n "$MAIN_FILE" ] && [ -f "$TEMP_DIR/$MAIN_FILE" ]; then
  echo "✅ Main file ($MAIN_FILE) exists"
else
  echo "❌ Main file ($MAIN_FILE) not found"
fi

# Check index.html
if [ -f "$TEMP_DIR/index.html" ]; then
  echo "✅ index.html exists"
else
  echo "❌ index.html not found"
fi

# Check assets folder
if [ -d "$TEMP_DIR/assets" ]; then
  echo "✅ assets folder exists"
  
  # Check icon.svg
  ICON_PATH=$(grep -o '"icon": "[^"]*"' "$TEMP_DIR/framer.json" | cut -d'"' -f4)
  if [ -f "$TEMP_DIR/$ICON_PATH" ]; then
    echo "   ✅ Icon file ($ICON_PATH) exists"
  else
    echo "   ❌ Icon file ($ICON_PATH) not found"
  fi
  
  # Check thumbnail.svg
  THUMBNAIL_PATH=$(grep -o '"thumbnail": "[^"]*"' "$TEMP_DIR/framer.json" | cut -d'"' -f4)
  if [ -f "$TEMP_DIR/$THUMBNAIL_PATH" ]; then
    echo "   ✅ Thumbnail file ($THUMBNAIL_PATH) exists"
  else
    echo "   ❌ Thumbnail file ($THUMBNAIL_PATH) not found"
  fi
  
  # Check additional thumbnail
  ADD_THUMBNAIL_PATH=$(grep -o '"additionalThumbnail": "[^"]*"' "$TEMP_DIR/framer.json" | cut -d'"' -f4)
  if [ -n "$ADD_THUMBNAIL_PATH" ] && [ -f "$TEMP_DIR/$ADD_THUMBNAIL_PATH" ]; then
    echo "   ✅ Additional thumbnail ($ADD_THUMBNAIL_PATH) exists"
  fi
else
  echo "❌ assets folder not found"
fi

# Check for any API tokens or sensitive information
echo ""
echo "Checking for sensitive information:"
if grep -r "apiKey\|token\|secret\|password\|access_key" --include="*.json" --include="*.js" "$TEMP_DIR"; then
  echo "❌ Warning: Possible sensitive information found in files"
else
  echo "✅ No obvious sensitive information found"
fi

# Summary
echo ""
echo "Verification Summary:"
echo "===================="
echo "Your plugin appears to have the correct structure for submission to Framer Marketplace."
echo ""
echo "Next Steps:"
echo "1. Upload the zip file to Framer Marketplace"
echo "2. If you encounter validation errors, review the specific requirements at:"
echo "   https://www.framer.com/support/marketplace-developer-submissions/publishing-to-the-marketplace/"
echo ""

# Clean up
rm -rf "$TEMP_DIR"
echo "Temporary files cleaned up" 