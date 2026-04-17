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
    BATTERY_START_LEVEL: 1,        // Starting level for spawned batteries (1-7). Set higher to test high-level sprites without merging
    BATTERY_IMAGE_EXTENSIONS: ['svg', 'png', 'jpg', 'webp'],  // Priority order for battery image extensions
    
    // Game Area Background Colors
    BACKGROUND: {
        // Vibrant Poki-style casual game colors with gradient
        GRADIENT_START_COLOR: "#94E1FF",  // Light purple at top
        GRADIENT_END_COLOR: "#CFF5FF",    // Bright turquoise at bottom
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
        
        // Responsive sizing for PARKING JAM GRID ONLY (top section with cars)
        // Battery merge grid (bottom section) positioning is controlled by MERGE_GRID section below
        WIDTH_PERCENTAGE: 0.5,         // Parking grid width as percentage of screen width (reduced from 0.6 to 0.5 to fit chargers)
        SIZE_FACTOR: 1.0,              // Global size multiplier for parking grid (1.0 = normal, 1.5 = 150%, etc.)
        ROAD_WIDTH_FACTOR: 4 / 3,      // Road width as a factor of parking cell size (4/3 means road width = cellSize * 1.33)
        
        // Grid dimensions
        PARKING_COLS: 6,               // Number of columns in parking jam grid (can be overridden by level data)
        PARKING_ROWS: 6,               // Number of rows in parking jam grid (can be overridden by level data)
        
        // Parking area appearance
        PARKING_AREA_COLOR: "#e3e3e3",  // Soft pink/lavender for parking area floor
        TILE_TO_GRID_RATIO: 1,         // Number of tiles per grid cell (used when texture is enabled)
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
        TEXT_COLOR: '#FFEB3B',         // Bright yellow color for text
        TEXT_STROKE_COLOR: '#FF6F00',  // Orange outline color for text
        TEXT_STROKE_THICKNESS: 6,      // Outline thickness (pixels)
        COIN_ICON_WIDTH: 40,           // Coin icon display width (pixels)
        COIN_ICON_HEIGHT: 40,          // Coin icon display height (pixels)
        TEXT_ICON_SPACING: 10,         // Spacing between text and coin icon (pixels)
    },
    
    // Grid Cell Configuration (For Battery Merge Grid - Bottom Section)
    // These values are used directly for the merge game grid (3x3) and charging slots
    // The parking jam grid uses responsive sizing based on GRID.WIDTH_PERCENTAGE
    CELL: {
        SIZE: 110,                      // Cell width and height in pixels (used for merge game grid)
        GAP: 2,                        // Gap between cells (used for merge game grid)
        RADIUS: 15,                     // Rounded corner radius (used for merge game grid)
        
        // Inset look styling (creates recessed appearance)
        EMPTY_BG_COLOR: "#B4E4FF",      // Light blue for empty cells
        FILLED_BG_COLOR: "#FFFFFF",     // Bright white for occupied cells
        INSET_SHADOW_COLOR: "#0D7C9D",  // Deep teal for outer shadow (creates depth)
        INSET_BORDER_WIDTH: 4.5,       // Width of inset border (50% more than original 3)
        
        // Legacy border (deprecated - using inset styling instead)
        BORDER_COLOR: "#BBDDEE",        // Empty cell border color (not used with inset)
        BORDER_WIDTH: 3,                // Border width
        
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
        TINT: "#FFFFFF",                // White tint color
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
    
    // Charging connection line settings
    CHARGING_CONNECTION: {
        SLOT_SWITCH_DELAY: 500,         // Delay in milliseconds before a slot switches to charge the next vehicle after completing one (allows player to see completion)
        CORNER_RADIUS: 10,              // Radius for rounded corners in charging connection lines (pixels)
        LINE_WIDTH: 5,                  // Width of charging connection lines (pixels)
        LINE_COLOR: "#FF6B9D",           // Bright pink color for charging lines
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
        SIZE_MULTIPLIER: 1.5,           // EV charger size relative to original slot (1.5 = 150%)
        
        // Vertical layout positioning (chargers stacked vertically on left side)
        // Middle charger (index 1) is centered with parking area center
        // Top (index 0) and bottom (index 2) are equally spaced from middle
        HORIZONTAL_POSITION: 80,        // Horizontal position from left edge of screen (pixels)
        VERTICAL_SPACING: 180,          // Vertical spacing between chargers (pixels) - must be > SIZE * 100 to avoid overlap
        
        DROP_ZONE_SIZE: 95,             // Size of white rounded square drop zone inside charger (pixels)
        DROP_ZONE_OFFSET_X: 1,          // Horizontal offset of drop zone from charger center
        DROP_ZONE_OFFSET_Y: 16,         // Vertical offset of drop zone from charger center
        DROP_ZONE_RADIUS: 5,            // Corner radius for the white drop zone (pixels)
        DROP_ZONE_BG_COLOR: 0xFFFFFF,   // Background color of drop zone (white)
        DROP_ZONE_BG_ALPHA: 1.0,        // Transparency of drop zone (0-1, 1.0 = 100% opaque)
        
        // Charger bolt sub-image (overlay on charger)
        // Shows charging status: grey when idle, neon green when charging a vehicle
        BOLT_WIDTH: 25,                 // Display width of bolt icon (pixels)
        BOLT_HEIGHT: 25,                // Display height of bolt icon (pixels)
        BOLT_OFFSET_X: -25,             // Horizontal offset from charger center
        BOLT_OFFSET_Y: -50,             // Vertical offset from charger center
        BOLT_COLOR_INACTIVE: 0xCCCCCC,  // Grey color when not charging any vehicle
        BOLT_COLOR_ACTIVE: 0x00FF41,    // Neon green color when charging a vehicle
        BOLT_ALPHA: 1.0,                // Transparency (0 = invisible, 1.0 = fully opaque)
        
        // Charger on/off switch sub-image (overlay on charger)
        // Shows battery presence: charger_off.png when empty, charger_on.png when battery present
        SWITCH_WIDTH:41,               // Display width of on/off switch (pixels) - adjust to resize
        SWITCH_HEIGHT: 18,              // Display height of on/off switch (pixels) - adjust to resize
        SWITCH_OFFSET_X: 20,            // Horizontal offset from charger center (negative = left, positive = right)
        SWITCH_OFFSET_Y: -53,           // Vertical offset from charger center (negative = up, positive = down)
        SWITCH_ALPHA: 1.0,              // Transparency (0 = invisible, 1.0 = fully opaque)
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
        EASE: 'Power2'                 // Easing function for coin movement
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
        BATTERY_GRADIENT_MID_COLOR: "#FFD600",  // Bright yellow for medium charge (33-66%)
        BATTERY_GRADIENT_HIGH_COLOR: "#00E676", // Bright green for high charge (66-100%)
        BATTERY_CAP_WIDTH: 6,           // Width of battery terminal/cap on right side
        BATTERY_CAP_HEIGHT: 16,         // Height of battery terminal/cap
        BATTERY_CORNER_RADIUS: 4,       // Rounded corner radius for battery body
        
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
        COLOR: "#5E35B1",                // Deep purple shadow color
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
