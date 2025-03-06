import { framer, CanvasNode } from "framer-plugin"
import { useState, useEffect, useRef } from "react"
import "./App.css"

// Node result interface
interface FramerNodeResult {
  id: string;
  [key: string]: any;
}

// Type declarations for the Framer API
declare global {
  interface FramerPluginAPI {
    createImageNodeFromURL(options: { url: string, name: string }): Promise<FramerNodeResult | null>;
    addSVG(options: { svg: string, name: string }): Promise<FramerNodeResult | null>;
    removeNode(id: string): Promise<void>;
  }
}

// Global pattern ID storage
let globalPatternId: string | null = null;

// For debouncing
type Timeout = ReturnType<typeof setTimeout>;

// Define types for Framer API responses
interface FramerNodeResult {
  id: string;
  [key: string]: any;
}

framer.showUI({
    position: "top right",
    width: 380,
    height: 680,
})

function useSelection() {
    const [selection, setSelection] = useState<CanvasNode[]>([])

    useEffect(() => {
        return framer.subscribeToSelection(setSelection)
    }, [])

    return selection
}

// Pattern types
type PatternType = "grid" | "dots";

export function App() {
    const [patternId, setPatternId] = useState<string | null>(globalPatternId);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    
    // Detect system theme and update on changes
    useEffect(() => {
        // Check initial system preference
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        setTheme(mediaQuery.matches ? 'light' : 'dark');
        
        // Add listener for theme changes
        const handleThemeChange = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? 'light' : 'dark');
        };
        
        mediaQuery.addEventListener('change', handleThemeChange);
        
        // Clean up
        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
    }, []);
    
    // Banner state
    const [showBanner, setShowBanner] = useState(true);
    const [bannerExiting, setBannerExiting] = useState(false);
    
    // Handle banner dismissal with animation
    const dismissBanner = () => {
        setBannerExiting(true);
        setTimeout(() => {
            setShowBanner(false);
            setBannerExiting(false);
        }, 300); // Match the CSS transition duration
    };
    
    // Auto-hide banner after 5 minutes if not interacted with
    useEffect(() => {
        if (showBanner) {
            const timer = setTimeout(() => {
                dismissBanner();
            }, 5 * 60 * 1000); // 5 minutes
            
            return () => clearTimeout(timer);
        }
    }, [showBanner]);
    
    // Pattern type
    const [patternType, setPatternType] = useState<PatternType>("grid");
    
    // Grid pattern parameters
    const [lineColor, setLineColor] = useState("#868686")
    const [lineOpacity, setLineOpacity] = useState(100) // Add opacity state (0-100%)
    const [backgroundColor, setBackgroundColor] = useState("#1e1e1e")
    const [transparentBackground, setTransparentBackground] = useState(false)
    const [lineWidth, setLineWidth] = useState(patternType === "dots" ? 2 : 1)
    const [cellSize, setCellSize] = useState(patternType === "dots" ? 27 : 40)
    const [gridSize] = useState(400) // Fixed grid size, no longer user-adjustable
    const [applyToCanvas, setApplyToCanvas] = useState(false)
    const [enableMaskFeather, setEnableMaskFeather] = useState(false)
    const [featherIntensity, setFeatherIntensity] = useState(70) // Default to 70%
    const [featherSize, setFeatherSize] = useState(75) // Increased from 50% to 75% for larger default size
    
    // Rotation control states
    const [rotationAngle, setRotationAngle] = useState(0) // Default to 0 degrees
    const [lockAspectRatio, setLockAspectRatio] = useState(true) // Default to locked
    
    // Random squares control
    const [enableRandomSquares, setEnableRandomSquares] = useState(false) // Default to off
    
    // Border control
    const [enableBorder, setEnableBorder] = useState(true) // Default to enabled borders
    const [borderColor, setBorderColor] = useState("#ffffff") // Default to white border
    
    // Flag to prevent multiple simultaneous updates
    const isUpdatingRef = useRef(false);
    
    // Debounce timer reference
    const debounceTimerRef = useRef<Timeout | null>(null);

    // Generate grid pattern SVG for preview
    const generateGridSVG = () => {
        console.log("---PATTERN DEBUG: generateGridSVG called---");
        const rgbaLineColor = hexToRgba(lineColor, lineOpacity / 100);
        
        // Calculate if we need to apply pattern rotation
        let effectiveSize = gridSize;
        let viewBoxOffsetX = 0;
        let viewBoxOffsetY = 0;
        
        // If rotation is applied and aspect ratio is locked, we need to adjust the viewBox
        if (rotationAngle !== 0 && lockAspectRatio) {
            // Calculate the diagonal length of the grid for proper rotation containment
            effectiveSize = Math.ceil(Math.sqrt(2) * gridSize);
            
            // Center the viewBox on the pattern
            viewBoxOffsetX = (gridSize - effectiveSize) / 2;
            viewBoxOffsetY = (gridSize - effectiveSize) / 2;
        }
        
        // Create SVG with optimized dimensions
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" 
            width="100%" 
            height="100%" 
            viewBox="${viewBoxOffsetX} ${viewBoxOffsetY} ${effectiveSize} ${effectiveSize}"
            preserveAspectRatio="none">`;
        
        // Add clipPath to ensure content stays within bounds
        svgContent += `
            <defs>
                <clipPath id="contentClip">
                    <rect x="0" y="0" width="${gridSize}" height="${gridSize}" />
                </clipPath>`;
        
        // Define radial gradient mask if enabled
        if (enableMaskFeather) {
            // Calculate intermediate stops for smoother transition
            const innerStop = Math.max(0, featherIntensity - 30);
            const midStop1 = Math.max(innerStop, featherIntensity - 20);
            const midStop2 = Math.min(100, featherIntensity + 20);
            const outerStop = Math.min(100, featherIntensity + 40);
            
            // Calculate the radius based on featherSize (as a percentage of gridSize)
            // Increased from gridSize/2 to gridSize*0.75 to make the shape larger
            const featherRadius = (featherSize / 100) * (gridSize * 0.75);
            
            svgContent += `
                <mask id="featherMask">
                    <rect x="0" y="0" width="${gridSize}" height="${gridSize}" fill="black" />
                    <radialGradient id="maskGradient" cx="50%" cy="50%" r="${featherSize}%" fx="50%" fy="50%" gradientUnits="objectBoundingBox">
                        <stop offset="0%" stop-color="white" stop-opacity="1" />
                        <stop offset="${innerStop}%" stop-color="white" stop-opacity="0.95" />
                        <stop offset="${midStop1}%" stop-color="white" stop-opacity="0.8" />
                        <stop offset="${featherIntensity}%" stop-color="white" stop-opacity="0.6" />
                        <stop offset="${midStop2}%" stop-color="white" stop-opacity="0.3" />
                        <stop offset="${outerStop}%" stop-color="white" stop-opacity="0.1" />
                        <stop offset="100%" stop-color="white" stop-opacity="0" />
                    </radialGradient>
                    <circle cx="${gridSize/2}" cy="${gridSize/2}" r="${featherRadius}" fill="url(#maskGradient)" />
                </mask>`;
        }
        
        svgContent += `</defs>`;
        
        // Add background
        svgContent += `<rect width="${gridSize}" height="${gridSize}" fill="${transparentBackground ? 'transparent' : backgroundColor}" />`;
        
        // Start a group that will be masked if feathering is enabled and clipped to content bounds
        svgContent += `<g ${enableMaskFeather ? 'mask="url(#featherMask)"' : ''} clip-path="url(#contentClip)">`;
        
        if (patternType === "grid") {
            if (enableRandomSquares) {
                // Group that will contain both random squares and grid lines with rotation applied
                svgContent += `<g ${rotationAngle !== 0 ? `transform="rotate(${rotationAngle}, ${gridSize/2}, ${gridSize/2})"` : ''}>`;
                
                // Generate pattern with random squares of different fill levels
                // Use a deterministic seeded random for consistency and SVG size optimization
                // This approach uses fewer individual elements and relies on patterns where possible
                
                // Create SVG patterns for each fill level we need
                svgContent += `<defs>
                    <!-- Grid pattern -->
                    <pattern id="gridPattern" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                        <path d="M ${cellSize} 0 L 0 0 0 ${cellSize}" fill="none" stroke="${rgbaLineColor}" stroke-width="${lineWidth}" />
                    </pattern>
                    
                    <!-- Define patterns for each fill level -->
                    <pattern id="fill100" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                        <rect width="${cellSize-1}" height="${cellSize-1}" fill="${lineColor}" stroke="none" stroke-width="0" />
                    </pattern>
                    
                    <pattern id="fill50" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                        <rect width="${cellSize-1}" height="${cellSize-1}" fill="${lineColor}" fill-opacity="0.5" stroke="none" stroke-width="0" />
                    </pattern>
                    
                    <pattern id="fill3" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                        <rect width="${cellSize-1}" height="${cellSize-1}" fill="${lineColor}" fill-opacity="0.03" stroke="none" stroke-width="0" />
                    </pattern>
                    
                    <pattern id="fillNone" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                        <rect width="${cellSize-1}" height="${cellSize-1}" fill="none" stroke="none" stroke-width="0" />
                    </pattern>
                </defs>`;
                
                // Add the grid pattern as the base
                svgContent += `<rect 
                    x="0" 
                    y="0" 
                    width="${gridSize}" 
                    height="${gridSize}" 
                    fill="url(#gridPattern)" 
                />`;
                
                // Calculate how many cells we need
                const numCells = Math.floor(gridSize / cellSize);
                
                // Increase density with a higher fixed percentage and higher maximum
                // This ensures consistent visual appearance regardless of cell size
                const maxSquares = Math.min(24, Math.floor(numCells * numCells * 0.25));
                console.log(`PATTERN DEBUG: Using ${maxSquares} squares with improved distribution`);
                
                // Use a fixed seed that only depends on cell size and grid size
                // This ensures line width and opacity changes don't affect square placement
                const seed = cellSize * 100 + gridSize;
                let randomValue = seed;
                
                // Function to get deterministic "random" values
                const getSeededRandom = () => {
                    randomValue = (randomValue * 9301 + 49297) % 233280;
                    return randomValue / 233280;
                };
                
                // Create a compact representation using arrays and join for better performance
                // This avoids concatenating strings in a loop which is inefficient
                const squareElements = [];
                
                // Divide the grid into sections to ensure better distribution
                const gridSections = Math.max(3, Math.floor(Math.sqrt(maxSquares)));
                const sectionSize = numCells / gridSections;
                
                // Place multiple squares in each section for better distribution and density
                for (let sectionY = 0; sectionY < gridSections; sectionY++) {
                    for (let sectionX = 0; sectionX < gridSections; sectionX++) {
                        // Higher probability of including a section (80% chance)
                        if (getSeededRandom() > 0.8) continue;
                        
                        // Calculate section boundaries
                        const startX = Math.floor(sectionX * sectionSize);
                        const startY = Math.floor(sectionY * sectionSize);
                        const endX = Math.floor((sectionX + 1) * sectionSize);
                        const endY = Math.floor((sectionY + 1) * sectionSize);
                        
                        // Add 1-2 squares per section for higher density
                        const squaresInSection = 1 + Math.floor(getSeededRandom() * 2);
                        
                        for (let i = 0; i < squaresInSection; i++) {
                            // Random position within this section
                            const randomX = startX + Math.floor(getSeededRandom() * (endX - startX));
                            const randomY = startY + Math.floor(getSeededRandom() * (endY - startY));
                            
                            const x = randomX * cellSize;
                            const y = randomY * cellSize;
                            
                            // Determine which pattern to use based on "random" value
                            // The opacity distribution is independent of the placement
                            const random = getSeededRandom();
                            let patternId;
                            
                            if (random > 0.7) {
                                patternId = "fill100"; // 30% chance of full opacity
                            } else if (random > 0.4) {
                                patternId = "fill50";  // 30% chance of 50% opacity
                            } else if (random > 0.1) {
                                patternId = "fill3";   // 30% chance of 3% opacity
                            } else {
                                patternId = "fillNone"; // 10% chance of no fill
                            }
                            
                            // Add square to our array - using minimal spacing to reduce SVG size
                            squareElements.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="url(#${patternId})"/>`);
                        }
                    }
                }
                
                // Join all squares at once for better performance
                svgContent += squareElements.join('');
                
                // Close the group with rotation
                svgContent += `</g>`;
            } else {
                // Use SVG pattern definition instead of individual lines for better performance and smaller size
                svgContent += `<defs>
                    <pattern id="gridPattern" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                        <path d="M ${cellSize} 0 L 0 0 0 ${cellSize}" fill="none" stroke="${rgbaLineColor}" stroke-width="${lineWidth}" />
                    </pattern>
                </defs>`;
                
                // Use a single rectangle with the pattern fill instead of individual lines
                svgContent += `<rect 
                    x="0" 
                    y="0" 
                    width="${gridSize}" 
                    height="${gridSize}" 
                    fill="url(#gridPattern)" 
                    ${rotationAngle !== 0 ? `transform="rotate(${rotationAngle}, ${gridSize/2}, ${gridSize/2})"` : ''}
                />`;
            }
        } else if (patternType === "dots") {
            // Use SVG pattern definition for dots with halftone effect
            svgContent += `<defs>
                <pattern id="dotsPattern" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                    <circle cx="${cellSize/2}" cy="${cellSize/2}" r="${lineWidth * 2}" fill="${rgbaLineColor}" />
                </pattern>
            </defs>`;
            
            // Use a single rectangle with the pattern fill
            svgContent += `<rect 
                x="0" 
                y="0" 
                width="${gridSize}" 
                height="${gridSize}" 
                fill="url(#dotsPattern)" 
                ${rotationAngle !== 0 ? `transform="rotate(${rotationAngle}, ${gridSize/2}, ${gridSize/2})"` : ''}
            />`;
        }
        
        // Close the group
        svgContent += `</g>`;
        
        svgContent += `</svg>`;
        return svgContent;
    };

    // Helper function to convert hex color to rgba
    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Update preview with more robust error handling and forced refresh
    const updatePreview = () => {
        console.log("PATTERN DEBUG: updatePreview called with lineWidth:", lineWidth);
        try {
            if (previewRef.current) {
                const svgContent = generateGridSVG();
                
                // Create a wrapper div to ensure proper centering and full width
                previewRef.current.innerHTML = `
                    <div class="pattern-wrapper">
                        ${svgContent}
                    </div>
                `;
                
                // Ensure SVG fills the container
                const svgElement = previewRef.current.querySelector('svg');
                if (svgElement) {
                    svgElement.style.width = '100%';
                    svgElement.style.height = '100%';
                    svgElement.setAttribute('preserveAspectRatio', 'none');
                }
                
                // Force a repaint by toggling a class
                previewRef.current.classList.remove('preview-updated');
                setTimeout(() => {
                    if (previewRef.current) {
                        previewRef.current.classList.add('preview-updated');
                    }
                }, 0);
            } else {
                console.warn("PATTERN DEBUG: previewRef.current is null");
            }
        } catch (err) {
            console.error("PATTERN DEBUG: Error updating preview:", err);
        }
    };

    // Remove existing pattern if it exists
    const removeExistingPattern = async () => {
        console.log("---PATTERN DEBUG: removeExistingPattern called---");
        console.log("Current globalPatternId:", globalPatternId);
        
        if (globalPatternId) {
            try {
                await framer.removeNode(globalPatternId);
                console.log("PATTERN DEBUG: Successfully removed pattern:", globalPatternId);
            } catch (error) {
                console.error("PATTERN DEBUG: Failed to remove pattern:", globalPatternId, error);
            }
            console.log("PATTERN DEBUG: Setting globalPatternId to null");
            globalPatternId = null;
            setPatternId(null);
        } else {
            console.log("PATTERN DEBUG: No pattern to remove");
        }
    };

    // Helper function to simplify random squares pattern when SVG gets too large
    const generateSimplifiedRandomSquares = () => {
        console.log("PATTERN DEBUG: Generating simplified random squares pattern");
        const rgbaLineColor = hexToRgba(lineColor, lineOpacity / 100);
        
        // Automatically scale up cell size based on how small the original was
        // Smaller original cell sizes need more scaling to prevent SVG size issues
        let scaleFactor;
        if (cellSize < 15) {
            scaleFactor = 3.5; // Very small cells need significant scaling
        } else if (cellSize < 20) {
            scaleFactor = 3; // Small cells need more scaling
        } else if (cellSize < 25) {
            scaleFactor = 2.5; // Medium-small cells need moderate scaling
        } else {
            scaleFactor = 2; // Default scaling for larger cells
        }
        
        // Adjusted cell size with more aggressive scaling for smaller values
        const simplifiedCellSize = Math.max(Math.ceil(cellSize * scaleFactor), 40); // Increased minimum to 40px
        console.log(`PATTERN DEBUG: Simplified cell size: ${simplifiedCellSize}px (scale factor: ${scaleFactor}x)`);
        
        // Calculate simplified grid parameters
        const numCells = Math.floor(gridSize / simplifiedCellSize);
        
        // Increase density with a higher fixed percentage and higher maximum
        const maxSquares = Math.min(24, Math.floor(numCells * numCells * 0.25));
        console.log(`PATTERN DEBUG: Using ${maxSquares} squares with improved distribution`);
        
        // Create SVG with optimized dimensions
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${gridSize} ${gridSize}" preserveAspectRatio="none" overflow="hidden">`;
        
        // Add clipPath to ensure content stays within bounds
        svgContent += `
            <defs>
                <clipPath id="contentClip">
                    <rect x="0" y="0" width="${gridSize}" height="${gridSize}" />
                </clipPath>
                
                <!-- Define patterns for grid lines and fill levels -->
                <pattern id="simplifiedGridPattern" width="${simplifiedCellSize}" height="${simplifiedCellSize}" patternUnits="userSpaceOnUse">
                    <path d="M ${simplifiedCellSize} 0 L 0 0 0 ${simplifiedCellSize}" fill="none" stroke="${rgbaLineColor}" stroke-width="${lineWidth}" />
                </pattern>
                
                <!-- Fill patterns with different opacities -->
                <pattern id="fill100" width="${simplifiedCellSize}" height="${simplifiedCellSize}" patternUnits="userSpaceOnUse">
                    <rect width="${simplifiedCellSize-1}" height="${simplifiedCellSize-1}" fill="${lineColor}" stroke="none" />
                </pattern>
                
                <pattern id="fill50" width="${simplifiedCellSize}" height="${simplifiedCellSize}" patternUnits="userSpaceOnUse">
                    <rect width="${simplifiedCellSize-1}" height="${simplifiedCellSize-1}" fill="${lineColor}" fill-opacity="0.5" stroke="none" />
                </pattern>
                
                <pattern id="fill20" width="${simplifiedCellSize}" height="${simplifiedCellSize}" patternUnits="userSpaceOnUse">
                    <rect width="${simplifiedCellSize-1}" height="${simplifiedCellSize-1}" fill="${lineColor}" fill-opacity="0.2" stroke="none" />
                </pattern>
            </defs>`;
        
        // Add background
        svgContent += `<rect width="${gridSize}" height="${gridSize}" fill="${transparentBackground ? 'transparent' : backgroundColor}" />`;
        
        // Add base grid with rotation if needed - with clip path
        svgContent += `<g ${rotationAngle !== 0 ? `transform="rotate(${rotationAngle}, ${gridSize/2}, ${gridSize/2})"` : ''} clip-path="url(#contentClip)">`;
        
        // Add the grid pattern as the base
        svgContent += `<rect 
            x="0" 
            y="0" 
            width="${gridSize}" 
            height="${gridSize}" 
            fill="url(#simplifiedGridPattern)" 
        />`;
        
        // Use a fixed seed that only depends on cell size and grid size
        // This ensures line width and opacity changes don't affect square placement
        const seed = simplifiedCellSize * 100 + gridSize;
        let randomValue = seed;
        
        // Function to get deterministic "random" values
        const getSeededRandom = () => {
            randomValue = (randomValue * 9301 + 49297) % 233280;
            return randomValue / 233280;
        };
        
        // Create a compact representation using arrays and join for better performance
        const squareElements = [];
        
        // Divide the grid into sections to ensure better distribution
        const gridSections = Math.max(3, Math.floor(Math.sqrt(maxSquares)));
        const sectionSize = numCells / gridSections;
        
        // Place multiple squares in each section for better distribution and density
        for (let sectionY = 0; sectionY < gridSections; sectionY++) {
            for (let sectionX = 0; sectionX < gridSections; sectionX++) {
                // Higher probability of including a section (80% chance)
                if (getSeededRandom() > 0.8) continue;
                
                // Calculate section boundaries
                const startX = Math.floor(sectionX * sectionSize);
                const startY = Math.floor(sectionY * sectionSize);
                const endX = Math.floor((sectionX + 1) * sectionSize);
                const endY = Math.floor((sectionY + 1) * sectionSize);
                
                // Add 1-2 squares per section for higher density
                const squaresInSection = 1 + Math.floor(getSeededRandom() * 2);
                
                for (let i = 0; i < squaresInSection; i++) {
                    // Random position within this section
                    const randomX = startX + Math.floor(getSeededRandom() * (endX - startX));
                    const randomY = startY + Math.floor(getSeededRandom() * (endY - startY));
                    
                    const x = randomX * simplifiedCellSize;
                    const y = randomY * simplifiedCellSize;
                    
                    // Determine which pattern to use based on "random" value
                    // The opacity distribution is independent of the placement
                    const random = getSeededRandom();
                    let fillPattern;
                    
                    if (random > 0.7) {
                        fillPattern = "url(#fill100)"; // 30% chance of full opacity
                    } else if (random > 0.4) {
                        fillPattern = "url(#fill50)";  // 30% chance of 50% opacity
                    } else {
                        fillPattern = "url(#fill20)";  // 40% chance of 20% opacity
                    }
                    
                    // Add square with pattern reference for better visual consistency
                    squareElements.push(`<rect x="${x}" y="${y}" width="${simplifiedCellSize}" height="${simplifiedCellSize}" fill="${fillPattern}" />`);
                }
            }
        }
        
        // Join all squares at once for better performance
        svgContent += squareElements.join('');
        
        // Close the group
        svgContent += `</g>`;
        
        svgContent += `</svg>`;
        return svgContent;
    };

    // Apply pattern to canvas
    const applyPatternToCanvas = async () => {
        console.log("---PATTERN DEBUG: applyPatternToCanvas called---");
        console.log("PATTERN DEBUG: Current pattern type:", patternType);
        console.log("PATTERN DEBUG: Settings:", {
            lineColor,
            lineOpacity,
            backgroundColor,
            transparentBackground,
            lineWidth,
            cellSize,
            patternType,
            enableMaskFeather,
            featherIntensity,
            featherSize,
            rotationAngle,
            lockAspectRatio
        });
        
        if (isUpdatingRef.current) {
            console.log("PATTERN DEBUG: Update already in progress, skipping");
            return;
        }

        console.log("PATTERN DEBUG: Setting isUpdatingRef to true");
        isUpdatingRef.current = true;
        
        try {
            // First remove existing pattern
            console.log("PATTERN DEBUG: Calling removeExistingPattern");
            await removeExistingPattern();
            
            // Create SVG pattern
            console.log("PATTERN DEBUG: Generating SVG");
            let gridSVG = generateGridSVG();
            
            // Log SVG size for debugging
            console.log(`PATTERN DEBUG: SVG size: ${gridSVG.length} characters`);
            
            // Optimize random squares pattern when cell size is small
            if (patternType === "grid" && enableRandomSquares) {
                // Preemptively use simplified pattern for small cell sizes to avoid issues
                if (cellSize < 25) {
                    console.log(`PATTERN DEBUG: Preemptively using simplified pattern for small cell size (${cellSize}px)`);
                    gridSVG = generateSimplifiedRandomSquares();
                    console.log(`PATTERN DEBUG: Simplified SVG size: ${gridSVG.length} characters`);
                }
                // For larger patterns that would still exceed size limits
                else if (gridSVG.length > 10000) {
                    console.log("PATTERN DEBUG: SVG is extremely large, using simplified random squares");
                    gridSVG = generateSimplifiedRandomSquares();
                    console.log(`PATTERN DEBUG: Simplified SVG size: ${gridSVG.length} characters`);
                }
            }
            
            // Log SVG content for debugging (truncated for large SVGs)
            const svgPreview = gridSVG.length > 200 ? 
                gridSVG.substring(0, 100) + "..." + gridSVG.substring(gridSVG.length - 100) : 
                gridSVG;
            console.log("PATTERN DEBUG: SVG Preview:", svgPreview);
            
            // Check if SVG is too large for direct use
            if (gridSVG.length > 4000) {
                console.log(`PATTERN DEBUG: SVG is large (${gridSVG.length} chars). Using compression and Base64 encoding.`);
                
                try {
                    // First try to compress the SVG by removing unnecessary whitespace
                    const compressedSVG = gridSVG
                        .replace(/\s+/g, ' ')               // Replace multiple spaces with single space
                        .replace(/>\s+</g, '><')            // Remove spaces between tags
                        .replace(/\s+>/g, '>')              // Remove spaces before closing brackets
                        .replace(/<!--[\s\S]*?-->/g, '')    // Remove comments
                        .replace(/\n/g, '')                 // Remove newlines
                        .replace(/\t/g, '')                 // Remove tabs
                        // Normalize viewBox to ensure proper spacing
                        .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${gridSize} ${gridSize}"`);
                    
                    console.log(`PATTERN DEBUG: Compressed SVG size: ${compressedSVG.length} characters`);
                    
                    // Ensure the clipPath is properly applied to all elements
                    const finalSVG = ensureClipPathIsApplied(compressedSVG);
                    console.log(`PATTERN DEBUG: Final SVG size after ensuring clipPath: ${finalSVG.length} characters`);
                    
                    // If compression was enough to get under the limit, use the compressed SVG directly
                    if (finalSVG.length <= 4000) {
                        console.log("PATTERN DEBUG: Compression successful, using direct SVG method");
                        try {
                            const result = await framer.addSVG({
                                svg: finalSVG,
                                name: patternType === "grid" ? "GridPattern" : patternType === "dots" ? "DotsPattern" : "PolygonPattern",
                            });
                            
                            if (result && 'id' in result) {
                                console.log("PATTERN DEBUG: Successfully created pattern with ID:", result.id);
                                globalPatternId = result.id;
                                setPatternId(result.id);
                                console.log("PATTERN DEBUG: globalPatternId set to:", globalPatternId);
                                return; // Exit early if successful
                            }
                        } catch (err) {
                            console.error("PATTERN DEBUG: Error in direct SVG method:", err);
                            // Continue with base64 approach
                        }
                    }
                    
                    // If still too large, try Base64 encoding
                    const svgBase64 = btoa(finalSVG);
                    const dataURL = `data:image/svg+xml;base64,${svgBase64}`;
                    
                    // Create an image using the image tag method
                    console.log("PATTERN DEBUG: Adding image using image tag method");
                    try {
                        const result = await framer.createImageNodeFromURL({
                            url: dataURL,
                            name: patternType === "grid" ? "GridPattern" : patternType === "dots" ? "DotsPattern" : "PolygonPattern"
                        });
                        
                        if (result && 'id' in result) {
                            console.log("PATTERN DEBUG: Successfully created pattern with ID:", result.id);
                            globalPatternId = result.id;
                            setPatternId(result.id);
                            console.log("PATTERN DEBUG: globalPatternId set to:", globalPatternId);
                        } else {
                            throw new Error("Failed to create pattern - no result or result.id");
                        }
                    } catch (err) {
                        console.error("PATTERN DEBUG: Error with image URL method:", err);
                        throw err; // Re-throw to be caught by the outer catch
                    }
                } catch (error) {
                    console.error("PATTERN DEBUG: Error creating image node:", error);
                    
                    // Fallback to a simpler pattern with larger cell size
                    console.log("PATTERN DEBUG: Falling back to simplified pattern");
                    alert("Pattern too complex. Using simplified version.");
                    
                    // Create a simpler SVG with larger cell size
                    const simplifiedCellSize = Math.max(cellSize * 2, 20);
                    setCellSize(simplifiedCellSize);
                    
                    // Try again with the direct SVG method
                    const simplifiedSVG = generateGridSVG();
                    
                    // Ensure the clipPath is properly applied
                    const finalSimplifiedSVG = ensureClipPathIsApplied(simplifiedSVG);
                    
                    try {
                        const result = await framer.addSVG({
                            svg: finalSimplifiedSVG,
                            name: patternType === "grid" ? "GridPattern" : patternType === "dots" ? "DotsPattern" : "PolygonPattern",
                        });
                        
                        if (result && 'id' in result) {
                            console.log("PATTERN DEBUG: Successfully created simplified pattern with ID:", result.id);
                            globalPatternId = result.id;
                            setPatternId(result.id);
                        }
                    } catch (err) {
                        console.error("PATTERN DEBUG: Error with simplified SVG:", err);
                        // We've already shown an error to the user at this point
                    }
                }
            } else {
                // For smaller SVGs, use the direct SVG method
                console.log("PATTERN DEBUG: Adding SVG to canvas");
                try {
                    // Ensure the clipPath is properly applied
                    const finalSVG = ensureClipPathIsApplied(gridSVG);
                    
                    const result = await framer.addSVG({
                        svg: finalSVG,
                        name: patternType === "grid" ? "GridPattern" : patternType === "dots" ? "DotsPattern" : "PolygonPattern",
                    });
                    
                    if (result && 'id' in result) {
                        console.log("PATTERN DEBUG: Successfully created pattern with ID:", result.id);
                        globalPatternId = result.id;
                        setPatternId(result.id);
                        console.log("PATTERN DEBUG: globalPatternId set to:", globalPatternId);
                    } else {
                        console.error("PATTERN DEBUG: Failed to create pattern, no ID returned");
                    }
                } catch (err) {
                    console.error("PATTERN DEBUG: Error adding SVG to canvas:", err);
                    throw err; // Re-throw to be caught by the outer catch
                }
            }
        } catch (error) {
            console.error("PATTERN DEBUG: Error applying pattern:", error);
            // Show error in UI
            if (previewRef.current) {
                if (String(error).includes("too large") || String(error).includes("size limit")) {
                    // Show a more helpful error for size issues
                    previewRef.current.innerHTML = `
                        <div class="error-message">
                            <strong>Error: SVG is too large. Max size is 4kB.</strong>
                            <p>Your pattern is too complex. Try these solutions:</p>
                            <ul>
                                <li>Increase the cell size (currently ${cellSize}px)</li>
                                <li>Disable random squares</li>
                                <li>Reduce the line width</li>
                                <li>Try a different pattern type</li>
                            </ul>
                        </div>
                    `;
                } else {
                    previewRef.current.innerHTML = `<div class="error-message">Error: ${error instanceof Error ? error.message : "Failed to apply pattern to canvas"}</div>`;
                }
            }
        } finally {
            console.log("PATTERN DEBUG: Setting isUpdatingRef to false");
            isUpdatingRef.current = false;
        }
    };

    // Handle generate button click
    const handleGeneratePattern = async () => {
        console.log("---PATTERN DEBUG: handleGeneratePattern clicked---");
        await applyPatternToCanvas();
    };

    // Handle pattern type change
    const handlePatternTypeChange = (type: PatternType) => {
        setPatternType(type);
        // Set appropriate defaults based on pattern type
        if (type === "dots") {
            setLineWidth(2); // 4px circle size (r = lineWidth * 2)
            setCellSize(27); // 27px spacing
        } else {
            setLineWidth(1); // Default line width for grid
            setCellSize(40); // Default cell size for grid
        }
    };

    // Update effect to fix line width slider
    useEffect(() => {
        console.log("PATTERN DEBUG: Line width changed to:", lineWidth);
        // Update preview when line width changes
        updatePreview();
    }, [lineWidth]);

    // Update preview when any parameter changes
    useEffect(() => {
        // Update preview in plugin UI
        updatePreview();
    }, [lineColor, lineOpacity, backgroundColor, transparentBackground, cellSize, patternType, enableMaskFeather, featherIntensity, featherSize, rotationAngle, lockAspectRatio, enableRandomSquares]);

    // Add a reset function to restore default values
    const handleReset = () => {
        console.log("---PATTERN DEBUG: handleReset called---");
        setLineColor("#868686");
        setLineOpacity(100);
        setBackgroundColor("#1e1e1e");
        setTransparentBackground(false);
        setLineWidth(patternType === "dots" ? 2 : 1);
        setCellSize(patternType === "dots" ? 27 : 40);
        setPatternType("grid");
        setEnableMaskFeather(false);
        setFeatherIntensity(70);
        setFeatherSize(75);
        setRotationAngle(0);
        setLockAspectRatio(true);
        setEnableRandomSquares(false);
        
        // Update the preview with reset values
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        updatePreview();
    };

    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Initial preview render
    useEffect(() => {
        updatePreview();
        
        // Add error styles to document
        const style = document.createElement('style');
        style.textContent = errorStyles + additionalStyles;
        document.head.appendChild(style);
        
        return () => {
            // Cleanup styles on unmount
            document.head.removeChild(style);
        };
    }, []);

    // Helper function to ensure clipPath is properly applied to all elements
    const ensureClipPathIsApplied = (svgString: string) => {
        // Check if clipPath is already defined
        if (!svgString.includes('clipPath id="contentClip"')) {
            // Add clipPath definition if it doesn't exist
            svgString = svgString.replace('<defs>', `<defs><clipPath id="contentClip"><rect x="0" y="0" width="${gridSize}" height="${gridSize}" /></clipPath>`);
            
            // If there's no defs section, add one
            if (!svgString.includes('<defs>')) {
                svgString = svgString.replace('<svg', `<svg><defs><clipPath id="contentClip"><rect x="0" y="0" width="${gridSize}" height="${gridSize}" /></clipPath></defs>`);
            }
        }
        
        // Find the main group element and ensure it has the clip-path attribute
        if (!svgString.includes('clip-path="url(#contentClip)"')) {
            // Add clip-path to the first group element if it doesn't have one
            svgString = svgString.replace(/<g([^>]*)>/, (match, p1) => {
                // Only add clip-path if it's not already there
                if (!p1.includes('clip-path')) {
                    return `<g${p1} clip-path="url(#contentClip)">`;
                }
                return match;
            });
        }
        
        return svgString;
    };

    return (
        <div className={`plugin-container ${theme}-theme`}>
            {showBanner && (
                <div className={`sticky-banner ${bannerExiting ? 'banner-exit' : ''}`}>
                    <div className="banner-content">
                        <div className="banner-text">
                            <h2 className="banner-headline">Check latest template</h2>
                            <p className="banner-description">Enhance your workflow with different variations of section and pages templates</p>
                        </div>
                        <div className="banner-actions">
                            <button 
                                className="banner-cta-button banner-cta-primary"
                                onClick={() => window.open('https://www.framer.com/marketplace/templates/syndicatebusiness/', '_blank')}
                            >
                                Get Templates
                            </button>
                            <button 
                                className="banner-cta-button banner-cta-secondary"
                                onClick={() => window.open('https://www.framer.com/@ahmed-almadhoun/', '_blank')}
                            >
                                Hire me
                            </button>
                        </div>
                        <button 
                            className="banner-close-button" 
                            onClick={(e) => {
                                e.stopPropagation();
                                dismissBanner();
                            }}
                            aria-label="Close banner"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <g clipPath="url(#clip0_32_143)">
                                    <path d="M15.25 4.75834C14.925 4.43334 14.4 4.43334 14.075 4.75834L9.99998 8.82501L5.92498 4.75001C5.59998 4.42501 5.07498 4.42501 4.74998 4.75001C4.42498 5.07501 4.42498 5.60001 4.74998 5.92501L8.82498 10L4.74998 14.075C4.42498 14.4 4.42498 14.925 4.74998 15.25C5.07498 15.575 5.59998 15.575 5.92498 15.25L9.99998 11.175L14.075 15.25C14.4 15.575 14.925 15.575 15.25 15.25C15.575 14.925 15.575 14.4 15.25 14.075L11.175 10L15.25 5.92501C15.5666 5.60834 15.5666 5.07501 15.25 4.75834Z" fill="#C4C4C4"/>
                                </g>
                                <defs>
                                    <clipPath id="clip0_32_143">
                                        <rect width="20" height="20" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
            <div className="preview-panel">
                <h3>Pattern Preview</h3>
                <div className="preview-container">
                    <div ref={previewRef} className="preview-content"></div>
                </div>
            </div>
            
            <div className="controls-panel">
                <h3>Grid Pattern Generator</h3>
                
                {/* Pattern Type Selector */}
                <div className="pattern-type-selector">
                    <div 
                        className={`pattern-type-option ${patternType === 'grid' ? 'active' : ''}`}
                        onClick={() => handlePatternTypeChange('grid')}
                    >
                        Grid
                    </div>
                    <div 
                        className={`pattern-type-option ${patternType === 'dots' ? 'active' : ''}`}
                        onClick={() => handlePatternTypeChange('dots')}
                    >
                        Dots
                    </div>
                </div>
                
                {/* Color Controls */}
                <div className="control-group">
                    <label>Color</label>
                    <div className="color-input-container">
                        <div className="color-swatch" style={{ backgroundColor: lineColor }}></div>
                        <span className="color-value">{lineColor}</span>
                        <input 
                            type="color" 
                            value={lineColor} 
                            onChange={(e) => setLineColor(e.target.value)} 
                        />
                    </div>
                </div>
                
                <div className="control-group background-control">
                    <label>Background</label>
                    <div className="color-input-container">
                        <div className="color-swatch" style={{ backgroundColor: backgroundColor }}></div>
                        <span className="color-value">{backgroundColor}</span>
                        <input 
                            type="color" 
                            value={backgroundColor} 
                            onChange={(e) => setBackgroundColor(e.target.value)} 
                            disabled={transparentBackground}
                        />
                    </div>
                </div>
                
                <div className="control-group checkbox">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={transparentBackground} 
                            onChange={(e) => setTransparentBackground(e.target.checked)} 
                        />
                        Transparent Background
                    </label>
                </div>
                
                {/* Random Squares Control - only show for grid pattern */}
                {patternType === "grid" && (
                    <div className="control-group">
                        <label>Random Squares</label>
                        <div className="toggle-container">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={enableRandomSquares}
                                    onChange={(e) => {
                                        const isEnabled = e.target.checked;
                                        
                                        // If enabling random squares with very small cell size, automatically increase cell size
                                        if (isEnabled && cellSize < 20) {
                                            const previousCellSize = cellSize;
                                            setCellSize(20);
                                            
                                            // Show a toast message
                                            const toast = document.createElement('div');
                                            toast.className = 'toast-message';
                                            toast.innerHTML = `<strong>Cell size adjusted</strong><br>Increased from ${previousCellSize}px to 20px<br><span class="toast-hint">Random Squares require larger cell sizes</span>`;
                                            document.body.appendChild(toast);
                                            
                                            // Remove after 4 seconds
                                            setTimeout(() => {
                                                if (document.body.contains(toast)) {
                                                    document.body.removeChild(toast);
                                                }
                                            }, 4000);
                                            
                                            // Update preview after adjustment
                                            setTimeout(() => {
                                                updatePreview();
                                            }, 100);
                                        }
                                        
                                        // Set the state after any adjustments
                                        setEnableRandomSquares(isEnabled);
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        {enableRandomSquares && (
                            <div className="feature-hint">
                                Requires cell size ≥ 20px
                            </div>
                        )}
                    </div>
                )}
                
                {/* Mask Feather Control */}
                {(patternType === "grid" || patternType === "dots") && (
                    <div className="control-group">
                        <label>Enable Mask Feather</label>
                        <div className="toggle-container">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={enableMaskFeather}
                                    onChange={(e) => setEnableMaskFeather(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                )}
                
                {/* Feather Intensity Slider - only visible when mask feather is enabled */}
                {enableMaskFeather && (patternType === "grid" || patternType === "dots") && (
                    <div className="control-group" style={{ 
                        transition: 'opacity 0.3s ease, max-height 0.3s ease',
                        opacity: 1,
                        maxHeight: '100px',
                        overflow: 'hidden'
                    }}>
                        <label>Feather Intensity</label>
                        <div className="slider-container">
                            <div className="value-display">{featherIntensity}%</div>
                            <div className="slider-track">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    step="1"
                                    value={featherIntensity} 
                                    onChange={(e) => setFeatherIntensity(parseInt(e.target.value))} 
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Feather Size Slider - only visible when mask feather is enabled */}
                {enableMaskFeather && (patternType === "grid" || patternType === "dots") && (
                    <div className="control-group" style={{ 
                        transition: 'opacity 0.3s ease, max-height 0.3s ease',
                        opacity: 1,
                        maxHeight: '100px',
                        overflow: 'hidden'
                    }}>
                        <label>Feather Size</label>
                        <div className="slider-container">
                            <div className="value-display">{featherSize}%</div>
                            <div className="slider-track">
                                <input 
                                    type="range" 
                                    min="20" 
                                    max="120" 
                                    step="5"
                                    value={featherSize} 
                                    onChange={(e) => setFeatherSize(parseInt(e.target.value))} 
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Line Width - only show for grid and dots patterns */}
                {patternType !== "polygon" && (
                    <div className="control-group">
                        <label>{patternType === "dots" ? "Circle Size" : "Line Width"}</label>
                        <div className="slider-container">
                            <div className="value-display">{lineWidth}</div>
                            <div className="slider-track">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    step="1"
                                    value={lineWidth} 
                                    onChange={(e) => {
                                        // Get the new value
                                        const val = parseInt(e.target.value);
                                        console.log("DIRECT UPDATE: Setting line width to:", val);
                                        
                                        // Update state
                                        setLineWidth(val);
                                        
                                        // Direct DOM update for preview
                                        if (previewRef.current) {
                                            // Generate new SVG with updated line width
                                            const newSvg = document.createElement('div');
                                            // Use the new value directly in SVG generation
                                            const rgbaLineColor = hexToRgba(lineColor, lineOpacity / 100);
                                            
                                            let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${gridSize}" height="${gridSize}" viewBox="0 0 ${gridSize} ${gridSize}" preserveAspectRatio="xMidYMid meet">`;
                                            
                                            // Add clipPath to ensure content stays within bounds
                                            svgContent += `
                                                <defs>
                                                    <clipPath id="contentClip">
                                                        <rect x="0" y="0" width="${gridSize}" height="${gridSize}" />
                                                    </clipPath>`;
                                            
                                            // Define radial gradient mask if enabled
                                            if (enableMaskFeather) {
                                                // Calculate the radius based on featherSize (as a percentage of gridSize)
                                                // Increased from gridSize/2 to gridSize*0.75 to make the shape larger
                                                const featherRadius = (featherSize / 100) * (gridSize * 0.75);
                                                
                                                // Calculate intermediate stops for smoother transition
                                                const innerStop = Math.max(0, featherIntensity - 30);
                                                const midStop1 = Math.max(innerStop, featherIntensity - 20);
                                                const midStop2 = Math.min(100, featherIntensity + 20);
                                                const outerStop = Math.min(100, featherIntensity + 40);
                                                
                                                svgContent += `
                                                    <radialGradient id="maskGradient" cx="50%" cy="50%" r="${featherSize}%" fx="50%" fy="50%" gradientUnits="objectBoundingBox">
                                                        <stop offset="0%" stop-color="white" stop-opacity="1" />
                                                        <stop offset="${innerStop}%" stop-color="white" stop-opacity="0.95" />
                                                        <stop offset="${midStop1}%" stop-color="white" stop-opacity="0.8" />
                                                        <stop offset="${featherIntensity}%" stop-color="white" stop-opacity="0.6" />
                                                        <stop offset="${midStop2}%" stop-color="white" stop-opacity="0.3" />
                                                        <stop offset="${outerStop}%" stop-color="white" stop-opacity="0.1" />
                                                        <stop offset="100%" stop-color="white" stop-opacity="0" />
                                                    </radialGradient>
                                                    <mask id="featherMask">
                                                        <rect x="0" y="0" width="${gridSize}" height="${gridSize}" fill="black" />
                                                        <circle cx="${gridSize/2}" cy="${gridSize/2}" r="${featherRadius}" fill="url(#maskGradient)" />
                                                    </mask>`;
                                            }
                                            
                                            // Close the defs tag
                                            svgContent += `</defs>`;
                                            
                                            // Add background
                                            svgContent += `<rect width="${gridSize}" height="${gridSize}" fill="${transparentBackground ? 'transparent' : backgroundColor}" />`;
                                            
                                            // Start a group that will be masked if feathering is enabled
                                            svgContent += `<g ${enableMaskFeather ? 'mask="url(#featherMask)"' : ''} clip-path="url(#contentClip)">`;
                                            
                                            if (patternType === "grid") {
                                                svgContent += `<defs>
                                                    <pattern id="gridPattern" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                                                        <path d="M ${cellSize} 0 L 0 0 0 ${cellSize}" fill="none" stroke="${rgbaLineColor}" stroke-width="${val}" />
                                                    </pattern>
                                                </defs>`;
                                                
                                                // Use a single rectangle with the pattern fill instead of individual lines
                                                svgContent += `<rect 
                                                    x="0" 
                                                    y="0" 
                                                    width="${gridSize}" 
                                                    height="${gridSize}" 
                                                    fill="url(#gridPattern)" 
                                                    ${rotationAngle !== 0 ? `transform="rotate(${rotationAngle}, ${gridSize/2}, ${gridSize/2})"` : ''}
                                                />`;
                                            } else if (patternType === "dots") {
                                                // Use SVG pattern definition for dots with halftone effect
                                                svgContent += `<defs>
                                                    <pattern id="dotsPattern" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
                                                        <circle cx="${cellSize/2}" cy="${cellSize/2}" r="${lineWidth * 2}" fill="${rgbaLineColor}" />
                                                    </pattern>
                                                </defs>`;
                                                
                                                // Use a single rectangle with the pattern fill
                                                svgContent += `<rect 
                                                    x="0" 
                                                    y="0" 
                                                    width="${gridSize}" 
                                                    height="${gridSize}" 
                                                    fill="url(#dotsPattern)" 
                                                    ${rotationAngle !== 0 ? `transform="rotate(${rotationAngle}, ${gridSize/2}, ${gridSize/2})"` : ''}
                                                />`;
                                            } else if (patternType === "polygon") {
                                                console.log("PATTERN DEBUG: Generating polygon pattern with cell size", cellSize);
                                                
                                                // Set whether to fill the hexagons or just outline them
                                                const fillHexagons = fillPolygons; // Use the state variable
                                                
                                                // Adjust hexagon size based on cell size
                                                const hexSize = cellSize * 1.2; // Slightly smaller adjustment for better honeycomb appearance
                                                
                                                // Calculate the hexagon dimensions for a classic honeycomb layout
                                                // For a pointy-topped hexagon (rotated 30 degrees from flat-topped)
                                                const hexRadius = hexSize / 2;
                                                const hexWidth = hexRadius * 2;
                                                const hexHeight = hexRadius * Math.sqrt(3);
                                                
                                                // For a proper honeycomb pattern with pointy-topped hexagons:
                                                // - Horizontal distance between centers is 3/2 × radius
                                                // - Vertical distance between centers is sqrt(3) × radius
                                                const colSpacing = hexRadius * 1.5;
                                                const rowSpacing = hexHeight;
                                                
                                                // Create a pattern that includes multiple hexagons for clean tiling
                                                // For pointy-topped hexagons, we need a pattern that's 2 × colSpacing wide and 2 × rowSpacing tall
                                                const patternWidth = colSpacing * 2;
                                                const patternHeight = rowSpacing * 2;
                                                
                                                // Function to generate a pointy-topped hexagon path from center point and radius
                                                const hexagonPath = (centerX: number, centerY: number, radius: number) => {
                                                    let points = [];
                                                    for (let i = 0; i < 6; i++) {
                                                        // Start at 30 degrees to get pointy-topped hexagons
                                                        const angleDeg = 60 * i + 30;
                                                        const angleRad = (Math.PI / 180) * angleDeg;
                                                        const x = centerX + radius * Math.cos(angleRad);
                                                        const y = centerY + radius * Math.sin(angleRad);
                                                        points.push(`${x},${y}`);
                                                    }
                                                    return `M${points.join(' L')}Z`;
                                                };
                                                
                                                // Determine the stroke color based on settings
                                                const strokeColor = !enableBorder ? 'none' : borderColor;
                                                
                                                svgContent += `<defs>
                                                    <pattern id="polygonPattern" width="${patternWidth}" height="${patternHeight}" patternUnits="userSpaceOnUse">
                                                        <!-- First row hexagons -->
                                                        <path 
                                                            d="${hexagonPath(colSpacing/2, 0, hexRadius)}" 
                                                            fill="${fillHexagons ? rgbaLineColor : 'none'}"
                                                            stroke="${strokeColor}" 
                                                            stroke-width="${enableBorder ? val : 0}"
                                                            stroke-linejoin="round"
                                                        />
                                                        
                                                        <path 
                                                            d="${hexagonPath(colSpacing*1.5, 0, hexRadius)}" 
                                                            fill="${fillHexagons ? rgbaLineColor : 'none'}"
                                                            stroke="${strokeColor}" 
                                                            stroke-width="${enableBorder ? val : 0}"
                                                            stroke-linejoin="round"
                                                        />
                                                        
                                                        <!-- Second row hexagons (offset horizontally) -->
                                                        <path 
                                                            d="${hexagonPath(0, rowSpacing, hexRadius)}" 
                                                            fill="${fillHexagons ? rgbaLineColor : 'none'}"
                                                            stroke="${strokeColor}" 
                                                            stroke-width="${enableBorder ? val : 0}"
                                                            stroke-linejoin="round"
                                                        />
                                                        
                                                        <path 
                                                            d="${hexagonPath(colSpacing, rowSpacing, hexRadius)}" 
                                                            fill="${fillHexagons ? rgbaLineColor : 'none'}"
                                                            stroke="${strokeColor}" 
                                                            stroke-width="${enableBorder ? val : 0}"
                                                            stroke-linejoin="round"
                                                        />
                                                        
                                                        <path 
                                                            d="${hexagonPath(colSpacing*2, rowSpacing, hexRadius)}" 
                                                            fill="${fillHexagons ? rgbaLineColor : 'none'}"
                                                            stroke="${strokeColor}" 
                                                            stroke-width="${enableBorder ? val : 0}"
                                                            stroke-linejoin="round"
                                                        />
                                                        
                                                        <!-- Third row hexagons -->
                                                        <path 
                                                            d="${hexagonPath(colSpacing/2, rowSpacing*2, hexRadius)}" 
                                                            fill="${fillHexagons ? rgbaLineColor : 'none'}"
                                                            stroke="${strokeColor}" 
                                                            stroke-width="${enableBorder ? val : 0}"
                                                            stroke-linejoin="round"
                                                        />
                                                        
                                                        <path 
                                                            d="${hexagonPath(colSpacing*1.5, rowSpacing*2, hexRadius)}" 
                                                            fill="${fillHexagons ? rgbaLineColor : 'none'}"
                                                            stroke="${strokeColor}" 
                                                            stroke-width="${enableBorder ? val : 0}"
                                                            stroke-linejoin="round"
                                                        />
                                                    </pattern>
                                                </defs>`;
                                                
                                                // Use a single rectangle with the pattern fill
                                                svgContent += `<rect 
                                                    x="0" 
                                                    y="0" 
                                                    width="${gridSize}" 
                                                    height="${gridSize}" 
                                                    fill="url(#polygonPattern)" 
                                                    ${rotationAngle !== 0 ? `transform="rotate(${rotationAngle}, ${gridSize/2}, ${gridSize/2})"` : ''}
                                                />`;
                                            }
                                            
                                            // Close the group
                                            svgContent += `</g>`;
                                            
                                            svgContent += `</svg>`;
                                            
                                            // Update the preview directly
                                            previewRef.current.innerHTML = svgContent;
                                        }
                                        
                                        // Apply to canvas if needed
                                        if (applyToCanvas) {
                                            if (debounceTimerRef.current) {
                                                clearTimeout(debounceTimerRef.current);
                                            }
                                            debounceTimerRef.current = setTimeout(() => {
                                                applyPatternToCanvas();
                                            }, 300);
                                        }
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Cell size control */}
                <div className="control-group cell-size-control">
                    <label>{patternType === "dots" ? "Spacing" : "Cell Size"}</label>
                    <div className="slider-container">
                        <div className={`value-display ${enableRandomSquares && patternType === "grid" && cellSize < 30 ? "warning-value" : ""}`}>{cellSize}px</div>
                        <div className="slider-track">
                            <input 
                                type="range" 
                                min={enableRandomSquares && patternType === "grid" ? "20" : "10"}
                                max="100" 
                                step="1"
                                value={cellSize} 
                                onChange={(e) => {
                                    let newValue = parseInt(e.target.value);
                                    
                                    // Apply minimum value constraint for Random Squares
                                    if (enableRandomSquares && patternType === "grid" && newValue < 20) {
                                        newValue = 20;
                                    }
                                    
                                    setCellSize(newValue);
                                    
                                    // Use debouncing to prevent too many updates while sliding
                                    if (debounceTimerRef.current) {
                                        clearTimeout(debounceTimerRef.current);
                                    }
                                    debounceTimerRef.current = setTimeout(() => {
                                        updatePreview();
                                    }, 100);
                                }} 
                            />
                        </div>
                    </div>
                    {/* Warning for small cell sizes when random squares enabled */}
                    {enableRandomSquares && patternType === "grid" && cellSize < 30 && (
                        <div className="setting-warning">
                            Cell sizes under 30px may cause size limits with Random Squares.
                        </div>
                    )}
                </div>
                
                {/* Opacity Control */}
                <div className="control-group">
                    <label>Opacity</label>
                    <div className="slider-container">
                        <div className="value-display">{lineOpacity}%</div>
                        <div className="slider-track">
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                step="1"
                                value={lineOpacity} 
                                onChange={(e) => setLineOpacity(parseInt(e.target.value))} 
                            />
                        </div>
                    </div>
                </div>
                
                {/* Rotation Angle Slider */}
                <div className="control-group">
                    <label>Rotation Angle</label>
                    <div className="slider-container">
                        <div className="value-display">{rotationAngle}°</div>
                        <div className="slider-track">
                            <input 
                                type="range" 
                                min="-180" 
                                max="180" 
                                step="1"
                                value={rotationAngle} 
                                onChange={(e) => setRotationAngle(parseInt(e.target.value))} 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="button-container">
                    <button 
                        className="framer-button framer-button-primary" 
                        onClick={handleGeneratePattern}
                        disabled={isUpdatingRef.current}
                    >
                        Add to Canvas
                    </button>
                    <button 
                        className="framer-button framer-button-secondary" 
                        onClick={handleReset}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    )
}

// Add CSS for error message styling
const errorStyles = `
.error-message {
    background-color: rgba(255, 59, 48, 0.15);
    border-left: 4px solid #ff3b30;
    color: #ff3b30;
    padding: 12px 16px;
    margin: 8px 0;
    border-radius: 4px;
    font-size: 14px;
    max-width: 100%;
    overflow-wrap: break-word;
}

.error-message strong {
    display: block;
    margin-bottom: 8px;
}

.error-message p {
    margin: 8px 0;
}

.error-message ul {
    margin: 8px 0;
    padding-left: 20px;
}

.error-message li {
    margin: 4px 0;
}
`;

// Add more CSS for warnings and toast messages
const additionalStyles = `
.setting-warning {
    color: #ff9500;
    font-size: 12px;
    margin-top: 8px;
    font-style: italic;
    flex-basis: 100%;
    order: 100; /* Push warning to bottom of flex container */
    line-height: 1.3;
}

.cell-size-control {
    flex-wrap: wrap; /* Allow warning to wrap to next line */
    margin-bottom: 16px; /* Extra space for the warning */
}

.warning-value {
    color: #ff9500;
    border: 1px solid #ff9500;
}

.feature-hint {
    font-size: 11px;
    color: #aaaaaa;
    margin-left: 10px;
    font-style: italic;
}

.toast-message {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(30, 30, 30, 0.95);
    color: white;
    padding: 12px 18px;
    border-radius: 6px;
    z-index: 1000;
    font-size: 14px;
    animation: fadeInOut 4s forwards;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    text-align: center;
    line-height: 1.4;
    max-width: 90%;
}

.toast-message strong {
    color: #ff9500;
    display: block;
    margin-bottom: 4px;
}

.toast-hint {
    font-size: 12px;
    opacity: 0.8;
    font-style: italic;
}

@keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, 20px); }
    10% { opacity: 1; transform: translate(-50%, 0); }
    80% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, -10px); }
}
`;