// Shared config for dimensions and layout
var CONFIG = {
    FONT_FAMILY: 'Arial',
    TEXT_COLOR: '#333333',
    
    RESET_PROGRESS: false,         // Set to true to clear saved progress on load
    BATTERY_START_LEVEL: 13,        // Starting level for spawned batteries (1-7). Set higher to test high-level sprites without merging
    BATTERY_IMAGE_EXTENSIONS: ['svg', 'png', 'jpg', 'webp'],  // Priority order for battery image extensions
    
    // UI Button Configuration
    BUTTON: {
        // Spawn button
        SPAWN_WIDTH: 250,              // Width of spawn button
        SPAWN_HEIGHT: 90,              // Height of spawn button
        SPAWN_COLOR: 0x4CAF50,         // Green background color
        SPAWN_BORDER_COLOR: 0x2E7D32,  // Dark green border
        SPAWN_BORDER_WIDTH: 8,         // Border width
        
        // Level-up button
        LEVELUP_WIDTH: 180,            // Width of level-up button
        LEVELUP_HEIGHT: 70,            // Height of level-up button
        LEVELUP_COLOR: 0xFF9800,       // Orange background color
        LEVELUP_BORDER_COLOR: 0xE65100, // Dark orange border
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
    
    // Grid Layout Configuration
    GRID: {
        PADDING_FROM_BUTTON_TOP: 40,   // Padding between top of spawn button and bottom of grid (pixels)
    },
    
    // Coin Counter Display (above grid, top-right)
    COIN_COUNTER: {
        PADDING_FROM_GRID_TOP: 50,     // Padding above the grid (pixels)
        OFFSET_FROM_RIGHT: 50,         // Horizontal offset from right edge of grid (pixels)
        TEXT_SIZE: '48px',             // Font size for coin count text
        TEXT_COLOR: '#FFD700',         // Gold color for text
        COIN_ICON_WIDTH: 40,           // Coin icon display width (pixels)
        COIN_ICON_HEIGHT: 40,          // Coin icon display height (pixels)
        TEXT_ICON_SPACING: 10,         // Spacing between text and coin icon (pixels)
    },
    
    // Grid Cell Configuration
    CELL: {
        SIZE: 100,                      // Cell width and height in pixels
        GAP: 15,                        // Gap between cells
        RADIUS: 15,                     // Rounded corner radius
        BORDER_COLOR: 0xBBDDEE,        // Empty cell border color
        BORDER_WIDTH: 3,                // Border width
        FILLED_BG_COLOR: 0xFFFFFF,     // Background color when cell has a battery
        
        // Battery icon configuration
        BATTERY_SCALE: 1.0,            // Battery icon scale (1.0 = full size, 64px)
        BATTERY_Y_OFFSET: 5,           // Vertical offset from cell center (positive = down)
        
        // Level text configuration
        LEVEL_TEXT_SIZE: '11px',       // Font size for "LVL n" text
        LEVEL_TEXT_COLOR: '#000000',   // Text color (black)
        LEVEL_TEXT_Y_OFFSET: -40,      // Offset from battery center (negative = above)
        
        // Draggable background for cell contents (debug)
        DRAGGABLE_BG_COLOR: 0xffffff,  // Color of draggable area (0xffffff = white, 0xff0000 = red)
        DRAGGABLE_BG_ALPHA: 0,         // Transparency (0 = invisible, 0.3 = semi-transparent, 1 = opaque)
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
        COLOR: 0x8B4513,            // Brown color for the box
        BORDER_COLOR: 0x654321,     // Darker brown for border
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
        TINT: 0x808080,                // Grey tint color (0x808080 = grey)
        OFFSET_Y: 20,                  // Pixels below button center where top of pointer appears
        ANIMATION_MOVE_UP: 8,          // Pixels to move up during click animation
        ANIMATION_SCALE_DOWN: 0.9,     // Scale multiplier during click (0.9 = 10% smaller)
        ANIMATION_DURATION: 500,       // Duration of one click animation in milliseconds
        ANIMATION_YOYO: true,          // Animation returns to start
        ANIMATION_REPEAT: -1           // Repeat indefinitely (-1)
    },
    
    // Merge tutorial animation settings
    MERGE_TUTORIAL: {
        POINTER_OFFSET_Y: 50,          // Pixels below cell center where top of pointer appears
        ANIMATION_DURATION: 1000,      // Duration for pointer to move from cell 1 to cell 2
        ANIMATION_REPEAT: -1,          // Repeat indefinitely
        ANIMATION_EASE: 'Sine.easeInOut' // Easing function for smooth movement
    },
    
    // Lightning bolt charging effect settings
    LIGHTNING_BOLT: {
        SCALE_START: 0.5,              // Starting scale (relative to bolt.png size)
        SCALE_END: 1.5,                // Ending scale (relative to bolt.png size)
        ALPHA_START: 1,                // Starting transparency (0-1, 1 = opaque)
        ALPHA_END: 0,                  // Ending transparency (0-1, 0 = invisible)
        DURATION: 600                  // Animation duration in milliseconds
    },
    
    // Parking Jam Car Movement settings
    PARKING_CAR: {
        MAX_SPEED: 300,                 // Maximum speed of cars moving on the road (pixels per second)
        EXIT_TO_ROAD_DURATION: 1000,   // Duration for car to move from parking to road entrance (ms)
    },
    
    // Level Editor settings
    EDITOR: {
        // Grid configuration (like Parking Jam 3D)
        GRID_COLS: 6,                  // Number of columns in parking grid
        GRID_ROWS: 6,                  // Number of rows in parking grid
        CELL_SIZE: 64,                 // Size of each grid cell (pixels) - STANDARD SIZE
        GRID_LINE_COLOR: 0xCCCCCC,     // Grid line color
        GRID_LINE_WIDTH: 2,            // Grid line thickness
        GRID_LINE_ALPHA: 0.5,          // Grid line transparency
        
        // Parking area (automatically calculated from grid)
        PARKING_COLOR: 0xEEEEEE,       // Light grey color for parking area
        PARKING_ALPHA: 1.0,            // Parking area transparency (0-1)
        PARKING_BORDER_COLOR: 0x666666, // Dark grey border
        PARKING_BORDER_WIDTH: 3,       // Border thickness
        
        // Road rectangle (outer rectangle)
        ROAD_WIDTH: 40,                // Width/thickness of road (extends outward from parking edge)
        ROAD_COLOR: 0x555555,          // Dark grey color for road center line
        ROAD_FILL_COLOR: 0x777777,     // Road surface color
        ROAD_FILL_ALPHA: 0.7,          // Road transparency
        
        // Road corner radii (for curved corners)
        ROAD_OUTER_RADIUS: 80,         // Outer corner radius (larger, smoother curve)
        ROAD_INNER_RADIUS: 20,         // Inner corner radius (tighter curve)
        ROAD_SEGMENTS_PER_CORNER: 16,  // Number of segments for smooth curves
        
        // Car properties
        CAR_LENGTH: 2,                 // Car occupies 2 cells
    }
};

// Battery image path cache (populated before game starts)
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

// Initialize battery image paths cache - all batteries are now PNG in graphics/battery/
// Batteries are continuous - if Battery10 exists, Battery1-9 exist. If Battery11 doesn't exist, no batteries above 10.
async function initBatteryImagePaths(maxLevel = 100) {
    // Check sequentially and stop at first missing level
    for (let level = 1; level <= maxLevel; level++) {
        const path = `graphics/battery/Battery${level}.png`;
        const exists = await checkFileExists(path);
        
        if (exists) {
            BATTERY_IMAGE_PATHS[level] = path;
        } else {
            // First missing level found - stop checking
            console.log('Battery image paths initialized:', (level - 1), 'levels available (Battery1 to Battery' + (level - 1) + ')');
            return;
        }
    }
    
    // If we checked all levels without finding a missing one
    console.log('Battery image paths initialized:', maxLevel, 'levels available (Battery1 to Battery' + maxLevel + ')');
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

// Get the highest available battery level from loaded images
function getHighestBatteryLevel() {
    let highest = 1;
    for (let level = 1; level <= 100; level++) {
        if (BATTERY_IMAGE_PATHS[level]) {
            highest = level;
        } else {
            break; // Stop when we hit the first missing level
        }
    }
    return highest;
}

// Get appropriate battery icon level (uses highest available if level exceeds available sprites)
function getBatteryIconLevel(level) {
    const highest = getHighestBatteryLevel();
    return Math.min(level, highest);
}
