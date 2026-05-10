// Helper function to convert CSS hex color to Phaser hex format
// Usage: hexColor("#RRGGBB") returns 0xRRGGBB
function hexColor(cssColor) {
    if (typeof cssColor === 'string' && cssColor.startsWith('#')) {
        return parseInt(cssColor.substring(1), 16);
    }
    return cssColor; // Return as-is if not a CSS color string
}

// Shared config for dimensions and layout
var CONFIG = {
    FONT_FAMILY: 'Arial',
    TEXT_COLOR: '#1A237E',
    
    RESET_PROGRESS: false,         // Set to true to clear saved progress on load
    BATTERY_START_LEVEL: 16,        // Starting level for spawned batteries (1-7). Set higher to test high-level sprites without merging
    BATTERY_IMAGE_EXTENSIONS: ['svg', 'png', 'jpg', 'webp'],  // Priority order for battery image extensions
    
    // Game Area Background Colors
    BACKGROUND: {
        // Ground to sea gradient - parking area (top) blends to merge area (bottom)
        // GRADIENT_START_COLOR: "#9ab39e",  // Green at top (ground/parking area)
        // GRADIENT_END_COLOR: "#99b582",    // Sky blue at bottom (merge area)

        GRADIENT_START_COLOR: "#79d288",  // Green at top (ground/parking area)
        GRADIENT_END_COLOR: "#79d288",    // Sky blue at bottom (merge area)
    },
    
    // Grass Decoration Settings
    GRASS: {
        COUNT: 8,                     // Number of grass sprites to spawn
        COLOR: "#67b464",              // Grass tint color (applied to white sprites)
        MIN_SPACING: 32,               // Minimum distance between grass sprites (pixels)
        
        // Forbidden Zones (grass will not spawn in these areas)
        // These values can be edited directly to adjust zone positions and sizes
        SHOW_FORBIDDEN_ZONES: false,   // Toggle visibility of debug rectangles (true = visible, false = hidden)
        
        FORBIDDEN_ZONES: [
            // Zone 1 - Left side (3 charging stations in vertical alignment)
            // Default calculated for: chargerX=110, parkingCenterY=250, chargerSize=220, spacing=210
            {   
                tag: "chargers",
                centerX: 110,          // Center X position (pixels)
                centerY: 320,          // Center Y position (pixels)
                width: 240,            // Width of zone (pixels)
                height: 680,           // Height of zone (pixels) - covers all 3 chargers
                color: "#FF0000",      // Debug rectangle color (red)
                opacity: 0.2           // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
            // Zone 2 - Right side of top half (road and parking area)
            // Default calculated for: parking center with constraint square
            {
                tag: "parking_area",
                centerX: 440,          // Center X position (pixels)
                centerY: 350,          // Center Y position (pixels)
                width: 480,            // Width of zone (pixels)
                height: 500,           // Height of zone (pixels)
                color: "#00FF00",      // Debug rectangle color (green)
                opacity: 0.2           // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
            // Zone 3 - Center bottom (merge grid - 3x3 battery grid)
            // Default calculated for: 3x3 grid of 130px cells with 40px panel padding
            {
                tag: "merge_grid",
                centerX: 360,          // Center X position (pixels)
                centerY: 930,          // Center Y position (pixels)
                width: 550,            // Width of zone (pixels)
                height: 500,           // Height of zone (pixels)
                color: "#0000FF",      // Debug rectangle color (blue)
                opacity: 0.2           // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
            // Zone 4 - Bottom (spawn and watch ad buttons)
            // Default calculated for: buttons at bottom with BOTTOM_PADDING=80
            {
                tag: "spawn_buttons",
                centerX: 300,          // Center X position (pixels)
                centerY: 1200,          // Center Y position (pixels)
                width: 580,            // Width of zone (pixels) - 90% of screen width
                height: 150,           // Height of zone (pixels)
                color: "#FFFF00",      // Debug rectangle color (yellow)
                opacity: 0.2           // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
              // Zone 5 - Bottom (spawn and watch ad buttons)
            // Default calculated for: coin text
            {
                tag: "coin text",
                centerX: 380,          // Center X position (pixels)
                centerY: 650,          // Center Y position (pixels)
                width: 200,            // Width of zone (pixels) - 90% of screen width
                height: 80,           // Height of zone (pixels)
                color: "#f777fa",      // Debug rectangle color (pink)
                opacity: 0.2           // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
             {
                tag:"shop",
                centerX: 420,          // Center X position (pixels)
                centerY: 55,          // Center Y position (pixels)
                width: 260,            // Width of zone (pixels)
                height: 110,           // Height of zone (pixels) - covers all 3 chargers
                color: "#10b2f8",      // Debug rectangle color (red)
                opacity: 0.7          // Debug rectangle opacity (0-1, 0.2 = 20%)
            }
        ],

        SHOW_SPECIAL_ZONES: false,   // Toggle visibility of debug rectangles (true = visible, false = hidden)
        SPECIAL_ZONES: [
             {
                tag:"shop",
                centerX: 420,          // Center X position (pixels)
                centerY: 55,          // Center Y position (pixels)
                width: 260,            // Width of zone (pixels)
                height: 110,           // Height of zone (pixels) - covers all 3 chargers
                color: "#10b2f8",      // Debug rectangle color (red)
                opacity: 0.7          // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
             {
                tag:"shop_counter",
                centerX: 620,          // Center X position (pixels)
                centerY: 70,          // Center Y position (pixels)
                width: 140,            // Width of zone (pixels)
                height: 90,           // Height of zone (pixels) - covers all 3 chargers
                color: "#9500ff",      // Debug rectangle color (red)
                opacity: 0.7          // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
             {
                tag:"conveyer_belt",
                centerX: 475,          // Center X position (pixels)
                centerY: 600,          // Center Y position (pixels)
                width: 490,            // Width of zone (pixels)
                height: 30,           // Height of zone (pixels) - covers all 3 chargers
                color: "#91ff00",      // Debug rectangle color (blue)
                opacity: 0.7          // Debug rectangle opacity (0-1, 0.2 = 20%)
            },
              {
                tag:"none",
                centerX: 620,          // Center X position (pixels)
                centerY: 210,          // Center Y position (pixels)
                width: 10,            // Width of zone (pixels)
                height: 10,           // Height of zone (pixels) - covers all 3 chargers
                color: "#000000",      // Debug rectangle color (blue)
                opacity: 1         // Debug rectangle opacity (0-1, 0.2 = 20%)
            }
        ]
    },
    
    // UI Button Configuration
    BUTTON: {
        // Spawn button
        SPAWN_WIDTH: 250,              // Width of spawn button
        SPAWN_HEIGHT: 90,              // Height of spawn button
        SPAWN_COLOR: "#FFB800",         // Vibrant yellow/gold background color
        SPAWN_BORDER_COLOR: "#FF8C00",  // Bright orange border
        SPAWN_BORDER_WIDTH: 8,         // Border width
        
        // Level-up button
        LEVELUP_WIDTH: 180,            // Width of level-up button
        LEVELUP_HEIGHT: 70,            // Height of level-up button
        LEVELUP_COLOR: "#FF6B9D",       // Bright pink background color
        LEVELUP_BORDER_COLOR: "#E91E63", // Deep pink border
        LEVELUP_BORDER_WIDTH: 4,       // Border width
        
        // Button positioning
        BOTTOM_PADDING: 80,            // Distance from bottom of screen (pixels)
        BUTTON_SPACING: 220,           // Horizontal spacing between buttons
        
        // Battery icon in spawn button (fixed size, independent of image resolution)
        BATTERY_ICON_WIDTH: 64,        // Display width in pixels (fixed size)
        BATTERY_ICON_HEIGHT: 64,       // Display height in pixels (fixed size)
        BATTERY_ICON_X: -80,           // X position offset from button center
        BATTERY_ICON_Y: 0,             // Y position offset from button center
        
        // Coin display in buttons
        COIN_TEXT_SIZE: '32px',        // Font size for coin cost text
        COIN_TEXT_X: 20,               // X position offset from button center
        COIN_TEXT_Y: 0,                // Y position offset from button center
        COIN_ICON_WIDTH: 50,           // Display width in pixels (fixed size)
        COIN_ICON_HEIGHT: 50,          // Display height in pixels (fixed size)
        COIN_ICON_X: 80,               // X position offset from button center
        COIN_ICON_Y: 0,                // Y position offset from button center
    },
    
    // Grid Layout Configuration (for Parking Jam grid only - top section)
    GRID: {
        // Parking area horizontal positioning
        PARKING_HORIZONTAL_OFFSET: 0.15,  // Shift parking area to right (0.15 = 15% of screen width to the right)
                                           // 0 = centered, positive = shift right, negative = shift left
        
        // Constraint square for parking area sizing
        // POSITION CALCULATION:
        // Center X = (screenWidth / 2) + (screenWidth × PARKING_HORIZONTAL_OFFSET) + CONSTRAINT_SQUARE_OFFSET_X
        // Center Y = (parkingAreaHeight / 2) + 30 + CONSTRAINT_SQUARE_OFFSET_Y
        // Where parkingAreaHeight = screenHeight × 0.5
        //
        // OPTIMAL VALUES (maximizes parking area without clipping or overlapping chargers):
        // These values have been tuned for best visual layout - adjust only if needed
        CONSTRAINT_SQUARE_ENABLED: true,   // Enable constraint square to limit parking area size
        CONSTRAINT_SQUARE_VISIBLE: false,  // Show constraint square for debugging (red outline)
        CONSTRAINT_SQUARE_SIZE: 450,       // Size of constraint square (pixels) - OPTIMIZED VALUE
                                           // Parking area + surrounding roads scale to fit inside this square
        CONSTRAINT_SQUARE_OFFSET_X: -30,   // Horizontal offset from calculated center (pixels, positive = shift right) - OPTIMIZED VALUE
        CONSTRAINT_SQUARE_OFFSET_Y: 0,     // Vertical offset from calculated center (pixels, positive = shift down) - OPTIMIZED VALUE
        
        // Responsive sizing for PARKING JAM GRID ONLY (top section with cars)
        // Battery merge grid (bottom section) positioning is controlled by MERGE_GRID section below
        WIDTH_PERCENTAGE: 0.5,         // Parking grid width as percentage of screen width (reduced from 0.6 to 0.5 to fit chargers)
        SIZE_FACTOR: 1.0,              // Global size multiplier for parking grid (1.0 = normal, 1.5 = 150%, etc.)
        ROAD_WIDTH_FACTOR: 4 / 3,      // Road width as a factor of parking cell size (4/3 means road width = cellSize * 1.33)
        
        // Grid dimensions
        PARKING_COLS: 6,               // Number of columns in parking jam grid (can be overridden by level data)
        PARKING_ROWS: 6,               // Number of rows in parking jam grid (can be overridden by level data)
        
        // Parking area appearance
        PARKING_AREA_COLOR: "#9ab0d7",  // Bluish color for parking area floor
        TILE_TO_GRID_RATIO: 1,         // Number of tiles per grid cell (used when texture is enabled)
        
        // Parking line T-cap configuration
        PARKING_LINE_T_CAP_PERCENT: 0.2,  // Size of perpendicular T-cap at far end of parking lines as percentage of line length (0.05 = 5%)
    },
    
    // Battery Merge Grid Positioning (controls overall grid position)
    // The merge grid (3x3 battery grid at bottom) is positioned relative to the spawn button.
    // You can control where the grid appears by adjusting these values:
    MERGE_GRID: {
        // POSITIONING EXPLANATION:
        // Grid is built from BOTTOM-UP (like building a tower):
        // 1. Bottom edge is calculated: spawn button top - PADDING_FROM_BUTTON_TOP
        // 2. Grid rows are stacked upward from this bottom edge
        // 3. Bottom row (row 2) is lowest, middle row (row 1) is center, top row (row 0) is highest
        //
        // To move grid DOWN: increase PADDING_FROM_BUTTON_TOP (more space between button and grid)
        // To move grid UP: decrease PADDING_FROM_BUTTON_TOP (less space between button and grid)
        // Negative values will make grid overlap with spawn button
        
        PADDING_FROM_BUTTON_TOP: 20,   // Space between spawn button top edge and grid bottom edge (pixels)
                                        // Increase this to push grid DOWN (away from button)
                                        // Decrease this to pull grid UP (closer to button)
    },
    
    // Coin Counter Display (right side, aligned with middle row of grid)
    COIN_COUNTER: {
        ALIGN_WITH_GRID_ROW: 1,        // Which row to align with (0=top, 1=middle, 2=bottom for 3x3 grid)
        PADDING_FROM_SCREEN_RIGHT: 20, // Padding from right edge of screen (pixels) - ensures visibility on mobile
        TEXT_SIZE: '48px',             // Font size for coin count text
        TEXT_COLOR: '#f7ca42',         // Bright yellow color for text
        TEXT_STROKE_COLOR: '#7e5d11',  // Orange outline color for text
        TEXT_STROKE_THICKNESS: 6,      // Outline thickness (pixels)
        COIN_ICON_WIDTH: 40,           // Coin icon display width (pixels)
        COIN_ICON_HEIGHT: 40,          // Coin icon display height (pixels)
        TEXT_ICON_SPACING: 10,         // Spacing between text and coin icon (pixels)
    },
    
    // Grid Cell Configuration (For Battery Merge Grid - Bottom Section)
    // These values are used directly for the merge game grid (3x3) and charging slots
    // The parking jam grid uses responsive sizing based on GRID.WIDTH_PERCENTAGE
    CELL: {
        SIZE: 130,                      // Cell width and height in pixels (used for merge game grid)
        GAP: 4,                        // Gap between cells (used for merge game grid)
        RADIUS: 15,                     // Rounded corner radius (used for merge game grid)
        
        // Inset look styling (creates recessed appearance)
        EMPTY_BG_COLOR: "#c2d1e0",      // Light blue for empty cells
        //#F2F0EF
        FILLED_BG_COLOR: "#eaf0f6", 
        //    // Bright white for occupied cells
        INSET_SHADOW_COLOR: "#364549",  // Deep teal for outer shadow (creates depth)
        INSET_BORDER_WIDTH: 3.5,       // Width of inset border (50% more than original 3)
        
        // Legacy border (deprecated - using inset styling instead)
        BORDER_COLOR: "#364549",        // Empty cell border color (not used with inset)
        BORDER_WIDTH: 4,                // Border width
        
        // Battery icon configuration
        BATTERY_DISPLAY_SIZE: 64,      // Fixed display size in pixels (all batteries shown at this size regardless of source image dimensions)
        BATTERY_SCALE: 1.0,            // Battery icon scale (1.0 = full size, 64px) - DEPRECATED: Use BATTERY_DISPLAY_SIZE instead
        BATTERY_Y_OFFSET: 5,           // Vertical offset from cell center (positive = down)
        
        // Level text configuration
        LEVEL_TEXT_SIZE: '11px',       // Font size for "LVL n" text
        LEVEL_TEXT_COLOR: '#000000',   // Text color (black)
        LEVEL_TEXT_Y_OFFSET: -40,      // Offset from battery center (negative = above)
        
        // Draggable background for cell contents (debug)
        DRAGGABLE_BG_COLOR: "#FFFFFF",  // Color of draggable area
        DRAGGABLE_BG_ALPHA: 0,         // Transparency (0 = invisible, 0.3 = semi-transparent, 1 = opaque)
        
        // Grid background panel (panel behind all cells)
        GRID_PANEL_PADDING: 40,        // Extra space around grid cells on all sides (pixels)
        GRID_PANEL_COLOR: "#ccd5d7",   // Light grey-blue color for grid background panel
        GRID_PANEL_RADIUS: 15,         // Rounded corner radius (same as cell radius)
        GRID_PANEL_BORDER_COLOR: "#364549", // Dark grey border color for grid panel
        GRID_PANEL_BORDER_WIDTH: 3,    // Border thickness (pixels)
    },
    
    // Battery Spawn Animation (Squash & Stretch with Overshoot)
    SPAWN_ANIMATION: {
        // Initial squash state (wide and short)
        INITIAL_SCALE_X: 1.15,         // Horizontal scale at spawn (1.0 = normal, >1 = wider)
        INITIAL_SCALE_Y: 0.85,         // Vertical scale at spawn (1.0 = normal, <1 = shorter)
        
        // Overshoot stretch (tall and narrow)
        STRETCH_SCALE_X: 0.9,          // Horizontal scale during stretch (<1 = narrower)
        STRETCH_SCALE_Y: 1.1,          // Vertical scale during stretch (>1 = taller)
        STRETCH_DURATION: 150,         // Duration in milliseconds
        
        // Bounce back (squash again but less)
        BOUNCE_SCALE_X: 1.05,          // Horizontal scale during bounce
        BOUNCE_SCALE_Y: 0.975,         // Vertical scale during bounce
        BOUNCE_DURATION: 100,          // Duration in milliseconds
        
        // Final settle duration
        SETTLE_DURATION: 80,           // Duration to settle to normal scale (ms)
    },
    
    // Vehicle Physics Config
    VEHICLE: {
        CHASSIS_WIDTH: 120,
        CHASSIS_HEIGHT: 60,
        WHEEL_RADIUS: 15,
        REAR_WHEEL_OFFSET_X: -38,  // Horizontal offset for rear wheel from chassis center
        REAR_WHEEL_OFFSET_Y: 25,   // Vertical offset for rear wheel from chassis center (positive = down)
        
        FRONT_WHEEL_OFFSET_X: 38,  // Horizontal offset for front wheel from chassis center
        FRONT_WHEEL_OFFSET_Y: 25,  // Vertical offset for front wheel from chassis center (positive = down)
        
        // Debug visualization
        DEBUG_WHEEL_OFFSET: false,  // Show yellow circles at wheel offset positions
        
        // Custom debug offset point (for checking relative positions)
        DEBUG_POINT_SHOW: false,    // Show/hide the custom debug point
        DEBUG_POINT_OFFSET_X: -38,   // X offset from chassis center
        DEBUG_POINT_OFFSET_Y: 25,   // Y offset from chassis center (positive = down)
        
        // Constraint properties (rigid axles with slight compliance)
        SPRING_STIFFNESS: 0.2,       // Constraint compliance (like car.ts example)
        SPRING_DAMPING: 0,           // No damping for rigid constraint
        SPRING_LENGTH: 0,            // Zero length = rigid constraint (not a spring)
        
        // Horizontal constraint properties (prevents pendulum swing)
        HORIZONTAL_CONSTRAINT_LENGTH: 2,      // Very small rest length for slight flex during acceleration
        HORIZONTAL_CONSTRAINT_STIFFNESS: 0.8, // High stiffness to keep chassis aligned, but allows tiny movement
        HORIZONTAL_CONSTRAINT_DAMPING: 0.5,   // High damping to prevent oscillation
        
        // Motor properties (pure torque-based physics)
        // Speed is NOT controlled - it emerges from torque, friction, mass, and obstacles
        // MOTOR_TORQUE: 0.015,          // Constant torque applied to rear wheel (rotational force)
         MOTOR_TORQUE: 40, 
        FRICTION: 0.9,
        WHEEL_FRICTION: 0.9,          // High friction for grip
        WHEEL_GRIP: 0.02,
        
        // Weight and physics (matching car.ts example with density)
        CHASSIS_DENSITY: 0.002,     // Chassis density (car.ts example)
        WHEEL_DENSITY: 0.001,       // Wheel density (car.ts example)
        
        // Starting position
        START_X: 200,
        SPAWN_HEIGHT: 100,     // Height at which vehicle spawns and falls
    },
    
    // Pushable Box Configuration
    BOX: {
        WIDTH: 60,                  // Box width in pixels
        HEIGHT: 60,                 // Box height in pixels
        WEIGHT: 0.003,              // Box density (lower = lighter, higher = heavier) - try values from 0.001 to 0.01
        FRICTION: 0.8,              // Friction between box and ground (0-1, higher = more resistance)
        BOX_FRICTION: 0.5,          // Box surface friction (affects how easily it slides)
        OFFSET_X: 200,              // Distance in front of car (from car's starting position)
        COLOR: "#8B4513",            // Brown color for the box
        BORDER_COLOR: "#654321",     // Darker brown for border
        BORDER_WIDTH: 3,            // Border width in pixels
    },
    
    // Terrain Configuration
    TERRAIN: {
        // Flat ground section
        FLAT_GROUND_Y: 870,        // Top of flat ground
        FLAT_GROUND_WIDTH: 1200,   // Width of flat ground
        FLAT_GROUND_X_START: 0,    // Starting X position
        
        // Slope section
        SLOPE_START_X: 1200,       // Where slope begins
        SLOPE_END_X: 1600,         // Where slope ends
        SLOPE_TOP_Y: 720,          // Top of slope (right side)
        SLOPE_BOTTOM_Y: 870,       // Bottom of slope (left side)
        SLOPE_WIDTH: 450,          // Width of slope collider
        SLOPE_ANGLE: -0.35,        // Angle of slope in radians
        
        // Top platform section
        PLATFORM_X: 1600,          // Starting X of platform
        PLATFORM_Y: 720,           // Top of platform
        PLATFORM_WIDTH: 600,       // Width of platform
        
        // World bounds
        WORLD_HEIGHT: 1280,        // Bottom boundary
    },
    
    // Physics world settings
    PHYSICS: {
        GRAVITY_Y: 1,
        DEBUG: true,  // Show physics debug rendering
        
        // Physics engine timing (to prevent tunneling)
        FPS: 60,              // Physics steps per second
        DELTA: 1000/60,       // Time step in milliseconds (1000/FPS)
        ITERATIONS: 10,       // Constraint solver iterations (higher = more accurate but slower)
        
        // Individual collider visibility (only works when DEBUG is true)
        DEBUG_CHASSIS_COLLIDER: false,   // Show/hide chassis collider outline
        DEBUG_WHEEL_COLLIDER: false,      // Show/hide wheel collider outlines
        DEBUG_GROUND_COLLIDER: false,    // Show/hide ground collider outlines
    },
    
    // Audio settings (Hill Climb Racing style engine sound)
    AUDIO: {
        ENGINE_IDLE_RATE: 0.8,         // Playback rate when idle (lower = deeper sound)
        ENGINE_MAX_RATE: 2.2,          // Playback rate at max speed (higher = screaming engine)
        ENGINE_REVERSE_RATE: 0.6,      // Playback rate when reversing (lower = deeper)
        ENGINE_IDLE_VOLUME: 0.4,       // Volume when idle (0-1)
        ENGINE_ACTIVE_VOLUME: 0.8,     // Volume when accelerating (0-1)
        RATE_LERP_SPEED: 0.08,         // How fast pitch changes (0.01=slow, 0.2=instant)
        VOLUME_LERP_SPEED: 0.15,       // How fast volume changes (0.01=slow, 0.2=instant)
    },
    
    // Pointer animation settings (for tutorial overlay)
    POINTER: {
        SCALE: 1,                   // Scale of point.png image
        FILL_COLOR: "#ffd251",      // Fill color for pointer (yellow/gold)
        STROKE_COLOR: "#6d5727",    // Stroke/outline color for pointer (dark brown)
        STROKE_WIDTH: 3,            // Stroke width in pixels
        OFFSET_Y: 20,                  // Pixels below button center where top of pointer appears
        ANIMATION_MOVE_UP: 12,          // Pixels to move up during click animation
        ANIMATION_SCALE_DOWN: 0.9,     // Scale multiplier during click (0.9 = 10% smaller)
        ANIMATION_DURATION: 200,       // Duration of one click animation in milliseconds
        ANIMATION_YOYO: true,          // Animation returns to start
        ANIMATION_REPEAT: -1,          // Repeat indefinitely (-1)
        TUTORIAL_START_DELAY: 500,    // Delay in ms before mask animation starts (full game preview)
        TUTORIAL_FADE_DURATION: 500,   // Duration in ms for mask fade-in animation
        TUTORIAL_MASK_COLOR: "#000000",   // Color of the tutorial mask overlay
        TUTORIAL_MASK_OPACITY: 0.75    // Opacity of the tutorial mask overlay (0-1, higher = darker)
    },
    
    // Merge tutorial animation settings
    MERGE_TUTORIAL: {
        POINTER_OFFSET_Y: 50,          // Pixels below cell center where top of pointer appears
        ANIMATION_DURATION: 1000,      // Duration for pointer to move from cell 1 to cell 2
        ANIMATION_REPEAT: -1,          // Repeat indefinitely
        ANIMATION_EASE: 'Sine.easeInOut' // Easing function for smooth movement
    },
    
    // Charging connection line settings
    CHARGING_CONNECTION: {
        SLOT_SWITCH_DELAY: 500,         // Delay in milliseconds before a slot switches to charge the next vehicle after completing one (allows player to see completion)
        CORNER_RADIUS: 10,              // Radius for rounded corners in charging connection lines (pixels)
        LINE_WIDTH: 5,                  // Width of charging connection lines (pixels)
        LINE_COLOR: "#666666",           // Grey color for charging lines
        LINE_ALPHA: 0.7,                // Transparency of charging lines (0-1, 0.7 = 70%)
        START_OFFSET_X: -16,            // Horizontal offset for connection start point (negative = shift left to compensate for transparent space in charger image)
        SLOT_DISTANCES: [20, 35, 50],   // Fixed horizontal "stem" distance from each charger before first turn (pixels)
                                         // Different for each slot (0, 1, 2) to prevent line overlap and avoid turning at road
                                         // Connection always starts with this horizontal segment, then routes to vehicle
        VERTICAL_ALIGN_THRESHOLD: 20,   // Deprecated - kept for backward compatibility (no longer used in logic)
        MAX_START_OFFSET: 15,            // Deprecated - kept for backward compatibility (no longer used in logic)
        
        // Plug head icon settings (electrical connector at car end)
        PLUG_HEAD_SIZE: 24,             // Size of plug head sprite (width and height in pixels)
        PLUG_X_OFFSET: 24,              // X offset for left connection point calculation (negative = move left to accommodate plug)
                                         // Applied BEFORE choosing between left/bottom connection for fair Manhattan distance comparison
        PLUG_Y_OFFSET: 24,              // Y offset for bottom connection point calculation (positive = move down to accommodate plug)
                                         // Applied BEFORE choosing between left/bottom connection for fair Manhattan distance comparison
        PLUG_HEAD_OFFSET_Y: 25,         // Deprecated - offset now handled by PLUG_Y_OFFSET during connection point calculation
        
        // Charging station icon (displayed to the left of charging slots)
        STATION_ICON_SIZE: 112,         // Size of charging station icon (width and height in pixels) - 40% bigger than original 80
        STATION_ICON_OFFSET_X: -45,     // Horizontal offset from first slot (negative = to the left)
        
        // Animation settings (trace effect from battery slot to car)
        ANIMATE_ENABLED: false,         // Enable line tracing animation
        ANIMATE_DURATION: 800,          // Duration of trace animation in milliseconds
        ANIMATE_EASE: 'Power2',         // Easing function for animation
        
        // Pulse/blink effect on each charge cycle
        PULSE_ENABLED: true,            // Enable pulse/blink effect when charging
        PULSE_DURATION: 200,            // Duration of pulse flash in milliseconds
        PULSE_ALPHA_MAX: 1.0,           // Maximum alpha during pulse (1.0 = fully opaque)
        PULSE_BATTERY_SCALE: 0.15,      // Battery scale pulse amount (0.15 = 15% larger at peak)
    },
    
    // EV Charger Unit settings
    // LAYOUT: Chargers are positioned VERTICALLY on the LEFT side of the parking area
    // MANUAL ADJUSTMENT GUIDE:
    // - All positions are relative to the charger center (0, 0)
    // - X offset: negative = left, positive = right
    // - Y offset: negative = up, positive = down
    // - Colors: 0xRRGGBB format (e.g., 0x00FF41 = neon green)
    // - Alpha: 0 = transparent, 1.0 = fully opaque
    EV_CHARGER: {
        CHARGER_SIZE: 180,              // EV charger display size in pixels (width and height) - ADJUST THIS to scale everything!
        
        // Vertical layout positioning (chargers stacked vertically on left side)
        // Middle charger (index 1) is centered with parking area center
        // Top (index 0) and bottom (index 2) are equally spaced from middle
        HORIZONTAL_POSITION: 100,        // Horizontal position from left edge of screen (pixels)
        VERTICAL_SPACING: 210,          // Vertical spacing between chargers (pixels) - must be > CHARGER_SIZE to avoid overlap
        
        // Child elements - sizes and offsets in absolute pixels
        DROP_ZONE_SIZE: 130,            // Drop zone size in pixels
        DROP_ZONE_OFFSET_X: 0,          // Horizontal offset in pixels
        DROP_ZONE_OFFSET_Y: 5,          // Vertical offset in pixels
        DROP_ZONE_RADIUS: 15,           // Corner radius in pixels (same as merge grid cell)
        
        // Drop zone styling (inset look like merge grid cells)
        DROP_ZONE_EMPTY_BG_COLOR: "#B4E4FF",      // Light blue for empty drop zone (same as merge cell)
        DROP_ZONE_FILLED_BG_COLOR: "#FFFFFF",     // Bright white for occupied drop zone (same as merge cell)
        DROP_ZONE_INSET_SHADOW_COLOR: "#0D7C9D",  // Deep teal for inset shadow (same as merge cell)
        DROP_ZONE_INSET_BORDER_WIDTH: 4.5,       // Width of inset border (same as merge cell)
        
        // Charger bolt sub-image (overlay on charger)
        // Shows charging status: grey when idle, neon green when charging a vehicle
        BOLT_SIZE: 25,                  // Bolt size in pixels
        BOLT_OFFSET_X: -60,             // Horizontal offset in pixels
        BOLT_OFFSET_Y: -80,             // Vertical offset in pixels
        BOLT_COLOR_INACTIVE: 0xCCCCCC,  // Grey color when not charging any vehicle
        BOLT_COLOR_ACTIVE: 0x00FF41,    // Neon green color when charging a vehicle
        BOLT_ALPHA: 1.0,                // Transparency (0 = invisible, 1.0 = fully opaque)
        
        // Charger on/off switch sub-image (overlay on charger)
        // Shows battery presence: charger_off.png when empty, charger_on.png when battery present
        SWITCH_WIDTH: 29,               // Switch width in pixels
        SWITCH_HEIGHT: 12,              // Switch height in pixels
        SWITCH_OFFSET_X: 14,            // Horizontal offset in pixels
        SWITCH_OFFSET_Y: -80,           // Vertical offset in pixels
        SWITCH_ALPHA: 1.0,              // Transparency (0 = invisible, 1.0 = fully opaque)
        
        // Empty charger appearance (when no battery is loaded)
        EMPTY_CHARGER_OVERLAY_COLOR: 0x888888,  // Grey overlay color for empty chargers (without transparency)
    },
    
    // Lightning bolt charging effect settings
    LIGHTNING_BOLT: {
        SCALE_START: 0.5,              // Starting scale (relative to bolt.png size)
        SCALE_END: 1.5,                // Ending scale (relative to bolt.png size)
        ALPHA_START: 1,                // Starting transparency (0-1, 1 = opaque)
        ALPHA_END: 0,                  // Ending transparency (0-1, 0 = invisible)
        DURATION: 600                  // Animation duration in milliseconds
    },
    
    // Coin reward animation settings (when car completes charging)
    COIN_REWARD_ANIMATION: {
        COIN_COUNT: 6,                 // Number of coins in the stack
        REWARD_COIN_SIZE: 32,          // Size of reward coins in pixels (distinguishable from coin counter icon)
        TOP_SPEED_DURATION: 600,       // Duration in ms for the fastest coin (top speed)
        SPEED_VARIATION: 0.15,         // Speed variation for other coins (0.15 = 15% slower than top speed)
        STAGGER_DELAY: 50,             // Delay in ms between each coin starting its animation
        INITIAL_STACK_OFFSET: 0,       // Vertical spacing between coins in initial stack (0 = single coin, top-down view)
        COIN_SPAWN_DELAY: 100,         // Delay in ms before coins start animating after appearing (allows player to see them)
        EASE: 'Power2'                 // Easing function for coin movement
    },
    
    // Pizza Delivery System settings
    PIZZA_DELIVERY: {
        ENABLED: true,                  // Enable pizza collection before vehicles leave
        COUNTER_STOP_DURATION: 1000,   // How long vehicle stops at counter to collect pizza (ms)
        PIZZA_SIZE: 40,                 // Base size of pizza sprites (pixels) before scaling
        PIZZA_SCALE: 0.7,               // Scale factor for pizza display size (0.7 = 70% of base size)
        PIZZA_SPACING: 10,              // Spacing between pizzas at counter (pixels) - DEPRECATED: Use grid layout below
        PIZZA_COLLECT_DURATION: 500,   // Duration for pizza to fly to vehicle (ms)
        PIZZA_SCALE_FINAL: 0.5,        // Final scale of pizza when collected (0.5 = half size)
        
        // Compact overlapping grid layout configuration
        GRID_COLUMNS: 3,                // Number of columns in grid (vertical layout)
        ROW_GAP_PERCENTAGE: 20,         // Horizontal overlap between items in same row (% of item width)
                                        // Lower value = more overlap, items stack more
                                        // e.g., 20% means each item overlaps 80% with the next
        COLUMN_GAP_PERCENTAGE: 50,      // Vertical gap between rows (% of item height)
                                        // Lower value = rows closer together
                                        // e.g., 20% means 20% spacing between rows
        
        // Counter position (from shop_counter special zone in GRASS.SPECIAL_ZONES)
        COUNTER_CENTER_X: 620,          // X position of counter center
        COUNTER_CENTER_Y: 55,           // Y position of counter center
        COUNTER_WIDTH: 140,             // Width of counter zone
        COUNTER_HEIGHT: 110,            // Height of counter zone
        
        // Detection settings
        COUNTER_DETECTION_RANGE: 150,   // Distance to detect counter (pixels) - vehicles stop on road when within this range
        STAY_ON_ROAD: true,             // Keep vehicles on road during pizza collection (pizza flies to them)
        
        // Full lap requirement for vehicles that would miss counter
        // Counter is at top-right (< 45 degrees from top center)
        // Vehicles exiting at angles >= 45 degrees will miss it and need a full lap
        REQUIRE_FULL_LAP_AFTER_ANGLE: 45, // Vehicles exiting after this angle (degrees, clockwise from top) need a full lap
        
        // Queue configuration
        QUEUE_SPACING: 80,              // Distance between vehicles in queue (pixels)
        QUEUE_START_OFFSET: 100,        // Distance before counter where queue starts (pixels)
    },
    
    // Parking Jam Car Movement settings
    PARKING_CAR: {
        MAX_SPEED: 300,                 // Maximum speed of cars moving on the road (pixels per second)
        EXIT_TO_ROAD_DURATION: 1000,   // Duration for car to move from parking to road entrance (ms)
        DEBUG_SHOW_CURVE: false,        // Show bezier curve when vehicle moves from parking to road
        
        // Charge display mode
        CHARGE_DISPLAY_MODE: 'value',   // 'bar' = progress bar, 'value' = decreasing number (like Blum Merge)
        SHOW_REMAINING_CHARGE: false,    // true = show remaining charge (100→0), false = show charged amount (0→100)
        CHARGE_ANIMATION_SPEED: 120,    // Speed of charge number animation (units per second) - higher = faster
        CHARGE_VALUE_SIZE: '20px',      // Font size for charge value text inside battery
        CHARGE_VALUE_COLOR: '#1A237E',  // Deep indigo color for text (contrasts well with backgrounds)
        CHARGE_VALUE_PADDING: 10,       // Padding above vehicle sprite (pixels)
        
        // Battery icon settings (horizontal battery)
        BATTERY_ICON_WIDTH: 80,         // Width of battery icon (pixels)
        BATTERY_ICON_HEIGHT: 30,        // Height of battery icon (pixels)
        BATTERY_BORDER_WIDTH: 3,        // Border thickness (pixels)
        BATTERY_BORDER_COLOR: "#1A237E", // Deep indigo border color
        BATTERY_EMPTY_COLOR: "#FFFFFF",  // White background for empty area
        BATTERY_FILL_COLOR: "#00E676",   // Bright green color for filled area (used when gradient is disabled)
        BATTERY_USE_GRADIENT: true,     // Use gradient color from red (low) to green (high)
        BATTERY_GRADIENT_LOW_COLOR: "#FF5252",  // Bright red for low charge (0-33%)
        BATTERY_GRADIENT_MID_COLOR: "#7FAF9A",  // Bright yellow for medium charge (33-66%)
        BATTERY_GRADIENT_HIGH_COLOR: "#00E676", // Bright green for high charge (66-100%)
        BATTERY_CAP_WIDTH: 6,           // Width of battery terminal/cap on right side
        BATTERY_CAP_HEIGHT: 16,         // Height of battery terminal/cap
        BATTERY_CORNER_RADIUS: 4,       // Rounded corner radius for battery body
        
        // Charger color coding (for battery/meter outlines to indicate which charger is charging the vehicle)
        // Colors match the charger icon colors
        CHARGER_COLOR_RED: "#C36E6E",    // Red for top charger (slot 0)
        CHARGER_COLOR_GREEN: "#D6C48A",  // Green for middle charger (slot 1)
        CHARGER_COLOR_BLUE: "#7FA1C2",   // Blue for bottom charger (slot 2)
        
        // Analog meter settings (gauge above battery icon)
        ANALOG_METER_ENABLED: true,     // Enable analog meter display
        ANALOG_METER_SHOW: true,        // Show/hide meter (if false, only battery icon shows)
        ANALOG_METER_RADIUS: 35,        // Radius of the meter arc (pixels)
        ANALOG_METER_OFFSET_Y: -30,     // Offset above battery icon (negative = above)
        ANALOG_METER_ARC_WIDTH: 3,      // Width of the semi-circle arc line
        ANALOG_METER_ARC_COLOR: "#1A237E", // Deep indigo color for the arc
        ANALOG_METER_NEEDLE_LENGTH: 28, // Length of the needle (slightly shorter than radius)
        ANALOG_METER_NEEDLE_WIDTH: 2,   // Width of the needle line
        ANALOG_METER_NEEDLE_COLOR: "#FF5252", // Bright red color for needle
        ANALOG_METER_MAX_ANGLE: 160,    // Maximum angle for full charge (degrees, 0=left, 180=right)
        ANALOG_METER_MARKER_INTERVAL: 20, // Interval between scale markers (degrees)
        ANALOG_METER_MARKER_LENGTH: 6,  // Length of scale markers
        ANALOG_METER_MARKER_WIDTH: 2,   // Width of scale markers
        ANALOG_METER_OVERSHOOT_FACTOR: 1.3, // Overshoot multiplier (1.3 = overshoots by 30%)
        ANALOG_METER_PULSE_INTENSITY: 25, // Random pulse intensity (degrees)
        ANALOG_METER_SETTLE_SPEED: 0.15, // Speed of needle settling (0.1 = slower, 0.3 = faster)
    },
    
    // Vehicle Shadow settings (simple elliptical shadow for mobile performance)
    VEHICLE_SHADOW: {
        ENABLED: true,                  // Enable/disable shadows
        SCALE_X: 0.85,                  // Horizontal scale relative to car width (0.85 = slightly smaller than car)
        SCALE_Y: 0.85,                  // Vertical scale relative to car length (0.85 = slightly smaller than car)
        ALPHA: 0.3,                    // Shadow transparency (0.08 = very transparent, higher = darker)
        COLOR: "#666666",                // Grey shadow color
        OFFSET_X: -5,                   // Horizontal offset from car center (sun from SE: negative = shadow to west)
        OFFSET_Y: -5,                   // Vertical offset from car center (sun from SE: negative = shadow to north)
        DEPTH: 4,                       // Render depth (4 = below road at 5, below cars at 10)
        BLUR: 30,                       // Blur spread in pixels (higher = more blur, softer edges)
        CORNER_RADIUS: 10,               // Rounded corner radius in pixels (makes shadow look like car shape)
    },
    
    // Tire tracks (black marks left by car wheels)
    TIRE_TRACKS: {
        ENABLED: true,                  // Enable tire track rendering
        SHOW_FORWARD_TURN: false,       // Show tire marks during forward exit turn (if false, only show during reverse turn)
        LINE_WIDTH: 6,                  // Thickness of tire track lines
        COLOR: "#5E35B1",                // Deep purple color for tire marks
        ALPHA: 0.4,                     // Transparency (0.4 = 40% visible, like faded tracks)
        WHEEL_OFFSET: 10,               // Distance from car center to each tire track (perpendicular to car direction)
        MAX_POINTS: 200,                // Maximum number of points to track per tire (prevents memory issues)
        MIN_DISTANCE: 5,                // Minimum distance between points before adding new one (smoother lines)
        
        // Fade animation for tire tracks (after bezier curve completes)
        FADE_ENABLED: true,             // Enable fade out animation
        FADE_DURATION: 400,             // Duration of fade out in milliseconds (how quickly tracks disappear)
        FADE_DELAY: 0,                  // Delay before fade starts in milliseconds (0 = fade immediately)
    },
    
    // Exit Gate settings
    GATE: {
        POSITION_Y_FACTOR: 0.2,         // Gate position along exit tail (0 = bottom of tail, 0.5 = middle, 1 = top of tail)
        LENGTH_PERCENT: 0.42,           // Each gate length as percentage of road width (0.42 = 42%, leaves 16% gap)
        THICKNESS_PERCENT: 0.24,        // Gate thickness as percentage of road width (0.24 = 24%, doubled from 0.12)
        CENTER_GAP_PERCENT: 0.16,       // Gap between gates in center as percentage of road width (0.16 = 16%)
        PIVOT_OFFSET: 15,               // Distance pivot point extends beyond road edge (pixels)
        POLE_RADIUS: 4,                 // Radius of the pole/hinge circle (pixels)
        POLE_COLOR: "#424242",           // Dark gray color for pole
        POLE_BORDER_COLOR: "#212121",    // Nearly black border for pole
        POLE_BORDER_WIDTH: 2,           // Pole border width (pixels)
        OPEN_DURATION: 400,             // Animation duration for opening/closing (milliseconds)
        PROXIMITY_RADIUS: 150,          // Distance to detect vehicles approaching gate (pixels)
        COLOR: "#FF6B9D",                // Bright pink gate color
        BORDER_COLOR: "#E91E63",         // Deep pink border
        BORDER_WIDTH: 3,                // Gate border width (pixels)
    },
    
    // Level Editor settings
    EDITOR: {
        // Responsive sizing configuration
        GRID_WIDTH_PERCENT: 0.6,       // Grid width as percentage of screen width (0.6 = 60%)
        ZOOM_FACTOR: 1.0,              // Global zoom multiplier (0.5 = half size, 1.0 = normal, 2.0 = double size)
        ROAD_WIDTH_CELL_PERCENT: 1.33, // Road width as percentage of cell size (1.33 = 133%)
        
        // Grid configuration (like Parking Jam 3D)
        GRID_COLS: 12,                  // Number of columns in parking grid
        GRID_ROWS: 12,                  // Number of rows in parking grid
        // NOTE: CELL_SIZE is calculated dynamically as (screenWidth * GRID_WIDTH_PERCENT * ZOOM_FACTOR) / GRID_COLS
        GRID_LINE_COLOR: "#CCCCCC",     // Grid line color
        GRID_LINE_WIDTH: 2,            // Grid line thickness
        GRID_LINE_ALPHA: 0.5,          // Grid line transparency
        
        // Parking area (automatically calculated from grid)
        PARKING_COLOR: "#FFD6FF",       // Soft pink/lavender for parking area
        PARKING_ALPHA: 1.0,            // Parking area transparency (0-1)
        PARKING_BORDER_COLOR: "#9B7FFF", // Bright purple border
        PARKING_BORDER_WIDTH: 3,       // Border thickness
        
        // Road (automatically calculated from cell size)
        // NOTE: ROAD_WIDTH is calculated as cellSize * ROAD_WIDTH_CELL_PERCENT * ZOOM_FACTOR
        ROAD_COLOR: "#424242",          // Dark grey color for road center line
        ROAD_FILL_COLOR: "#616161",     // Road surface color
        ROAD_FILL_ALPHA: 0.7,          // Road transparency
        
        // Road corner radii (for curved corners)
        ROAD_OUTER_RADIUS: 80,         // Outer corner radius (larger, smoother curve)
        ROAD_INNER_RADIUS: 20,         // Inner corner radius (tighter curve)
        ROAD_SEGMENTS_PER_CORNER: 16,  // Number of segments for smooth curves
        
        // Car properties
        CAR_LENGTH: 2,                 // Car occupies 2 cells
    },
    
    // Available Vehicle Types
    // To add a new vehicle:
    // 1. Add the PNG file to graphics/vehicles/ folder
    // 2. Add an entry here with the key (filename without .png), label (display name), width, and length
    // 3. The vehicle will automatically appear in both the editor and game!
    VEHICLES: [
        { key: 'motorbike_1x2',   label: 'Motorbike (1×2)',   width: 1, length: 2, maxCharge: 5, reward: 100 },
        { key: 'car_1x2',    label: 'Car (1×2)',    width: 1, length: 2, maxCharge: 100, reward: 50 },
        { key: 'long_1x3',   label: 'Long (1×3)',   width: 1, length: 3, maxCharge: 150, reward: 75 },
        { key: 'truck_1x4',  label: 'Truck (1×4)',  width: 1, length: 4, maxCharge: 200, reward: 100 },
        { key: 'bus_1x1',    label: 'Bus (1×1)',    width: 1, length: 1, maxCharge: 50, reward: 25 },
        { key: 'drone_1x1',   label: 'Drone (1×1)',   width: 1, length: 1, maxCharge: 200, reward: 100 },
        { key: 'fire_1x3',   label: 'Fire Truck (1×3)',   width: 1, length: 3, maxCharge: 200, reward: 100 },
        { key: 'forklift_1x2',   label: 'Forklift (1×2)',   width: 1, length: 2, maxCharge: 200, reward: 100 },
        { key: 'helicopter_1x2',   label: 'Helicopter (1×2)',   width: 1, length: 2, maxCharge: 200, reward: 100 },
        { key: 'boat_1x2',   label: 'Boat (1×2)',   width: 1, length: 2, maxCharge: 200, reward: 100 },
        { key: 'jcb_2x5',   label: 'JCB (2×5)',   width: 2, length: 5, maxCharge: 200, reward: 100 },
        { key: 'load_1x3',   label: 'Loader (1×3)',   width: 1, length: 3, maxCharge: 200, reward: 100 },
        { key: 'pickup_1x2',   label: 'Pickup (1×2)',   width: 1, length: 2, maxCharge: 200, reward: 100 },
        { key: 'plow_1x2',   label: 'Plow (1×2)',   width: 1, length: 2, maxCharge: 200, reward: 100 },
        { key: 'police_1x2',   label: 'Police (1×2)',   width: 1, length: 2, maxCharge: 200, reward: 100 },
        { key: 'sweeper_1x2',   label: 'Sweeper (1×2)',   width: 1, length: 2, maxCharge: 200, reward: 100 },


    ]
};

// Battery image path cache (populated before game starts from batteryChargeData.js)
var BATTERY_IMAGE_PATHS = {};

// Utility function to check if a file exists (silently, no console errors)
function checkFileExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

// Initialize battery image paths cache using the BATTERY_DATA from batteryChargeData.js
// This allows complete freedom in naming battery sprite files (lamp_1.png, suitcase_1.png, etc.)
async function initBatteryImagePaths() {
    // Check if BATTERY_DATA is available
    if (typeof BATTERY_DATA === 'undefined' || !BATTERY_DATA) {
        console.error('BATTERY_DATA not found! Make sure batteryChargeData.js is loaded before config.js');
        return;
    }
    
    // Check each battery from BATTERY_DATA to see if its file exists
    for (let i = 0; i < BATTERY_DATA.length; i++) {
        const batteryInfo = BATTERY_DATA[i];
        const path = `graphics/battery/${batteryInfo.fileName}`;
        const exists = await checkFileExists(path);
        
        if (exists) {
            BATTERY_IMAGE_PATHS[batteryInfo.level] = path;
        } else {
            console.warn(`Battery sprite not found: ${path} (Level ${batteryInfo.level})`);
        }
    }
    
    console.log(`Loaded ${Object.keys(BATTERY_IMAGE_PATHS).length} battery sprites`);
}

// Helper function to load all battery images (to be called in preload after cache is initialized)
function loadBatteryImagesFromCache(scene) {
    // Load all batteries that exist in the cache
    for (let level in BATTERY_IMAGE_PATHS) {
        const path = BATTERY_IMAGE_PATHS[level];
        if (path) {
            scene.load.image(`battery${level}`, path);
        }
    }
}

// Get appropriate battery icon level (uses highest available if level exceeds available sprites)
function getBatteryIconLevel(level) {
    const highest = getHighestBatteryLevel();
    return Math.min(level, highest);
}
