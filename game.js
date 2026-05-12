    // Single Scene combining Parking Jam (top) and Battery Merge Game (bottom)
    class GameScene extends Phaser.Scene {
        constructor() {
            super('GameScene');
        }

        init() {
            // Parking Jam properties (top half)
            this.cars = [];                     // Array of car objects {sprite, chargeRequired, currentCharge, isCharging, isMovingOut}
            this.chargingInterval = null;       // Interval for charging
            this.chargingEffects = [];          // Visual charging effects
            this.levelData = null;              // Current level data
            this.currentLevelIndex = 0;         // Track which level we're on
            this.allLevelsData = null;          // Store all levels data
            this.totalChargeRequired = 0;       // Total charge needed for all cars in level
            this.remainingCharge = 0;           // Remaining charge to complete level
            this.levelChargeText = null;        // Text display for remaining charge
            this.blockedCarsRetryTimer = null;  // Timer to retry moving blocked cars
            
            // Charging system properties (for parking jam)
            this.chargingSlots = [null, null, null]; // 3 slots, each charges a different car independently
            this.chargingSlotsUI = [];
            this.chargingConnectionsGraphics = null; // Graphics for drawing charging connections
            this.chargingAnimationProgress = [0, 0, 0]; // Animation progress for each slot (0 to 1)
            this.chargingPlugHeads = []; // Plug head sprites for each slot
            this.chargingPulseTimestamps = [0, 0, 0]; // Track last charge time for pulse effect
            this.slotCooldownUntil = [0, 0, 0]; // Timestamp when each slot can be reassigned (0 = no cooldown)
            
            // Vehicle sound management
            this.activeSounds = [];             // Track currently playing vehicle sounds
            this.maxConcurrentSounds = 5;       // Limit concurrent sounds (industry standard)
            
            // Gate properties
            this.gateLeftDoor = null;           // Left gate door sprite
            this.gateRightDoor = null;          // Right gate door sprite
            this.gateLeftPole = null;           // Left pole/hinge circle
            this.gateRightPole = null;          // Right pole/hinge circle
            this.gateOpen = false;              // Current gate state
            this.gateAnimating = false;         // Whether gate is currently animating
            this.gateCheckRadius = CONFIG.GATE.PROXIMITY_RADIUS; // Distance to check for nearby vehicles
            
            // Pizza delivery system properties
            this.pizzas = [];                   // Array of pizza sprites at counter
            this.currentPizzaCollector = null;  // Vehicle currently collecting pizza
            this.exitQueue = [];                // Queue of all vehicles that finished charging, waiting to collect pizza and exit
            this.pizzaCounterPosition = {       // Counter position from config
                x: CONFIG.PIZZA_DELIVERY.COUNTER_CENTER_X,
                y: CONFIG.PIZZA_DELIVERY.COUNTER_CENTER_Y
            };
            
            // Merge Scene properties (bottom half)
            this.coins = 1000;
            this.grid = Array(3).fill(null).map(() => Array(3).fill(null)); // 3x3 grid
            this.gridCells = [];
            this.batteries = [];
            this.draggingBattery = null;
            this.hasStartedPlaying = false;
            this.spawnButtonLevel = CONFIG.BATTERY_START_LEVEL;
            this.spawnCost = 10;
            this.highestBatteryLevel = CONFIG.BATTERY_START_LEVEL;
            this.levelUpTimer = null;
            this.levelUpButtonVisible = false;
            this.levelUpButtonShowTime = null;
            this.firstLevelUpTimer = true;
            this.mergeTutorialShown = false;
            this.mergePointer = null;  // Hand animation for merge tutorial
            
            // Grid layout constants (can be overridden by CONFIG.CELL)
            this.CELL_SIZE = CONFIG.CELL.SIZE;
            this.CELL_GAP = CONFIG.CELL.GAP;
            this.CELL_RADIUS = CONFIG.CELL.RADIUS;
            this.GRID_COLS = 3;
            this.GRID_ROWS = 3;
        }
        
        // Calculate dynamic sizes for parking jam grid only (top section)
        calculateParkingGridSizes() {
            const sceneWidth = this.cameras.main.width;
            
            // Calculate parking jam grid dimensions (top section)
            // Grid width is a percentage of screen width, with size factor applied
            const baseGridWidth = sceneWidth * CONFIG.GRID.WIDTH_PERCENTAGE;
            const parkingGridWidth = baseGridWidth * CONFIG.GRID.SIZE_FACTOR;
            
            // Default parking cell size (can be overridden by level data)
            const defaultParkingCols = CONFIG.GRID.PARKING_COLS;
            const defaultParkingRows = CONFIG.GRID.PARKING_ROWS;
            
            // Calculate cell size for parking grid (cells must be square)
            this.defaultParkingCellSize = parkingGridWidth / defaultParkingCols;
            
            // Road width is proportional to cell size
            this.roadWidthFactor = CONFIG.GRID.ROAD_WIDTH_FACTOR;
        }

        preload() {
            // Load battery images with extension fallback (from pre-initialized cache)
            loadBatteryImagesFromCache(this);
            
            this.load.image('coin', 'graphics/coin.png');
            this.load.image('pizza', 'graphics/pizza.png');
            this.load.image('point', 'graphics/point.png');
            this.load.image('button', 'graphics/spawn_button3.png');
            this.load.image('plug', 'graphics/plug.png');
            this.load.image('ev_charger_red', 'graphics/charger_red.png');
            this.load.image('ev_charger_green', 'graphics/charger_green.png');
            this.load.image('ev_charger_blue', 'graphics/charger_blue.png');
            this.load.image('charger_bolt', 'graphics/charger_bolt.png');
            this.load.image('charger_on', 'graphics/charger_on.png');
            this.load.image('charger_off', 'graphics/charger_off.png');
            
            // Load grass sprites
            this.load.image('grass1', 'graphics/grass/grass1.png');
            this.load.image('grass2', 'graphics/grass/grass2.png');
            this.load.image('grass3', 'graphics/grass/grass3.png');
            this.load.image('grass4', 'graphics/grass/grass4.png');
            
            // Load special zone images
            this.load.image('pizza_shop', 'graphics/library.png');
            // this.load.image('pizza_shop', 'graphics/pizza_shop.png');
            
            // Load grid panel background
            this.load.image('grid_panel', 'graphics/grid_panel.png');
            
            // Load parking jam assets - dynamically load all vehicles from CONFIG.VEHICLES
            CONFIG.VEHICLES.forEach(vehicle => {
                this.load.image(vehicle.key, `graphics/vehicles/${vehicle.key}.png`);
            });
            this.load.image('bolt', 'graphics/bolt_64.png');
            this.load.image('road', 'graphics/road_80.png');
            this.load.image('boomgate', 'graphics/boomgate.png');
            // this.load.image('parking_tile', 'graphics/parking_tile.png'); // Disabled - using solid color
            
            // Load vehicle sound
            this.load.audio('car_idle', 'sounds/car_idle.wav');
            
            // Load level data
            this.load.json('levels', 'levels.json');
        }

        create() {
            // Calculate dynamic sizes for parking grid only
            this.calculateParkingGridSizes();
            
            // Get scene dimensions
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Create gradient background (full screen)
            const bgGraphics = this.add.graphics();
            
            // Parse hex colors for gradient
            const startColor = parseInt(CONFIG.BACKGROUND.GRADIENT_START_COLOR.substring(1), 16);
            const endColor = parseInt(CONFIG.BACKGROUND.GRADIENT_END_COLOR.substring(1), 16);
            
            // Fill with vertical gradient (top to bottom)
            bgGraphics.fillGradientStyle(startColor, startColor, endColor, endColor, 1);
            bgGraphics.fillRect(0, 0, sceneWidth, sceneHeight);
            bgGraphics.setDepth(0); // Background layer
            
            // Spawn grass decoration sprites (above background, below other elements)
            this.spawnGrassSprites();
            
            // Create 3 charging slots (moved to top of bottom half, just below parking area)
            this.createChargingSlots();
            
            // Create graphics for charging connections
            this.chargingConnectionsGraphics = this.add.graphics();
            this.chargingConnectionsGraphics.setDepth(9); // Above road and tire tracks, below cars
            
            // Setup drag and drop for batteries
            this.setupBatteryDropZones();
            
            // Create 3x3 grid (must be before coin display to calculate grid position)
            this.createGrid();
            
            // Create coin display (positioned relative to grid)
            this.createCoinDisplay();
            
            // Spawn initial battery in grid
            this.spawnBatteryInGrid(0, 0, CONFIG.BATTERY_START_LEVEL);
            
            // Create spawn button and level-up button
            this.createButtons();
            
            // Show initial overlay
            this.createStartOverlay();
            
            // Setup input handlers for drag and drop
            this.input.on('dragstart', this.onDragStart, this);
            this.input.on('drag', this.onDrag, this);
            this.input.on('dragend', this.onDragEnd, this);
            
            // Load and start parking jam (in same scene)
            const levelsData = this.cache.json.get('levels');
            if (levelsData && levelsData.levels && levelsData.levels.length > 0) {
                this.allLevelsData = levelsData.levels;
                this.currentLevelIndex = 0;
                this.levelData = this.allLevelsData[this.currentLevelIndex];
                this.loadLevel(this.levelData);
            } else {
                // Show message if no level data
                this.add.text(sceneWidth / 2, parkingHeight / 2, 'No level data loaded\nUse Level Editor to create levels', {
                    fontSize: '20px',
                    fontFamily: CONFIG.FONT_FAMILY,
                    color: '#FFFFFF',
                    align: 'center',
                    stroke: '#5E35B1',
                    strokeThickness: 3
                }).setOrigin(0.5);
            }
        }

        spawnGrassSprites() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Parse grass color from config
            const grassColor = parseInt(CONFIG.GRASS.COLOR.substring(1), 16);
            const grassCount = CONFIG.GRASS.COUNT;
            const minSpacing = CONFIG.GRASS.MIN_SPACING;
            
            // Get forbidden zones from config
            const forbiddenZones = CONFIG.GRASS.FORBIDDEN_ZONES || [];
            
            // Draw forbidden zone debug rectangles if enabled
            if (CONFIG.GRASS.SHOW_FORBIDDEN_ZONES) {
                const debugGraphics = this.add.graphics();
                debugGraphics.setDepth(999); // On top of everything for visibility
                
                forbiddenZones.forEach(zone => {
                    const color = parseInt(zone.color.substring(1), 16);
                    const alpha = zone.opacity;
                    
                    // Calculate rectangle boundaries from center + dimensions
                    const x = zone.centerX - zone.width / 2;
                    const y = zone.centerY - zone.height / 2;
                    
                    debugGraphics.fillStyle(color, alpha);
                    debugGraphics.fillRect(x, y, zone.width, zone.height);
                });
            }
            
            // Get special zones from config and render if enabled
            const specialZones = CONFIG.GRASS.SPECIAL_ZONES || [];
            
            // Draw special zone debug rectangles if enabled
            if (CONFIG.GRASS.SHOW_SPECIAL_ZONES) {
                const debugGraphics = this.add.graphics();
                debugGraphics.setDepth(999); // On top of everything for visibility
                
                specialZones.forEach(zone => {
                    const color = parseInt(zone.color.substring(1), 16);
                    const alpha = zone.opacity;
                    
                    // Calculate rectangle boundaries from center + dimensions
                    const x = zone.centerX - zone.width / 2;
                    const y = zone.centerY - zone.height / 2;
                    
                    debugGraphics.fillStyle(color, alpha);
                    debugGraphics.fillRect(x, y, zone.width, zone.height);
                });
            }
            
            // Render special zone images
            specialZones.forEach(zone => {
                if (zone.tag === 'shop') {
                    // Add pizza shop image at top of screen, contained within zone width
                    const shopImage = this.add.image(0, 0, 'pizza_shop');
                    shopImage.setOrigin(0.5, 0); // Origin at top center
                    
                    // Calculate zone boundaries
                    const zoneLeft = zone.centerX - zone.width / 2;
                    const zoneRight = zone.centerX + zone.width / 2;
                    const zoneTop = 0; // Start from top of screen
                    const zoneHeight = zone.height;
                    
                    // Calculate scale to fit within zone width while maintaining aspect ratio
                    const scaleX = zone.width / shopImage.width;
                    const scaleY = zoneHeight / shopImage.height;
                    const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit within zone
                    
                    // Apply scale
                    shopImage.setScale(scale);
                    
                    // Position at zone center X and top of screen
                    shopImage.setPosition(zone.centerX, zoneTop);
                    shopImage.setDepth(1); // Below grass (2) but above background
                }
            });
            
            // Helper function to check if a point is inside any forbidden zone
            const isInForbiddenZone = (x, y) => {
                for (let zone of forbiddenZones) {
                    const halfWidth = zone.width / 2;
                    const halfHeight = zone.height / 2;
                    
                    // Check if point is inside the rectangle
                    if (x >= zone.centerX - halfWidth && x <= zone.centerX + halfWidth &&
                        y >= zone.centerY - halfHeight && y <= zone.centerY + halfHeight) {
                        return true;
                    }
                }
                return false;
            };
            
            // Track positions to avoid overlap
            const positions = [];
            
            // Grass sprite keys
            const grassKeys = ['grass1', 'grass2', 'grass3', 'grass4'];
            
            // Spawn grass sprites with random positioning
            let attempts = 0;
            const maxAttemptsPerSprite = 50;
            
            for (let i = 0; i < grassCount; i++) {
                let positionFound = false;
                let x, y;
                
                // Try to find a position that doesn't overlap with existing grass and is not in forbidden zones
                for (let attempt = 0; attempt < maxAttemptsPerSprite; attempt++) {
                    x = Phaser.Math.Between(0, sceneWidth);
                    y = Phaser.Math.Between(0, sceneHeight);
                    
                    // Check if position is in a forbidden zone
                    if (isInForbiddenZone(x, y)) {
                        continue; // Skip this position
                    }
                    
                    // Check if position is far enough from all existing positions
                    let tooClose = false;
                    for (let pos of positions) {
                        const distance = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
                        if (distance < minSpacing) {
                            tooClose = true;
                            break;
                        }
                    }
                    
                    if (!tooClose) {
                        positionFound = true;
                        break;
                    }
                }
                
                // If we found a valid position, spawn the grass sprite
                if (positionFound) {
                    // Randomly select a grass sprite
                    const randomGrassKey = Phaser.Utils.Array.GetRandom(grassKeys);
                    
                    // Create the grass sprite
                    const grassSprite = this.add.sprite(x, y, randomGrassKey);
                    
                    // Apply grass color tint
                    grassSprite.setTint(grassColor);
                    
                    // Set depth just above background (0) but below ALL other game elements
                    grassSprite.setDepth(1);
                    
                    // Store position to check for future overlaps
                    positions.push({ x, y });
                }
            }
        }

        createThinGround() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Thin ground positioned in upper section
            const groundY = sceneHeight * 0.35; // Position ground at 35% height
            const groundHeight = 20;
            const tileWidth = 64; // Width of ground tile
            
            // Create ground tiles horizontally
            const numTiles = Math.ceil(sceneWidth / tileWidth) + 1;
            for (let i = 0; i < numTiles; i++) {
                const tile = this.add.image(i * tileWidth, groundY, 'ground');
                tile.setOrigin(0, 0.5);
                tile.setDisplaySize(tileWidth, groundHeight);
                tile.setDepth(20);
            }
            
            // Create thin physics body for ground
            this.groundBody = this.matter.add.rectangle(
                sceneWidth / 2,
                groundY,
                sceneWidth,
                groundHeight,
                {
                    isStatic: true,
                    friction: 0.8,
                    restitution: 0,
                    render: {
                        visible: CONFIG.PHYSICS.DEBUG_GROUND_COLLIDER,
                        lineColor: 0x00FF00,
                        lineWidth: 2
                    }
                }
            );
            
            this.groundY = groundY;
        }
        
        createChargingSlots() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Position chargers vertically on the LEFT side of parking area
            // Wait for parking bounds to be set (they're set in loadLevel)
            // For now, estimate based on screen dimensions
            const parkingAreaHeight = sceneHeight * 0.5;
            const chargerSize = CONFIG.EV_CHARGER.CHARGER_SIZE;
            
            // Position chargers on the left side of screen, aligned vertically
            // Horizontal position: fixed distance from left screen edge
            const chargerX = CONFIG.EV_CHARGER.HORIZONTAL_POSITION;
            
            // Vertical positioning: center middle charger (index 1) with parking area center
            // Parking area center Y = parkingAreaHeight / 2
            const parkingCenterY = parkingAreaHeight / 2;
            
            // Get child element sizes/offsets from config (absolute pixel values)
            const dropZoneSize = CONFIG.EV_CHARGER.DROP_ZONE_SIZE;
            const dropZoneOffsetX = CONFIG.EV_CHARGER.DROP_ZONE_OFFSET_X;
            const dropZoneOffsetY = CONFIG.EV_CHARGER.DROP_ZONE_OFFSET_Y;
            const dropZoneRadius = CONFIG.EV_CHARGER.DROP_ZONE_RADIUS;
            const boltSize = CONFIG.EV_CHARGER.BOLT_SIZE;
            const boltOffsetX = CONFIG.EV_CHARGER.BOLT_OFFSET_X;
            const boltOffsetY = CONFIG.EV_CHARGER.BOLT_OFFSET_Y;
            const switchWidth = CONFIG.EV_CHARGER.SWITCH_WIDTH;
            const switchHeight = CONFIG.EV_CHARGER.SWITCH_HEIGHT;
            const switchOffsetX = CONFIG.EV_CHARGER.SWITCH_OFFSET_X;
            const switchOffsetY = CONFIG.EV_CHARGER.SWITCH_OFFSET_Y;
            
            for (let i = 0; i < 3; i++) {
                // Position chargers: i=0 (top), i=1 (middle/center), i=2 (bottom)
                // Middle charger (i=1) aligns with parking center
                const slotY = parkingCenterY + (i - 1) * CONFIG.EV_CHARGER.VERTICAL_SPACING;
                const slotX = chargerX;
                
                // Base EV Charger sprite - different color for each slot
                const chargerColors = ['ev_charger_red', 'ev_charger_green', 'ev_charger_blue'];
                const chargerSprite = this.add.sprite(slotX, slotY, chargerColors[i]);
                // Preserve aspect ratio: scale by height, adjust width accordingly
                const texture = chargerSprite.texture;
                const aspectRatio = texture.source[0].width / texture.source[0].height;
                const displayHeight = chargerSize;
                const displayWidth = displayHeight * aspectRatio;
                chargerSprite.setDisplaySize(displayWidth, displayHeight);
                chargerSprite.setDepth(1);
                // Start with normal appearance (no tint)
                
                // Drop zone inside the charger (inset look like merge grid cells)
                const dropZoneX = slotX + dropZoneOffsetX;
                const dropZoneY = slotY + dropZoneOffsetY;
                
                // Create inset look for empty drop zone
                const dropZoneEmpty = this.add.graphics();
                
                // Outer shadow border (creates recessed/inset effect)
                dropZoneEmpty.fillStyle(hexColor(CONFIG.EV_CHARGER.DROP_ZONE_INSET_SHADOW_COLOR), 1);
                dropZoneEmpty.fillRoundedRect(
                    dropZoneX - dropZoneSize / 2,
                    dropZoneY - dropZoneSize / 2,
                    dropZoneSize,
                    dropZoneSize,
                    dropZoneRadius
                );
                
                // Inner fill (lighter, creating depth)
                const inset = CONFIG.EV_CHARGER.DROP_ZONE_INSET_BORDER_WIDTH;
                dropZoneEmpty.fillStyle(hexColor(CONFIG.EV_CHARGER.DROP_ZONE_EMPTY_BG_COLOR), 1);
                dropZoneEmpty.fillRoundedRect(
                    dropZoneX - dropZoneSize / 2 + inset,
                    dropZoneY - dropZoneSize / 2 + inset,
                    dropZoneSize - inset * 2,
                    dropZoneSize - inset * 2,
                    dropZoneRadius - inset
                );
                dropZoneEmpty.setDepth(3); // Above merge grid (2) and charger sprite (1)
                
                // Create inset look for filled drop zone (when battery is present)
                const dropZoneFilled = this.add.graphics();
                
                // Outer shadow border (same as empty for consistency)
                dropZoneFilled.fillStyle(hexColor(CONFIG.EV_CHARGER.DROP_ZONE_INSET_SHADOW_COLOR), 1);
                dropZoneFilled.fillRoundedRect(
                    dropZoneX - dropZoneSize / 2,
                    dropZoneY - dropZoneSize / 2,
                    dropZoneSize,
                    dropZoneSize,
                    dropZoneRadius
                );
                
                // Inner fill (brighter white for occupied drop zone)
                dropZoneFilled.fillStyle(hexColor(CONFIG.EV_CHARGER.DROP_ZONE_FILLED_BG_COLOR), 1);
                dropZoneFilled.fillRoundedRect(
                    dropZoneX - dropZoneSize / 2 + inset,
                    dropZoneY - dropZoneSize / 2 + inset,
                    dropZoneSize - inset * 2,
                    dropZoneSize - inset * 2,
                    dropZoneRadius - inset
                );
                dropZoneFilled.setDepth(3); // Above merge grid (2) and charger sprite (1)
                dropZoneFilled.setVisible(false); // Start hidden (slot is empty)
                
                // Bolt sub-image (shows charging status) - overlay on charger, above drop zone
                const boltSprite = this.add.sprite(
                    slotX + boltOffsetX,
                    slotY + boltOffsetY,
                    'charger_bolt'
                );
                boltSprite.setDisplaySize(boltSize, boltSize);
                boltSprite.setAlpha(CONFIG.EV_CHARGER.BOLT_ALPHA);
                boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE); // Start grey (not charging)
                boltSprite.setDepth(4); // Above drop zone, visible on top
                
                // On/Off switch sub-image (shows battery presence) - overlay on charger, above drop zone
                const switchSprite = this.add.sprite(
                    slotX + switchOffsetX,
                    slotY + switchOffsetY,
                    'charger_off' // Start with OFF (no battery)
                );
                switchSprite.setDisplaySize(switchWidth, switchHeight);
                switchSprite.setAlpha(CONFIG.EV_CHARGER.SWITCH_ALPHA);
                switchSprite.setDepth(4); // Above drop zone, visible on top
                
                // Charge rate text (to the right of charger, near connection start, hidden initially)
                // Positioned close to charger with vertical offset to avoid overlapping with charging line
                const chargeText = this.add.text(slotX + chargerSize / 2 - 10, slotY - 20, '', {
                    fontSize: '18px',
                    fontFamily: CONFIG.FONT_FAMILY,
                    color: '#1A237E',
                    fontStyle: 'bold'
                }).setOrigin(0, 0.5).setVisible(false);
                chargeText.setDepth(10);
                
                // Drop zone for batteries (positioned at the white square location)
                const dropZone = this.add.zone(dropZoneX, dropZoneY, dropZoneSize, dropZoneSize);
                dropZone.setRectangleDropZone(dropZoneSize, dropZoneSize);
                dropZone.setData('slotIndex', i);
                
                this.chargingSlotsUI.push({
                    x: dropZoneX,  // Use drop zone position for battery placement
                    y: dropZoneY,  // Use drop zone position for battery placement
                    chargerSprite: chargerSprite,  // Base charger sprite
                    boltSprite: boltSprite,  // Bolt sub-image
                    switchSprite: switchSprite,  // On/Off switch sub-image
                    chargerX: slotX,  // Store charger center position
                    chargerY: slotY,  // Store charger center position
                    chargerSize: chargerSize,  // Store charger size for wire connection
                    dropZoneEmpty: dropZoneEmpty,  // Empty drop zone graphics (visible when slot is empty)
                    dropZoneFilled: dropZoneFilled,  // Filled drop zone graphics (visible when battery present)
                    chargeText: chargeText,
                    dropZone: dropZone,
                    batterySprite: null,
                    batteryLevelText: null,
                    // Store offsets for future adjustments
                    dropZoneOffsetX: dropZoneOffsetX,
                    dropZoneOffsetY: dropZoneOffsetY
                });
                
                // Create plug head sprite for this slot (hidden initially)
                const plugSize = CONFIG.CHARGING_CONNECTION.PLUG_HEAD_SIZE;
                const plugHead = this.add.sprite(0, 0, 'plug');
                plugHead.setDisplaySize(plugSize, plugSize);
                plugHead.setOrigin(0.5, 1); // Default: bottom center for vertical orientation
                plugHead.setDepth(10); // Same depth as cars
                plugHead.setTint(hexColor(CONFIG.CHARGING_CONNECTION.LINE_COLOR)); // Same color as charging line
                plugHead.setAlpha(CONFIG.CHARGING_CONNECTION.LINE_ALPHA); // Same transparency as line
                plugHead.setVisible(false);
                this.chargingPlugHeads.push(plugHead);
            }
        }
        
        createChargeBar() {
            const sceneWidth = this.cameras.main.width;
            
            // Charge bar at top-center
            const barWidth = 250;
            const barHeight = 28;
            const barX = sceneWidth / 2;
            const barY = 35;
            
            // Background
            this.chargeBarBg = this.add.rectangle(barX, barY, barWidth, barHeight, 0x333333);
            this.chargeBarBg.setStrokeStyle(3, 0x000000);
            
            // Charge fill
            this.chargeBarFill = this.add.rectangle(
                barX - barWidth / 2,
                barY,
                0,
                barHeight - 6,
                0x4CAF50
            );
            this.chargeBarFill.setOrigin(0, 0.5);
            
            // Text
            this.chargeText = this.add.text(barX, barY, '⚡ 0/100', {
                fontSize: '18px',
                fontFamily: CONFIG.FONT_FAMILY,
                color: '#FFFFFF',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.chargeBarBg.setDepth(500);
            this.chargeBarFill.setDepth(501);
            this.chargeText.setDepth(502);
        }
        
        setupBatteryDropZones() {
            // This will be used to handle drag/drop from MergeScene
            // For now, we'll use a simple click mechanism to add batteries for testing
            this.input.on('drop', (pointer, gameObject, dropZone) => {
                if (dropZone.getData('slotIndex') !== undefined) {
                    this.handleBatteryDrop(gameObject, dropZone.getData('slotIndex'));
                }
            });
        }
        
        // Method to add battery to charging slot (can be called from MergeScene)
        addBatteryToSlot(slotIndex, level, preserveAssignedCar = null) {
            if (slotIndex < 0 || slotIndex >= 3) return;
            if (this.chargingSlots[slotIndex] !== null) {
                // Slot already occupied
                return;
            }
            
            const slot = this.chargingSlotsUI[slotIndex];
            const chargePerMinute = getBatteryChargeValue(level);
            
            // Determine which battery icon to use (dynamically uses highest available)
            const batteryIconLevel = getBatteryIconLevel(level);
            const batteryIcon = `battery${batteryIconLevel}`;
            
            // Calculate scale factor based on drop zone size vs grid cell size
            // This ensures battery and text fit perfectly in the drop zone
            const dropZoneSize = CONFIG.EV_CHARGER.DROP_ZONE_SIZE;
            const gridCellSize = CONFIG.CELL.SIZE;
            const scaleFactor = dropZoneSize / gridCellSize;
            
            // Create battery sprite in slot (scaled to fit drop zone)
            const batterySprite = this.add.image(slot.x, slot.y + CONFIG.CELL.BATTERY_Y_OFFSET * scaleFactor, batteryIcon);
            const scaledBatterySize = CONFIG.CELL.BATTERY_DISPLAY_SIZE * scaleFactor;
            batterySprite.setDisplaySize(scaledBatterySize, scaledBatterySize);
            batterySprite.setDepth(6); // Above charger drop zone (3)
            
            // Make battery draggable
            const hitArea = new Phaser.Geom.Rectangle(
                -50,
                -50,
                100,
                100
            );
            batterySprite.setInteractive({
                hitArea: hitArea,
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                draggable: true,
                useHandCursor: true
            });
            
            // Level text at top (scaled to fit drop zone)
            const scaledTextOffset = CONFIG.CELL.LEVEL_TEXT_Y_OFFSET * scaleFactor;
            const levelText = this.add.text(slot.x, slot.y + CONFIG.CELL.BATTERY_Y_OFFSET * scaleFactor + scaledTextOffset, `LVL ${level}`, {
                fontSize: CONFIG.CELL.LEVEL_TEXT_SIZE,
                fontFamily: CONFIG.FONT_FAMILY,
                color: CONFIG.CELL.LEVEL_TEXT_COLOR,
                fontStyle: 'bold'
            }).setOrigin(0.5);
            levelText.setScale(scaleFactor); // Scale the text to match drop zone size
            levelText.setDepth(7); // Above battery sprite
            
            // Show charge rate
            slot.chargeText.setText(`${chargePerMinute}`);
            slot.chargeText.setVisible(true);
            
            // Make charger sprite active/normal (battery is now present)
            slot.chargerSprite.clearTint();
            
            // Switch to ON sprite (battery present)
            slot.switchSprite.setTexture('charger_on');
            
            // Toggle drop zone appearance (show filled, hide empty)
            slot.dropZoneEmpty.setVisible(false);
            slot.dropZoneFilled.setVisible(true);
            
            // Store battery data
            slot.batterySprite = batterySprite;
            slot.batteryLevelText = levelText;
            
            // Create battery data object
            const batteryData = {
                sprite: batterySprite,
                levelText: levelText,
                level: level,
                slotIndex: slotIndex,
                originalX: slot.x,
                originalY: slot.y + CONFIG.CELL.BATTERY_Y_OFFSET,
                inGrid: false,
                inChargingSlot: true
            };
            
            batterySprite.setData('batteryData', batteryData);
            
            this.chargingSlots[slotIndex] = {
                level: level,
                chargePerMinute: chargePerMinute,
                batteryData: batteryData,
                assignedCar: preserveAssignedCar,  // Preserve existing car assignment if provided
                assignedAt: preserveAssignedCar ? this.time.now : null  // Set timestamp if car already assigned
            };
            
            // Only assign a new car if no car was preserved
            if (preserveAssignedCar === null) {
                this.assignCarToSlot(slotIndex);
            } else {
                // If car was preserved, show its battery display at current charge
                const car = preserveAssignedCar;
                if (CONFIG.PARKING_CAR.CHARGE_DISPLAY_MODE === 'value') {
                    if (car.batteryContainer) car.batteryContainer.setVisible(true);
                } else {
                    if (car.chargeBar) car.chargeBar.setVisible(true);
                    if (car.chargeBarBg) car.chargeBarBg.setVisible(true);
                }
                this.updateCarChargeBar(car);
                
                // Make bolt neon green (car is still being charged)
                slot.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_ACTIVE);
            }
            this.updateChargingSystem();
        }
        
        removeBatteryFromSlot(slotIndex) {
            if (slotIndex < 0 || slotIndex >= 3) return;
            if (this.chargingSlots[slotIndex] === null) return;
            
            const slot = this.chargingSlotsUI[slotIndex];
            
            // Remove UI elements
            if (slot.batterySprite) slot.batterySprite.destroy();
            if (slot.batteryLevelText) slot.batteryLevelText.destroy();
            
            slot.batterySprite = null;
            slot.batteryLevelText = null;
            slot.chargeText.setVisible(false);
            
            // Keep charger sprite normal (no tint)
            // slot.chargerSprite.clearTint();
            
            // Switch to OFF sprite (no battery)
            slot.switchSprite.setTexture('charger_off');
            
            // Toggle drop zone appearance (show empty, hide filled)
            slot.dropZoneEmpty.setVisible(true);
            slot.dropZoneFilled.setVisible(false);
            
            // Make bolt grey (not charging)
            slot.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE);
            
            // If this slot had an assigned car, hide its charge display
            const slotData = this.chargingSlots[slotIndex];
            if (slotData && slotData.assignedCar) {
                const car = slotData.assignedCar;
                // Only hide if car has no charge yet
                if (car.currentCharge === 0) {
                    if (car.chargeBar) car.chargeBar.setVisible(false);
                    if (car.chargeBarBg) car.chargeBarBg.setVisible(false);
                    if (car.chargeText) car.chargeText.setVisible(false);
                    if (car.batteryContainer) car.batteryContainer.setVisible(false);
                }
                car.isCharging = false;
            }
            
            this.chargingSlots[slotIndex] = null;
            
            // Update charging system
            this.updateChargingSystem();
        }
        
        updateChargingSystem() {
            // Each slot works independently - no total rate needed
            // Just ensure all slots with batteries have cars assigned
            for (let i = 0; i < this.chargingSlots.length; i++) {
                // Skip slots that are on cooldown (waiting for switch delay)
                if (this.time.now < this.slotCooldownUntil[i]) {
                    continue;
                }
                
                if (this.chargingSlots[i] !== null && this.chargingSlots[i].assignedCar === null) {
                    this.assignCarToSlot(i);
                }
            }
        }
        
        // Assign next available uncharged car to a slot
        assignCarToSlot(slotIndex) {
            if (this.chargingSlots[slotIndex] === null) return;
            
            // Find next car that needs charging and isn't assigned to another slot
            for (let car of this.cars) {
                if (car.isMovingOut) continue;
                if (car.currentCharge >= car.chargeRequired) continue;
                
                // Check if this car is already assigned to another slot
                let alreadyAssigned = false;
                for (let i = 0; i < this.chargingSlots.length; i++) {
                    if (this.chargingSlots[i] && this.chargingSlots[i].assignedCar === car) {
                        alreadyAssigned = true;
                        break;
                    }
                }
                
                if (!alreadyAssigned) {
                    // Assign this car to the slot
                    this.chargingSlots[slotIndex].assignedCar = car;
                    this.chargingSlots[slotIndex].assignedAt = this.time.now; // Track when car was assigned
                    
                    // Set charger color for this car (for battery/meter outline color coding)
                    const chargerColors = [
                        CONFIG.PARKING_CAR.CHARGER_COLOR_RED,    // Slot 0 (top/red charger)
                        CONFIG.PARKING_CAR.CHARGER_COLOR_GREEN,  // Slot 1 (middle/green charger)
                        CONFIG.PARKING_CAR.CHARGER_COLOR_BLUE    // Slot 2 (bottom/blue charger)
                    ];
                    car.chargerColor = chargerColors[slotIndex];
                    
                    // Recreate battery display with charger color
                    if (car.batteryContainer) {
                        car.batteryContainer.destroy();
                        car.batteryContainer = null;
                    }
                    if (car.chargeBar) {
                        car.chargeBar.destroy();
                        car.chargeBar = null;
                    }
                    if (car.chargeBarBg) {
                        car.chargeBarBg.destroy();
                        car.chargeBarBg = null;
                    }
                    this.createCarChargeBar(car);
                    
                    // Make bolt neon green (actively charging a vehicle)
                    const slotUI = this.chargingSlotsUI[slotIndex];
                    if (slotUI && slotUI.boltSprite) {
                        slotUI.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_ACTIVE);
                    }
                    
                    // Immediately show battery and meter at current charge (usually 0)
                    // This gives visual feedback before first charge pulse
                    if (CONFIG.PARKING_CAR.CHARGE_DISPLAY_MODE === 'value') {
                        if (car.batteryContainer) car.batteryContainer.setVisible(true);
                    } else {
                        if (car.chargeBar) car.chargeBar.setVisible(true);
                        if (car.chargeBarBg) car.chargeBarBg.setVisible(true);
                    }
                    // Update displays to show current state (0%)
                    this.updateCarChargeBar(car);
                    
                    // Start line tracing animation if enabled
                    if (CONFIG.CHARGING_CONNECTION.ANIMATE_ENABLED) {
                        this.chargingAnimationProgress[slotIndex] = 0.001; // Start with tiny bit visible
                        this.tweens.add({
                            targets: this.chargingAnimationProgress,
                            [slotIndex]: 1,
                            duration: CONFIG.CHARGING_CONNECTION.ANIMATE_DURATION,
                            ease: CONFIG.CHARGING_CONNECTION.ANIMATE_EASE
                        });
                    } else {
                        this.chargingAnimationProgress[slotIndex] = 1; // Show full line immediately
                    }
                    
                    return;
                }
            }
            
            // No car available - slot remains idle
        }
        
        // ========== PARKING JAM METHODS ==========
        
        loadLevel(levelData) {
            // Store grid configuration (from level or defaults)
            // Get size_factor (per-level zoom) from level data, default to 1.0
            const levelSizeFactor = levelData.grid?.size_factor || 1.0;
            
            this.gridConfig = levelData.grid || { 
                cols: CONFIG.GRID.PARKING_COLS, 
                rows: CONFIG.GRID.PARKING_ROWS
            };
            
            // Always set cols and rows from level or defaults
            this.gridConfig.cols = this.gridConfig.cols || CONFIG.GRID.PARKING_COLS;
            this.gridConfig.rows = this.gridConfig.rows || CONFIG.GRID.PARKING_ROWS;
            
            // Calculate dynamic cell size based on screen width and level's size_factor
            const sceneWidth = this.cameras.main.width;
            const baseGridWidth = sceneWidth * CONFIG.GRID.WIDTH_PERCENTAGE;
            
            // Apply both the global SIZE_FACTOR and the level's size_factor
            const parkingGridWidth = baseGridWidth * CONFIG.GRID.SIZE_FACTOR * levelSizeFactor;
            
            // Calculate cell size from grid width and number of columns (cells must be square)
            let calculatedCellSize = parkingGridWidth / this.gridConfig.cols;
            
            // Apply constraint square if enabled
            if (CONFIG.GRID.CONSTRAINT_SQUARE_ENABLED) {
                const constraintSize = CONFIG.GRID.CONSTRAINT_SQUARE_SIZE;
                
                // Calculate road width based on initial cell size
                const roadWidth = calculatedCellSize * this.roadWidthFactor;
                
                // Calculate total area needed (parking + roads on 3 sides: left, right, bottom)
                const parkingWidth = this.gridConfig.cols * calculatedCellSize;
                const parkingHeight = this.gridConfig.rows * calculatedCellSize;
                const totalWidth = parkingWidth + 2 * roadWidth;   // Left + parking + right
                const totalHeight = parkingHeight + 2 * roadWidth;  // Top + parking + bottom (not including upward exit)
                
                // Find the larger dimension
                const maxDimension = Math.max(totalWidth, totalHeight);
                
                // Always scale to fit constraint square (scale up OR down to maximize usage)
                const scaleFactor = constraintSize / maxDimension;
                calculatedCellSize = calculatedCellSize * scaleFactor;
            }
            
            // Set calculated cellSize
            this.gridConfig.cellSize = calculatedCellSize;
            
            // Initialize grid occupancy tracking (null = empty, car reference = occupied)
            this.gridOccupancy = Array(this.gridConfig.rows).fill(null).map(() => 
                Array(this.gridConfig.cols).fill(null)
            );
            
            // Draw parking and road if they exist in level data
            if (levelData.parking && levelData.road) {
                this.drawParkingAndRoad(levelData.parking, levelData.road);
            } else {
                console.warn('Missing parking or road data in level!');
            }
            
            // Spawn cars from level data
            for (let carData of levelData.cars) {
                this.spawnCar(carData);
            }
            
            // Create pizzas at counter (one for each vehicle)
            if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                this.createPizzasAtCounter();
            }
            
            // Calculate total charge required for all cars
            this.totalChargeRequired = this.cars.reduce((sum, car) => sum + car.chargeRequired, 0);
            this.remainingCharge = this.totalChargeRequired;
            
            // Update charge display
            this.updateLevelChargeDisplay();
            
            // Determine which cars can move initially
            this.updateMovableCars();
            
            // Start charging system
            this.startCharging();
        }
        
        drawParkingAndRoad(parkingData, roadData) {
            // Clean up existing parking-related graphics
            if (this.parkingFloor) {
                this.parkingFloor.destroy();
                this.parkingFloor = null;
            }
            if (this.parkingBorder) {
                this.parkingBorder.destroy();
                this.parkingBorder = null;
            }
            if (this.parkingLinesGraphics) {
                this.parkingLinesGraphics.destroy();
                this.parkingLinesGraphics = null;
            }
            if (this.roadMarkingsGraphics) {
                this.roadMarkingsGraphics.destroy();
                this.roadMarkingsGraphics = null;
            }
            if (this.constraintSquareGraphics) {
                this.constraintSquareGraphics.destroy();
                this.constraintSquareGraphics = null;
            }
            if (this.roadRope) {
                this.roadRope.destroy();
                this.roadRope = null;
            }
            
            // Clean up existing gate if any
            if (this.gateLeftDoor) {
                this.gateLeftDoor.destroy();
                this.gateLeftDoor = null;
            }
            if (this.gateRightDoor) {
                this.gateRightDoor.destroy();
                this.gateRightDoor = null;
            }
            if (this.gateLeftPole) {
                this.gateLeftPole.destroy();
                this.gateLeftPole = null;
            }
            if (this.gateRightPole) {
                this.gateRightPole.destroy();
                this.gateRightPole = null;
            }
            this.gatePosition = null;
            this.gateOpen = false;
            this.gateAnimating = false;
            
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            const parkingAreaHeight = sceneHeight * 0.5;
            
            // Center position for parking area (in top half) - shifted to the right
            const horizontalShift = sceneWidth * (CONFIG.GRID.PARKING_HORIZONTAL_OFFSET || 0);
            let centerX = sceneWidth / 2 + horizontalShift;
            let centerY = parkingAreaHeight / 2 + 30; // Slightly below center to account for title
            
            // Apply constraint square position offset if enabled
            if (CONFIG.GRID.CONSTRAINT_SQUARE_ENABLED) {
                const offsetX = CONFIG.GRID.CONSTRAINT_SQUARE_OFFSET_X || 0;
                const offsetY = CONFIG.GRID.CONSTRAINT_SQUARE_OFFSET_Y || 0;
                centerX += offsetX;
                centerY += offsetY;
            }
            
            // Calculate parking dimensions from grid
            const parkingWidth = this.gridConfig.cols * this.gridConfig.cellSize;
            const parkingHeight = this.gridConfig.rows * this.gridConfig.cellSize;
            
            // Store parking bounds for car spawning
            this.parkingLeft = centerX - parkingWidth / 2;
            this.parkingTop = centerY - parkingHeight / 2;
            
            // Calculate road width dynamically based on cell size (ignore level data)
            const calculatedRoadWidth = this.gridConfig.cellSize * this.roadWidthFactor;
            
            // Set road width to calculated value (not from level data)
            const roadWidth = calculatedRoadWidth;
            
            // Create curved road path
            const halfW = parkingWidth / 2;
            const halfH = parkingHeight / 2;
            const offset = roadWidth / 2;
            
            this.roadPath = this.createRoadPath(
                centerX, centerY, halfW, halfH, offset
            );
            
            // Find closest waypoint on path to pizza counter (for waypoint-based stopping)
            if (CONFIG.PIZZA_DELIVERY.ENABLED && this.pizzaCounterPosition) {
                const pathPoints = this.roadPath.getSpacedPoints(500); // Same 500 points used for vehicle movement
                let closestDist = Infinity;
                let closestIndex = 0;
                
                for (let i = 0; i < pathPoints.length; i++) {
                    const dist = Phaser.Math.Distance.Between(
                        pathPoints[i].x, pathPoints[i].y,
                        this.pizzaCounterPosition.x, this.pizzaCounterPosition.y
                    );
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIndex = i;
                    }
                }
                
                this.pizzaCounterWaypointIndex = closestIndex;
            }
            
            // Draw road using Rope with texture - simple approach
            // Sample points along the center path
            const numPoints = 150;
            const worldPoints = [];
            
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const point = this.roadPath.getPoint(t);
                worldPoints.push(point);
            }
            
            // Pre-scale the texture to match desired road width
            const roadTextureSize = 80; // Original road_80.png size
            const scaledSize = roadWidth; // Target size
            const textureScale = scaledSize / roadTextureSize;
            
            // Create a scaled version of the road texture using RenderTexture
            const scaledTextureName = `road_scaled_${Math.round(scaledSize)}`;
            
            // Check if we already created this scaled texture
            if (!this.textures.exists(scaledTextureName)) {
                // Create render texture with the scaled size
                const rt = this.add.renderTexture(0, 0, scaledSize, scaledSize);
                
                // Draw the original texture scaled to fit
                const tempSprite = this.add.sprite(0, 0, 'road').setOrigin(0, 0);
                tempSprite.setScale(textureScale);
                rt.draw(tempSprite, 0, 0);
                
                // Save as a new texture
                rt.saveTexture(scaledTextureName);
                
                // Clean up
                tempSprite.destroy();
                rt.destroy();
            }
            
            // Create rope at origin with world coordinates using the scaled texture
            this.roadRope = this.add.rope(0, 0, scaledTextureName, null, worldPoints);
            
            // Roads are always fully opaque (no transparency) to prevent background color bleed-through
            this.roadRope.setAlpha(1.0);
            
            // Set depth above parking area
            this.roadRope.setDepth(6);
            
            // Add road markings for visual clarity
            this.drawRoadMarkings(roadWidth, numPoints);
            
            // Create exit gate at the end of the road
            this.createExitGate(centerX, centerY, halfW, halfH, offset, roadWidth);
            
            // Draw parking area with solid color from CONFIG
            this.parkingFloor = this.add.rectangle(
                centerX,
                centerY,
                parkingWidth,
                parkingHeight,
                hexColor(CONFIG.GRID.PARKING_AREA_COLOR),
                parkingData.alpha
            );
            this.parkingFloor.setDepth(4);
            
            // Draw border around entire parking area
            this.parkingBorder = this.add.rectangle(
                centerX,
                centerY,
                parkingWidth,
                parkingHeight,
                0xFFFFFF,
                0 // Transparent fill, border only
            );
            this.parkingBorder.setStrokeStyle(parkingData.borderWidth, parkingData.borderColor);
            this.parkingBorder.setDepth(4);
            
            // Draw parking lines dynamically
            this.drawParkingLines(centerX, centerY, parkingWidth, parkingHeight, this.gridConfig.cellSize, this.gridConfig.cols, this.gridConfig.rows);
            
            // Draw constraint square if enabled and visible
            if (CONFIG.GRID.CONSTRAINT_SQUARE_ENABLED && CONFIG.GRID.CONSTRAINT_SQUARE_VISIBLE) {
                const constraintSize = CONFIG.GRID.CONSTRAINT_SQUARE_SIZE;
                const offsetX = CONFIG.GRID.CONSTRAINT_SQUARE_OFFSET_X || 0;
                const offsetY = CONFIG.GRID.CONSTRAINT_SQUARE_OFFSET_Y || 0;
                
                this.constraintSquareGraphics = this.add.graphics();
                this.constraintSquareGraphics.lineStyle(3, 0xFF0000, 1); // Red outline, 3px thick
                this.constraintSquareGraphics.strokeRect(
                    centerX - constraintSize / 2,
                    centerY - constraintSize / 2,
                    constraintSize,
                    constraintSize
                );
                this.constraintSquareGraphics.setDepth(100); // On top of everything for debugging
            }
        
        this.findCounterPathIndex();
    }
    
    // Find which path index is closest to the counter point (for pizza delivery)
    findCounterPathIndex() {
        if (!this.roadPath) return;
        const points = this.roadPath.getSpacedPoints(500);
        let closestIndex = 0;
        let minDist = Infinity;
        for (let i = 0; i < points.length; i++) {
            const dx = points[i].x - CONFIG.PIZZA_DELIVERY.COUNTER_CENTER_X;
            const dy = points[i].y - CONFIG.PIZZA_DELIVERY.COUNTER_CENTER_Y;
            const d = dx*dx + dy*dy;
            if (d < minDist) { minDist = d; closestIndex = i; }
        }
        this.counterPathIndex = closestIndex;
    }
        
        // Create exit gate at the end of the road (left edge going upward)
        createExitGate(centerX, centerY, halfW, halfH, offset, roadWidth) {
            // Calculate gate position at the left edge of the road, near the exit
            const left = centerX - halfW - offset;
            const top = centerY - halfH - offset;
            const radius = offset;
            
            // Calculate the exit tail (upward extension from top-left corner)
            const cellSize = this.gridConfig.cellSize;
            const exitExtraDistance = cellSize * 8; // Same as in createRoadPath
            const exitTailStart = top + radius; // Where the upward exit tail begins (after corner)
            const exitTailEnd = Math.min(top + radius, 0) - exitExtraDistance; // Top of exit tail
            const exitTailLength = exitTailStart - exitTailEnd; // Positive length (going upward)
            
            // Position gate along the exit tail based on CONFIG
            // POSITION_Y_FACTOR: 0 = at bottom of exit tail, 0.5 = halfway up, 1 = at top
            const gateX = left; // X position at left edge of road
            const gateY = exitTailStart - (exitTailLength * CONFIG.GATE.POSITION_Y_FACTOR);
            
            // Gate dimensions from CONFIG
            const pivotOffset = CONFIG.GATE.PIVOT_OFFSET; // How far pivot extends beyond road edge
            const gateLength = roadWidth * CONFIG.GATE.LENGTH_PERCENT + pivotOffset; // Extended to reach from pole to road
            const gateThickness = roadWidth * CONFIG.GATE.THICKNESS_PERCENT; // Gate thickness
            const centerGap = roadWidth * CONFIG.GATE.CENTER_GAP_PERCENT; // Gap documented for reference
            
            // Create left pole/hinge (circle in top view) - orange color
            const leftPoleX = gateX - roadWidth / 2 - pivotOffset;
            this.gateLeftPole = this.add.circle(
                leftPoleX,
                gateY,
                CONFIG.GATE.POLE_RADIUS,
                hexColor(CONFIG.GATE.POLE_COLOR) // Orange color
            );
            this.gateLeftPole.setStrokeStyle(CONFIG.GATE.POLE_BORDER_WIDTH, hexColor(CONFIG.GATE.POLE_BORDER_COLOR));
            this.gateLeftPole.setDepth(11); // Above gates
            
            // Create right pole/hinge (circle in top view) - orange color
            const rightPoleX = gateX + roadWidth / 2 + pivotOffset;
            this.gateRightPole = this.add.circle(
                rightPoleX,
                gateY,
                CONFIG.GATE.POLE_RADIUS,
                hexColor(CONFIG.GATE.POLE_COLOR) // Orange color
            );
            this.gateRightPole.setStrokeStyle(CONFIG.GATE.POLE_BORDER_WIDTH, hexColor(CONFIG.GATE.POLE_BORDER_COLOR));
            this.gateRightPole.setDepth(11); // Above gates
            
            // Create left gate door (starts at left pole, extends toward center)
            // Both gates aligned on same horizontal line
            // When closed: horizontal (perpendicular to upward road)
            // Pivots on its outer (left) edge at the pole
            this.gateLeftDoor = this.add.image(
                leftPoleX, // Pivot at pole position
                gateY, // Same Y as right gate - horizontally aligned
                'boomgate' // Use boomgate texture
            );
            this.gateLeftDoor.setDisplaySize(gateLength, gateThickness); // Scale to fit dimensions
            this.gateLeftDoor.setDepth(10); // Above road
            this.gateLeftDoor.setOrigin(0, 0.5); // Pivot on left edge (outer edge at pole)
            
            // Create right gate door (starts at right pole, extends toward center)
            // Both gates aligned on same horizontal line
            // When closed: horizontal (perpendicular to upward road)
            // Pivots on its outer (right) edge at the pole
            this.gateRightDoor = this.add.image(
                rightPoleX, // Pivot at pole position
                gateY, // Same Y as left gate - horizontally aligned
                'boomgate' // Use boomgate texture
            );
            this.gateRightDoor.setDisplaySize(gateLength, gateThickness); // Scale to fit dimensions
            this.gateRightDoor.setDepth(10); // Above road
            this.gateRightDoor.setOrigin(1, 0.5); // Pivot on right edge (outer edge at pole)
            
            // Store gate position for proximity checks
            this.gatePosition = { x: gateX, y: gateY };
        }
        
        // Check if any vehicle is near the gate
        isVehicleNearGate() {
            if (!this.gatePosition) return false;
            
            for (let car of this.cars) {
                // Only check cars that are moving out
                if (!car.isMovingOut) continue;
                
                const dx = car.sprite.x - this.gatePosition.x;
                const dy = car.sprite.y - this.gatePosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Car must be approaching from below (higher y values) moving up the exit tail
                const isApproachingFromBelow = car.sprite.y > this.gatePosition.y; // Car is below gate (coming up)
                
                // Car's x position must be less than the right edge of right gate (where pivot is)
                // Right gate door pivots at: gateX + roadWidth/2 (extreme right edge of road)
                // Car travels along center of road, so car.x should be < right edge to be on the road
                const roadWidth = this.gridConfig.roadWidth || 100;
                const rightGateEdge = this.gatePosition.x + roadWidth / 2;
                const leftGateEdge = this.gatePosition.x - roadWidth / 2;
                const isOnExitTail = car.sprite.x > leftGateEdge && car.sprite.x < rightGateEdge;
                
                if (distance < this.gateCheckRadius && isApproachingFromBelow && isOnExitTail) {
                    return true;
                }
            }
            return false;
        }
        
        // Open the gate (doors swing outward, becoming parallel to road)
        openGate() {
            if (this.gateOpen || this.gateAnimating) return;
            
            this.gateAnimating = true;
            
            // Left door rotates 90 degrees counterclockwise to become vertical (parallel to upward road)
            // Pivots on left edge, swings outward to the left
            this.tweens.add({
                targets: this.gateLeftDoor,
                angle: -90,
                duration: CONFIG.GATE.OPEN_DURATION,
                ease: 'Cubic.easeOut'
            });
            
            // Right door rotates 90 degrees clockwise to become vertical (parallel to upward road)
            // Pivots on right edge, swings outward to the right
            this.tweens.add({
                targets: this.gateRightDoor,
                angle: 90,
                duration: CONFIG.GATE.OPEN_DURATION,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.gateOpen = true;
                    this.gateAnimating = false;
                }
            });
        }
        
        // Close the gate (doors swing back, becoming perpendicular to road)
        closeGate() {
            if (!this.gateOpen || this.gateAnimating) return;
            
            this.gateAnimating = true;
            
            // Both doors rotate back to 0 degrees (horizontal, perpendicular to upward road)
            this.tweens.add({
                targets: this.gateLeftDoor,
                angle: 0,
                duration: CONFIG.GATE.OPEN_DURATION,
                ease: 'Cubic.easeIn'
            });
            
            this.tweens.add({
                targets: this.gateRightDoor,
                angle: 0,
                duration: CONFIG.GATE.OPEN_DURATION,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    this.gateOpen = false;
                    this.gateAnimating = false;
                }
            });
        }
        
        // Update gate state based on vehicle proximity
        updateGate() {
            if (!this.gateLeftDoor || !this.gateRightDoor) return;
            
            const vehicleNearby = this.isVehicleNearGate();
            
            if (vehicleNearby && !this.gateOpen) {
                this.openGate();
            } else if (!vehicleNearby && this.gateOpen) {
                this.closeGate();
            }
        }
        
        // Check if any vehicle is near the pizza counter (similar to gate checking)
        checkVehiclesNearPizzaCounter() {
            if (!CONFIG.PIZZA_DELIVERY.ENABLED) return;
            if (!this.pizzaCounterPosition) return;
            
            const counterX = this.pizzaCounterPosition.x;
            const counterY = this.pizzaCounterPosition.y;
            const detectionRange = CONFIG.PIZZA_DELIVERY.COUNTER_DETECTION_RANGE;
            
            for (let car of this.cars) {
                // Only check cars that are moving out and need pizza
                if (!car.isMovingOut || !car.goingToCounter) continue;
                
                // Skip if already stopped at counter
                if (car.stoppedAtCounter) continue;
                
                // Check if vehicle needs a full lap first
                if (car.needsFullLap && !car.hasCompletedLap) {
                    // Don't stop yet - vehicle needs to complete full lap
                    continue;
                }
                
                // Calculate distance to counter
                const dx = car.sprite.x - counterX;
                const dy = car.sprite.y - counterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if vehicle is within detection range
                if (distance < detectionRange) {
                    // Safety check: if another car is already collecting, something went wrong
                    if (this.currentPizzaCollector && this.currentPizzaCollector !== car) {
                        const collectorNum = this.cars.indexOf(this.currentPizzaCollector) + 1;
                        const thisCarNum = this.cars.indexOf(car) + 1;
                        console.error(`[EXIT-QUEUE] ⚠️ ERROR: Vehicle ${thisCarNum} reached counter while Vehicle ${collectorNum} is still collecting! Resetting Vehicle ${thisCarNum}.`);
                        
                        // Reset this car's states and re-queue it
                        car.isMovingOut = false;
                        car.goingToCounter = false;
                        car.stoppedAtCounter = false;
                        car.needsPizza = false;
                        car.waitingToExit = true;
                        
                        if (car.roadTween) {
                            car.roadTween.stop();
                            car.roadTween = null;
                        }
                        
                        this.exitQueue.push(car);
                        console.log(`[EXIT-QUEUE] 🚫 RE-QUEUED Vehicle ${thisCarNum} due to collision (queue length: ${this.exitQueue.length})`);
                        continue;
                    }
                    
                    // Mark as stopped at counter
                    car.stoppedAtCounter = true;
                    
                    // This car should be the current collector (no other car should be here)
                    // Set as current collector
                    this.currentPizzaCollector = car;
                    
                    // Stop the vehicle's current tween if it has one
                    if (car.roadTween) {
                        car.roadTween.stop();
                        car.roadTween = null;
                    }
                    
                    // Start pizza collection
                    if (CONFIG.PIZZA_DELIVERY.STAY_ON_ROAD) {
                        // Use road path data if available
                        if (car.roadPathData) {
                            this.collectPizzaOnRoad(car, car.roadPathData.spacedPoints, car.roadPathData.currentIndex || 0);
                        } else {
                            // Fallback: just animate pizza to vehicle
                            this.collectPizzaForCar(car);
                        }
                    } else {
                        // Route car off road to counter
                        if (car.roadPathData) {
                            this.routeCarFromRoadToCounter(car, car.roadPathData.spacedPoints, car.roadPathData.currentIndex || 0);
                        } else {
                            // Fallback: move car to counter
                            this.moveCarToCounter(car);
                        }
                    }
                }
            }
        }
        
        // Update pizza counter checking (called every frame, similar to updateGate)
        updatePizzaCounter() {
            if (!CONFIG.PIZZA_DELIVERY.ENABLED) return;
            this.checkVehiclesNearPizzaCounter();
        }
        
        // Draw charging connections using Manhattan routing with rounded corners
        drawChargingConnections() {
            if (!this.chargingConnectionsGraphics) return;
            
            // Clear previous frame's lines
            this.chargingConnectionsGraphics.clear();
            
            // Hide all plug heads initially (will be shown for active connections)
            for (let i = 0; i < this.chargingPlugHeads.length; i++) {
                if (this.chargingPlugHeads[i]) {
                    this.chargingPlugHeads[i].setVisible(false);
                }
            }
            
            // Draw connection for each active charging slot
            for (let i = 0; i < this.chargingSlots.length; i++) {
                const slot = this.chargingSlots[i];
                if (!slot || !slot.assignedCar) continue;
                
                const car = slot.assignedCar;
                if (!car.sprite || car.isMovingOut) continue;
                
                const slotUI = this.chargingSlotsUI[i];
                
                // Determine best connection point: choose nearest point on vehicle rectangle
                // Strategy: Pure merit-based - calculate Manhattan distance and choose shortest path
                const carBounds = car.sprite.getBounds();
                const chargerCenterY = slotUI.chargerY;
                const chargerRightX = slotUI.chargerX + slotUI.chargerSize / 2;
                
                // Get slot-specific horizontal offset distance (different for each slot to avoid overlap)
                const slotDistance = CONFIG.CHARGING_CONNECTION.SLOT_DISTANCES[i] || 30;
                
                // Apply X offset to compensate for transparent space in charger image
                const startOffsetX = CONFIG.CHARGING_CONNECTION.START_OFFSET_X || 0;
                
                // Point A: Starting point at charger (right edge + offset, centered vertically)
                const pointA = { x: chargerRightX + startOffsetX, y: chargerCenterY };
                
                // Point A2: First turn point - fixed distance from charger (avoids turning at road)
                const pointA2 = { x: chargerRightX + startOffsetX + slotDistance, y: chargerCenterY };
                
                // Vehicle candidate connection points
                // Apply offsets to both points BEFORE distance calculation to accommodate plug
                const plugXOffset = CONFIG.CHARGING_CONNECTION.PLUG_X_OFFSET || 0;
                const plugYOffset = CONFIG.CHARGING_CONNECTION.PLUG_Y_OFFSET || 0;
                const leftPoint = { x: carBounds.left - plugXOffset, y: carBounds.centerY };      // Left midpoint - X offset (move left)
                const bottomPoint = { x: carBounds.centerX, y: carBounds.bottom + plugYOffset };  // Bottom midpoint + Y offset (move down)
                
                // Calculate Manhattan distance from first turn point (A2) to each vehicle point
                const distToLeft = Math.abs(leftPoint.x - pointA2.x) + Math.abs(leftPoint.y - pointA2.y);
                const distToBottom = Math.abs(bottomPoint.x - pointA2.x) + Math.abs(bottomPoint.y - pointA2.y);
                
                // Choose connection based purely on shortest Manhattan distance (no priority to left)
                const useLeftConnection = distToLeft < distToBottom;
                
                // Point B: Connection point on car (chosen based on distance)
                const pointB = useLeftConnection ? leftPoint : bottomPoint;
                
                // For bottom connections, pointB already includes PLUG_Y_OFFSET
                // No additional adjustment needed since offset was applied before distance calculation
                const adjustedPointB = pointB;
                
                // Calculate pulse effect (flash on charge)
                let lineAlpha = CONFIG.CHARGING_CONNECTION.LINE_ALPHA;
                let plugAlpha = CONFIG.CHARGING_CONNECTION.LINE_ALPHA;
                
                if (CONFIG.CHARGING_CONNECTION.PULSE_ENABLED) {
                    const timeSinceCharge = this.time.now - this.chargingPulseTimestamps[i];
                    if (timeSinceCharge < CONFIG.CHARGING_CONNECTION.PULSE_DURATION) {
                        // Calculate pulse progress (0 to 1)
                        const pulseProgress = timeSinceCharge / CONFIG.CHARGING_CONNECTION.PULSE_DURATION;
                        // Fade from bright to normal using ease out
                        const pulseFactor = 1 - Math.pow(pulseProgress, 2);
                        lineAlpha = CONFIG.CHARGING_CONNECTION.LINE_ALPHA + 
                            (CONFIG.CHARGING_CONNECTION.PULSE_ALPHA_MAX - CONFIG.CHARGING_CONNECTION.LINE_ALPHA) * pulseFactor;
                        plugAlpha = lineAlpha;
                        
                        // Pulse only battery and text (not the EV charger sprite)
                        const scaleFactor = 1 + CONFIG.CHARGING_CONNECTION.PULSE_BATTERY_SCALE * pulseFactor;
                        
                        // Scale the battery sprite (using scaled size based on drop zone)
                        if (slotUI.batterySprite && slotUI.batterySprite.active) {
                            const dropZoneScale = CONFIG.EV_CHARGER.DROP_ZONE_SIZE / CONFIG.CELL.SIZE;
                            const baseBatterySize = CONFIG.CELL.BATTERY_DISPLAY_SIZE * dropZoneScale;
                            slotUI.batterySprite.setDisplaySize(baseBatterySize * scaleFactor, baseBatterySize * scaleFactor);
                        }
                        
                        // Scale the battery level text (using scaled size based on drop zone)
                        if (slotUI.batteryLevelText && slotUI.batteryLevelText.active) {
                            const dropZoneScale = CONFIG.EV_CHARGER.DROP_ZONE_SIZE / CONFIG.CELL.SIZE;
                            slotUI.batteryLevelText.setScale(dropZoneScale * scaleFactor);
                        }
                    } else {
                        // Reset battery and text size to normal when pulse is complete
                        if (slotUI.batterySprite && slotUI.batterySprite.active) {
                            // Reset to scaled size (not full size, but drop zone size)
                            const dropZoneScale = CONFIG.EV_CHARGER.DROP_ZONE_SIZE / CONFIG.CELL.SIZE;
                            const baseBatterySize = CONFIG.CELL.BATTERY_DISPLAY_SIZE * dropZoneScale;
                            slotUI.batterySprite.setDisplaySize(baseBatterySize, baseBatterySize);
                        }
                        if (slotUI.batteryLevelText && slotUI.batteryLevelText.active) {
                            // Reset to scaled size (not scale 1, but drop zone scale)
                            const dropZoneScale = CONFIG.EV_CHARGER.DROP_ZONE_SIZE / CONFIG.CELL.SIZE;
                            slotUI.batteryLevelText.setScale(dropZoneScale);
                        }
                    }
                }
                
                // Set line style from config with pulsing alpha
                this.chargingConnectionsGraphics.lineStyle(
                    CONFIG.CHARGING_CONNECTION.LINE_WIDTH, 
                    hexColor(CONFIG.CHARGING_CONNECTION.LINE_COLOR), 
                    lineAlpha
                );
                
                // Get animation progress for this slot (0 to 1)
                // If animation is disabled or progress not set, show full line
                let progress = this.chargingAnimationProgress[i];
                if (progress === undefined || progress === null) {
                    progress = CONFIG.CHARGING_CONNECTION.ANIMATE_ENABLED ? 0 : 1;
                }
                if (!CONFIG.CHARGING_CONNECTION.ANIMATE_ENABLED) {
                    progress = 1; // Always show full line if animation is disabled
                }
                
                // Clamp progress between 0 and 1
                progress = Math.max(0, Math.min(1, progress));
                
                this.chargingConnectionsGraphics.beginPath();
                this.chargingConnectionsGraphics.moveTo(pointA.x, pointA.y);
                
                // Segment 0: Always draw fixed horizontal segment from charger first (avoids turning at road)
                // This segment uses slot-specific distance to prevent overlap between the 3 chargers
                
                if (useLeftConnection) {
                    // Route to LEFT side of vehicle
                    // Path: charger → horizontal stem → vertical → horizontal → vehicle left
                    
                    const stem = slotDistance; // Fixed horizontal segment
                    const vertDist = Math.abs(adjustedPointB.y - pointA2.y);
                    const horizDist = adjustedPointB.x - pointA2.x; // Keep direction (negative if going left)
                    const totalDist = stem + vertDist + Math.abs(horizDist);
                    
                    const dist1 = stem;
                    const dist2 = dist1 + vertDist;
                    const currentDist = totalDist * progress;
                    
                    // Segment 1: Horizontal stem from charger
                    if (currentDist <= dist1) {
                        const segProgress = currentDist / stem;
                        const currentX = pointA.x + (stem * segProgress);
                        this.chargingConnectionsGraphics.lineTo(currentX, pointA.y);
                    }
                    // Segment 2: Vertical to vehicle height
                    else if (currentDist <= dist2) {
                        this.chargingConnectionsGraphics.lineTo(pointA2.x, pointA2.y);
                        const segProgress = (currentDist - dist1) / vertDist;
                        const goingDown = adjustedPointB.y > pointA2.y;
                        if (goingDown) {
                            const currentY = pointA2.y + (vertDist * segProgress);
                            this.chargingConnectionsGraphics.lineTo(pointA2.x, currentY);
                        } else {
                            const currentY = pointA2.y - (vertDist * segProgress);
                            this.chargingConnectionsGraphics.lineTo(pointA2.x, currentY);
                        }
                    }
                    // Segment 3: Horizontal to vehicle left (preserve direction)
                    else {
                        this.chargingConnectionsGraphics.lineTo(pointA2.x, pointA2.y);
                        this.chargingConnectionsGraphics.lineTo(pointA2.x, adjustedPointB.y);
                        const segProgress = (currentDist - dist2) / Math.abs(horizDist);
                        const currentX = pointA2.x + (horizDist * segProgress); // horizDist preserves direction
                        this.chargingConnectionsGraphics.lineTo(currentX, adjustedPointB.y);
                    }
                } else {
                    // Route to BOTTOM of vehicle
                    // Path: charger → horizontal stem → continue horizontal to vehicle X → vertical down to vehicle bottom
                    
                    const stem = slotDistance; // Fixed horizontal segment
                    const horizDist = adjustedPointB.x - pointA2.x; // Keep direction (negative if going left)
                    const vertDist = adjustedPointB.y - pointA2.y; // Keep direction
                    const totalDist = stem + Math.abs(horizDist) + Math.abs(vertDist);
                    
                    const dist1 = stem;
                    const dist2 = dist1 + Math.abs(horizDist);
                    const currentDist = totalDist * progress;
                    
                    // Segment 1: Horizontal stem from charger
                    if (currentDist <= dist1) {
                        const segProgress = currentDist / stem;
                        const currentX = pointA.x + (stem * segProgress);
                        this.chargingConnectionsGraphics.lineTo(currentX, pointA.y);
                    }
                    // Segment 2: Continue horizontal to vehicle X position (preserve direction)
                    else if (currentDist <= dist2) {
                        this.chargingConnectionsGraphics.lineTo(pointA2.x, pointA2.y);
                        const segProgress = (currentDist - dist1) / Math.abs(horizDist);
                        const currentX = pointA2.x + (horizDist * segProgress); // horizDist preserves direction
                        this.chargingConnectionsGraphics.lineTo(currentX, pointA2.y);
                    }
                    // Segment 3: Vertical to vehicle bottom (preserve direction)
                    else {
                        this.chargingConnectionsGraphics.lineTo(pointA2.x, pointA2.y);
                        this.chargingConnectionsGraphics.lineTo(adjustedPointB.x, pointA2.y);
                        const segProgress = (currentDist - dist2) / Math.abs(vertDist);
                        const currentY = pointA2.y + (vertDist * segProgress); // vertDist preserves direction
                        this.chargingConnectionsGraphics.lineTo(adjustedPointB.x, currentY);
                    }
                }
                
                // Stroke the path
                this.chargingConnectionsGraphics.strokePath();
                
                // Position and show plug head sprite at end of line
                // Rotate plug based on connection type and final line segment direction
                const plugHead = this.chargingPlugHeads[i];
                if (plugHead && progress >= 1) {
                    if (useLeftConnection) {
                        // Connects to LEFT side of car - plug points RIGHT
                        // Keep origin at (0.5, 1) - the base/connection point in original image
                        // When rotated, this automatically aligns correctly
                        plugHead.setOrigin(0.5, 1); // Bottom center origin (base of plug in original image)
                        plugHead.setAngle(90); // Rotate 90° clockwise to point right
                        plugHead.x = adjustedPointB.x; // Left side of car
                        plugHead.y = adjustedPointB.y;
                    } else {
                        // Final segment is VERTICAL (connects to BOTTOM of car)
                        // Plug points UP (normal orientation)
                        plugHead.setOrigin(0.5, 1); // Bottom center origin (base of plug)
                        plugHead.setAngle(0); // Point up (no rotation)
                        plugHead.x = adjustedPointB.x;
                        plugHead.y = adjustedPointB.y; // Bottom at line end
                    }
                    plugHead.setTint(hexColor(CONFIG.CHARGING_CONNECTION.LINE_COLOR));
                    plugHead.setAlpha(plugAlpha);
                    plugHead.setVisible(true);
                } else if (plugHead) {
                    plugHead.setVisible(false);
                }
            }
        }
        
        // Create curved road path (same as in editor)
        createRoadPath(centerX, centerY, halfW, halfH, offset) {
            const path = new Phaser.Curves.Path();
            
            // Road center line position
            const left = centerX - halfW - offset;
            const right = centerX + halfW + offset;
            const top = centerY - halfH - offset;
            const bottom = centerY + halfH + offset;
            
            // Corner radius should match the road offset to maintain consistent shape (same as editor)
            const radius = offset;
            
            // Create rounded rectangle path - moving clockwise from top-left
            // Start at top-left corner (after the curve)
            path.moveTo(left + radius, top);
            
            // TOP EDGE - straight line to top-right corner
            path.lineTo(right - radius, top);
            
            // TOP-RIGHT CORNER - arc curve (90 degrees clockwise)
            const topRightCurve = new Phaser.Curves.Ellipse(
                right - radius, top + radius, // center
                radius, radius, // x radius, y radius
                270, 360, // start angle, end angle (in degrees)
                false, 0 // clockwise, rotation
            );
            path.add(topRightCurve);
            
            // RIGHT EDGE - straight line to bottom-right corner
            path.lineTo(right, bottom - radius);
            
            // BOTTOM-RIGHT CORNER - arc curve (90 degrees clockwise)
            const bottomRightCurve = new Phaser.Curves.Ellipse(
                right - radius, bottom - radius, // center
                radius, radius,
                0, 90,
                false, 0
            );
            path.add(bottomRightCurve);
            
            // BOTTOM EDGE - straight line to bottom-left corner
            path.lineTo(left + radius, bottom);
            
            // BOTTOM-LEFT CORNER - arc curve (90 degrees clockwise)
            const bottomLeftCurve = new Phaser.Curves.Ellipse(
                left + radius, bottom - radius, // center
                radius, radius,
                90, 180,
                false, 0
            );
            path.add(bottomLeftCurve);
            
            // LEFT EDGE - straight line going UP past the top corner and off-screen
            // Calculate exit distance to ensure car fully exits beyond screen top
            // Exit should go well beyond the top of the screen (at y=0)
            const cellSize = this.gridConfig.cellSize;
            const exitExtraDistance = cellSize * 8; // Extra distance beyond screen edge for smooth exit
            const exitY = Math.min(top + radius, 0) - exitExtraDistance; // Ensure it goes above screen top (y=0)
            
            path.lineTo(left, exitY);
            
            // No top-left corner - the path ends with an exit going upward
            
            return path;
        }
        
        // Draw parking lines dynamically (white lines, 2 cells long, 1 cell gap)
        // Like comb teeth - perpendicular to the selected sides
        // If sides are top/bottom (horizontal), lines are vertical
        // If sides are left/right (vertical), lines are horizontal
        drawParkingLines(centerX, centerY, parkingWidth, parkingHeight, cellSize, cols, rows) {
            this.parkingLinesGraphics = this.add.graphics();
            this.parkingLinesGraphics.setDepth(5); // Above parking floor
            
            // Line properties
            const lineColor = 0xFFFFFF; // White
            const lineWidth = Math.max(4, cellSize * 0.08); // Proportional to cell size
            const lineLength = cellSize * 2; // 2 cells long (perpendicular to side)
            
            // T-cap properties (perpendicular line at far end)
            const tCapPercent = CONFIG.GRID.PARKING_LINE_T_CAP_PERCENT || 0.05;
            const tCapLength = lineLength * tCapPercent; // Total length of T-cap (5% of line length by default)
            
            // Randomly choose which sides: 0 = top/bottom sides (lines are vertical), 1 = left/right sides (lines are horizontal)
            const orientation = Math.random() < 0.5 ? 0 : 1;
            
            // Calculate parking area bounds
            const left = centerX - parkingWidth / 2;
            const right = centerX + parkingWidth / 2;
            const top = centerY - parkingHeight / 2;
            const bottom = centerY + parkingHeight / 2;
            
            if (orientation === 0) {
                // TOP and BOTTOM sides (horizontal) - draw VERTICAL lines like comb teeth
                // Lines are spaced 1 cell apart horizontally, extending 2 cells vertically
                
                for (let col = 0; col < cols; col += 2) { // Every other column (1 cell gap)
                    const lineX = left + (col * cellSize) + (cellSize / 2); // Center of the cell
                    
                    // Top side - vertical line going DOWN 2 cells
                    const topStartY = top;
                    const topEndY = top + lineLength;
                    
                    // Draw white line
                    this.parkingLinesGraphics.lineStyle(lineWidth, lineColor, 1);
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(lineX, topStartY);
                    this.parkingLinesGraphics.lineTo(lineX, topEndY);
                    this.parkingLinesGraphics.strokePath();
                    
                    // Draw T-cap at far end (horizontal line at topEndY)
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(lineX - tCapLength / 2, topEndY);
                    this.parkingLinesGraphics.lineTo(lineX + tCapLength / 2, topEndY);
                    this.parkingLinesGraphics.strokePath();
                    
                    // Bottom side - vertical line going UP 2 cells
                    const bottomStartY = bottom;
                    const bottomEndY = bottom - lineLength;
                    
                    // Draw white line
                    this.parkingLinesGraphics.lineStyle(lineWidth, lineColor, 1);
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(lineX, bottomStartY);
                    this.parkingLinesGraphics.lineTo(lineX, bottomEndY);
                    this.parkingLinesGraphics.strokePath();
                    
                    // Draw T-cap at far end (horizontal line at bottomEndY)
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(lineX - tCapLength / 2, bottomEndY);
                    this.parkingLinesGraphics.lineTo(lineX + tCapLength / 2, bottomEndY);
                    this.parkingLinesGraphics.strokePath();
                }
            } else {
                // LEFT and RIGHT sides (vertical) - draw HORIZONTAL lines like comb teeth
                // Lines are spaced 1 cell apart vertically, extending 2 cells horizontally
                
                for (let row = 0; row < rows; row += 2) { // Every other row (1 cell gap)
                    const lineY = top + (row * cellSize) + (cellSize / 2); // Center of the cell
                    
                    // Left side - horizontal line going RIGHT 2 cells
                    const leftStartX = left;
                    const leftEndX = left + lineLength;
                    
                    // Draw white line
                    this.parkingLinesGraphics.lineStyle(lineWidth, lineColor, 1);
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(leftStartX, lineY);
                    this.parkingLinesGraphics.lineTo(leftEndX, lineY);
                    this.parkingLinesGraphics.strokePath();
                    
                    // Draw T-cap at far end (vertical line at leftEndX)
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(leftEndX, lineY - tCapLength / 2);
                    this.parkingLinesGraphics.lineTo(leftEndX, lineY + tCapLength / 2);
                    this.parkingLinesGraphics.strokePath();
                    
                    // Right side - horizontal line going LEFT 2 cells
                    const rightStartX = right;
                    const rightEndX = right - lineLength;
                    
                    // Draw white line
                    this.parkingLinesGraphics.lineStyle(lineWidth, lineColor, 1);
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(rightStartX, lineY);
                    this.parkingLinesGraphics.lineTo(rightEndX, lineY);
                    this.parkingLinesGraphics.strokePath();
                    
                    // Draw T-cap at far end (vertical line at rightEndX)
                    this.parkingLinesGraphics.beginPath();
                    this.parkingLinesGraphics.moveTo(rightEndX, lineY - tCapLength / 2);
                    this.parkingLinesGraphics.lineTo(rightEndX, lineY + tCapLength / 2);
                    this.parkingLinesGraphics.strokePath();
                }
            }
        }

        // Draw road markings (yellow edge lines and white dashed center line)
        drawRoadMarkings(roadWidth, numPoints) {
            this.roadMarkingsGraphics = this.add.graphics();
            this.roadMarkingsGraphics.setDepth(7); // Above road but below cars
            
            // Yellow edge line properties
            const edgeLineWidth = Math.max(2, roadWidth * 0.04); // Scale with road width
            const edgeInset = roadWidth * 0.08; // Slight inset from road edge
            const yellowColor = 0xFFD700; // Gold/yellow color
            
            // White center line properties
            const centerLineWidth = Math.max(2, roadWidth * 0.03);
            const dashLength = roadWidth * 0.3;
            const gapLength = roadWidth * 0.2;
            
            // Use more points for smoother curves (3x the road rope density)
            const markingPoints = numPoints * 3;
            
            // Sample points along the path for drawing markings
            const points = [];
            const rawPoints = [];
            for (let i = 0; i <= markingPoints; i++) {
                const t = i / markingPoints;
                const point = this.roadPath.getPoint(t);
                rawPoints.push(point);
            }
            
            // Calculate normals from consecutive points
            for (let i = 0; i < rawPoints.length; i++) {
                const point = rawPoints[i];
                let tangent;
                
                if (i < rawPoints.length - 1) {
                    // Calculate tangent from current to next point
                    const nextPoint = rawPoints[i + 1];
                    tangent = new Phaser.Math.Vector2(
                        nextPoint.x - point.x,
                        nextPoint.y - point.y
                    ).normalize();
                } else {
                    // For last point, use tangent from previous to current
                    const prevPoint = rawPoints[i - 1];
                    tangent = new Phaser.Math.Vector2(
                        point.x - prevPoint.x,
                        point.y - prevPoint.y
                    ).normalize();
                }
                
                // Calculate perpendicular vector (normal to the path)
                const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x);
                
                points.push({ point, normal });
            }
            
            // Draw outer yellow edge line
            this.roadMarkingsGraphics.lineStyle(edgeLineWidth, yellowColor, 1);
            const outerOffset = roadWidth / 2 - edgeInset;
            this.roadMarkingsGraphics.beginPath();
            for (let i = 0; i < points.length; i++) {
                const { point, normal } = points[i];
                const outerPoint = new Phaser.Math.Vector2(
                    point.x + normal.x * outerOffset,
                    point.y + normal.y * outerOffset
                );
                if (i === 0) {
                    this.roadMarkingsGraphics.moveTo(outerPoint.x, outerPoint.y);
                } else {
                    this.roadMarkingsGraphics.lineTo(outerPoint.x, outerPoint.y);
                }
            }
            this.roadMarkingsGraphics.strokePath();
            
            // Draw inner yellow edge line
            this.roadMarkingsGraphics.lineStyle(edgeLineWidth, yellowColor, 1);
            const innerOffset = -roadWidth / 2 + edgeInset;
            this.roadMarkingsGraphics.beginPath();
            for (let i = 0; i < points.length; i++) {
                const { point, normal } = points[i];
                const innerPoint = new Phaser.Math.Vector2(
                    point.x + normal.x * innerOffset,
                    point.y + normal.y * innerOffset
                );
                if (i === 0) {
                    this.roadMarkingsGraphics.moveTo(innerPoint.x, innerPoint.y);
                } else {
                    this.roadMarkingsGraphics.lineTo(innerPoint.x, innerPoint.y);
                }
            }
            this.roadMarkingsGraphics.strokePath();
            
            // Draw dashed white center line
            this.roadMarkingsGraphics.lineStyle(centerLineWidth, 0xFFFFFF, 1);
            let dashProgress = 0;
            let isDash = true;
            let lastPoint = null;
            
            for (let i = 0; i < points.length; i++) {
                const { point } = points[i];
                
                if (lastPoint) {
                    const segmentLength = Phaser.Math.Distance.Between(
                        lastPoint.x, lastPoint.y, point.x, point.y
                    );
                    dashProgress += segmentLength;
                    
                    const currentPhaseLength = isDash ? dashLength : gapLength;
                    
                    if (dashProgress >= currentPhaseLength) {
                        isDash = !isDash;
                        dashProgress = 0;
                    }
                }
                
                if (isDash) {
                    if (!lastPoint || !isDash) {
                        this.roadMarkingsGraphics.beginPath();
                        this.roadMarkingsGraphics.moveTo(point.x, point.y);
                    } else {
                        this.roadMarkingsGraphics.lineTo(point.x, point.y);
                    }
                    if (i === points.length - 1 || dashProgress >= dashLength) {
                        this.roadMarkingsGraphics.strokePath();
                    }
                }
                
                lastPoint = point;
            }
        }

        getOccupiedCellsForGame(anchorRow, anchorCol, orientation, width, length) {
            const cells = [];
            
            switch(orientation) {
                case 'up':
                    for (let i = 0; i < length; i++) {
                        for (let j = 0; j < width; j++) {
                            cells.push({ row: anchorRow - i, col: anchorCol + j });
                        }
                    }
                    break;
                case 'down':
                    for (let i = 0; i < length; i++) {
                        for (let j = 0; j < width; j++) {
                            cells.push({ row: anchorRow + i, col: anchorCol + j });
                        }
                    }
                    break;
                case 'left':
                    for (let i = 0; i < length; i++) {
                        for (let j = 0; j < width; j++) {
                            cells.push({ row: anchorRow + j, col: anchorCol - i });
                        }
                    }
                    break;
                case 'right':
                    for (let i = 0; i < length; i++) {
                        for (let j = 0; j < width; j++) {
                            cells.push({ row: anchorRow + j, col: anchorCol + i });
                        }
                    }
                    break;
            }
            
            return cells;
        }

        spawnCar(carData) {
            // Calculate pixel position from grid coordinates
            const cellSize = this.gridConfig.cellSize;
            
            // Get vehicle dimensions and orientation
            let width, length, orientation;
            
            // New system: orientation-based
            if (carData.orientation) {
                width = carData.width;
                length = carData.length;
                orientation = carData.orientation;
            } 
            // Backward compatibility: isHorizontal-based
            else if (carData.isHorizontal !== undefined) {
                width = carData.width || 1;
                length = carData.height || 2;
                orientation = carData.isHorizontal ? 'right' : 'up';
            }
            // Fallback: lookup in CONFIG.VEHICLES or parse from type name
            else {
                // Try to find in CONFIG.VEHICLES first
                const vehicleConfig = CONFIG.VEHICLES.find(v => v.key === carData.type);
                if (vehicleConfig) {
                    width = vehicleConfig.width;
                    length = vehicleConfig.length;
                } else {
                    // Parse from type name as last resort
                    const match = carData.type.match(/_(\d+)x(\d+)$/);
                    if (match) {
                        width = parseInt(match[1]);
                        length = parseInt(match[2]);
                    } else {
                        width = 1;
                        length = 2;
                    }
                }
                orientation = 'up';
            }
            
            // Calculate occupied cells based on anchor and orientation
            const cells = this.getOccupiedCellsForGame(carData.gridRow, carData.gridCol, orientation, width, length);
            
            // Calculate center position as average of occupied cells
            let sumRow = 0, sumCol = 0;
            for (let cell of cells) {
                sumRow += cell.row;
                sumCol += cell.col;
            }
            const centerRow = sumRow / cells.length;
            const centerCol = sumCol / cells.length;
            
            // Convert to pixel position
            const carX = this.parkingLeft + centerCol * cellSize + cellSize / 2;
            const carY = this.parkingTop + centerRow * cellSize + cellSize / 2;
            
            // Get rotation angle
            const angles = { 'up': 0, 'right': 90, 'down': 180, 'left': 270 };
            const carAngle = angles[orientation] || 0;
            
            const carSprite = this.add.sprite(carX, carY, carData.type);
            carSprite.setOrigin(0.5);
            carSprite.setAngle(carAngle);
            
            // Calculate sprite scale to fit in grid cells
            // For a car_1x2 (width=1, length=2), it should fit in 64x128 pixels
            const targetWidth = width * cellSize;   // e.g., 1 * 64 = 64px
            const targetHeight = length * cellSize; // e.g., 2 * 64 = 128px
            const scaleX = targetWidth / carSprite.width;
            const scaleY = targetHeight / carSprite.height;
            const scale = Math.min(scaleX, scaleY); // Use the smaller scale to fit both dimensions
            carSprite.setScale(scale);
            
            carSprite.setDepth(10);
            
            // Create tire track graphics (below car sprite but above road)
            const tireTrackGraphics = this.add.graphics();
            tireTrackGraphics.setDepth(7); // Above road, below car sprite
            
            // Create vehicle shadow (rounded rectangle shadow that matches car shape)
            let shadowGraphics = null;
            if (CONFIG.VEHICLE_SHADOW.ENABLED) {
                shadowGraphics = this.add.graphics();
                shadowGraphics.setDepth(CONFIG.VEHICLE_SHADOW.DEPTH);
                
                // Calculate shadow size based on car dimensions (match car shape)
                const shadowWidth = targetWidth * CONFIG.VEHICLE_SHADOW.SCALE_X;
                const shadowHeight = targetHeight * CONFIG.VEHICLE_SHADOW.SCALE_Y;
                
                // Create blur effect by drawing multiple rounded rectangles with increasing size and decreasing alpha
                const blurLayers = Math.floor(CONFIG.VEHICLE_SHADOW.BLUR / 2); // Number of blur layers
                const totalLayers = blurLayers + 1;
                
                // Normalize alpha so total darkness stays constant regardless of blur amount
                // Use exponential falloff for natural-looking blur
                for (let i = blurLayers; i >= 0; i--) {
                    const expansion = i * 2; // Each layer expands by 2 pixels
                    const distanceFromCenter = i / Math.max(blurLayers, 1); // 0 (center) to 1 (edge)
                    
                    // Exponential falloff: center is full alpha, edges fade to near-zero
                    // Normalize by dividing by totalLayers to maintain consistent darkness
                    const falloff = Math.exp(-distanceFromCenter * 3); // e^(-3x) gives smooth falloff
                    const layerAlpha = (CONFIG.VEHICLE_SHADOW.ALPHA * falloff) / Math.sqrt(totalLayers);
                    
                    const layerRadius = CONFIG.VEHICLE_SHADOW.CORNER_RADIUS + (i * 0.5); // Corner radius grows slightly with blur
                    shadowGraphics.fillStyle(hexColor(CONFIG.VEHICLE_SHADOW.COLOR), layerAlpha);
                    shadowGraphics.fillRoundedRect(
                        -(shadowWidth + expansion) / 2, 
                        -(shadowHeight + expansion) / 2, 
                        shadowWidth + expansion, 
                        shadowHeight + expansion,
                        layerRadius
                    );
                }
                
                // Position shadow with offset (sun from SE: shadow to NW)
                shadowGraphics.x = carX + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                shadowGraphics.y = carY + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                
                // Match car rotation so shadow aligns with car shape
                shadowGraphics.rotation = carSprite.rotation;
            }
            
            // Car object with charging state AND grid position
            const car = {
                sprite: carSprite,
                type: carData.type,
                chargeRequired: carData.chargeRequired || 100,
                currentCharge: 0,
                displayedCharge: 0,  // Smoothly animates towards currentCharge
                canMove: false,
                isCharging: false,
                isMovingOut: false,
                waitingToExit: false,
                waitingForAnimationComplete: false,  // Waiting for charge animation after final pulse
                // Grid position data
                gridRow: carData.gridRow,
                gridCol: carData.gridCol,
                orientation: orientation,
                width: width,
                length: length,
                occupiedCells: cells,
                // Tire track data
                tireTrackGraphics: tireTrackGraphics,
                leftTrackPoints: [],
                rightTrackPoints: [],
                // Shadow graphics
                shadow: shadowGraphics
            };
            
            this.cars.push(car);
            
            // Mark grid cells as occupied
            for (let cell of cells) {
                if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                    cell.col >= 0 && cell.col < this.gridConfig.cols) {
                    this.gridOccupancy[cell.row][cell.col] = car;
                }
            }
            
            // Create charge bar above car
            this.createCarChargeBar(car);
            
            return car;
        }

        createCarChargeBar(car) {
            // Calculate position based on vehicle orientation and dimensions
            const cellSize = this.gridConfig.cellSize;
            
            if (CONFIG.PARKING_CAR.CHARGE_DISPLAY_MODE === 'value') {
                // Calculate offset to place text above the vehicle sprite
                // We need to account for the rotated sprite dimensions
                let offsetX = 0;
                let offsetY = 0;
                
                const padding = CONFIG.PARKING_CAR.CHARGE_VALUE_PADDING;
                
                // Calculate the visual height of the vehicle based on orientation
                // When 'up' or 'down', the visual height is length * cellSize
                // When 'left' or 'right', the visual height is width * cellSize (because it's rotated)
                let visualHeight;
                if (car.orientation === 'up' || car.orientation === 'down') {
                    visualHeight = car.length * cellSize;
                } else { // 'left' or 'right'
                    visualHeight = car.width * cellSize;
                }
                
                // Text always goes above the vehicle (top of screen = negative Y)
                offsetY = -(visualHeight / 2 + padding);
                
                // Battery icon mode (horizontal battery with fill and text)
                const batteryWidth = CONFIG.PARKING_CAR.BATTERY_ICON_WIDTH;
                const batteryHeight = CONFIG.PARKING_CAR.BATTERY_ICON_HEIGHT;
                const batteryX = car.sprite.x + offsetX;
                const batteryY = car.sprite.y + offsetY;
                
                // Create battery container group
                const batteryContainer = this.add.container(batteryX, batteryY);
                batteryContainer.setDepth(15);
                
                // Battery body background (white)
                const batteryBody = this.add.graphics();
                batteryBody.fillStyle(hexColor(CONFIG.PARKING_CAR.BATTERY_EMPTY_COLOR), 1);
                batteryBody.fillRoundedRect(
                    -batteryWidth / 2,
                    -batteryHeight / 2,
                    batteryWidth,
                    batteryHeight,
                    CONFIG.PARKING_CAR.BATTERY_CORNER_RADIUS
                );
                
                // Battery border (use charger color if assigned, otherwise default)
                const borderColor = car.chargerColor || CONFIG.PARKING_CAR.BATTERY_BORDER_COLOR;
                batteryBody.lineStyle(CONFIG.PARKING_CAR.BATTERY_BORDER_WIDTH, hexColor(borderColor), 1);
                batteryBody.strokeRoundedRect(
                    -batteryWidth / 2,
                    -batteryHeight / 2,
                    batteryWidth,
                    batteryHeight,
                    CONFIG.PARKING_CAR.BATTERY_CORNER_RADIUS
                );
                
                // Battery cap/terminal (on right side, use same color as border)
                batteryBody.fillStyle(hexColor(borderColor), 1);
                batteryBody.fillRoundedRect(
                    batteryWidth / 2,
                    -CONFIG.PARKING_CAR.BATTERY_CAP_HEIGHT / 2,
                    CONFIG.PARKING_CAR.BATTERY_CAP_WIDTH,
                    CONFIG.PARKING_CAR.BATTERY_CAP_HEIGHT,
                    2
                );
                
                batteryContainer.add(batteryBody);
                
                // Battery fill (green, grows from left to right)
                const batteryFill = this.add.graphics();
                batteryFill.setPosition(0, 0);
                batteryContainer.add(batteryFill);
                
                // Charge text (inside battery)
                const remainingCharge = car.chargeRequired - car.currentCharge;
                const chargeText = this.add.text(
                    0,
                    0,
                    `${Math.round(remainingCharge)}`,
                    {
                        fontSize: CONFIG.PARKING_CAR.CHARGE_VALUE_SIZE,
                        fontFamily: CONFIG.FONT_FAMILY,
                        color: CONFIG.PARKING_CAR.CHARGE_VALUE_COLOR,
                        fontStyle: 'bold'
                    }
                );
                chargeText.setOrigin(0.5, 0.5);
                batteryContainer.add(chargeText);
                
                batteryContainer.setVisible(false); // Hidden by default
                
                // Create analog meter above the battery icon (as part of container)
                let analogMeter = null;
                let analogNeedle = null;
                if (CONFIG.PARKING_CAR.ANALOG_METER_ENABLED && CONFIG.PARKING_CAR.ANALOG_METER_SHOW) {
                    const meterConfig = CONFIG.PARKING_CAR;
                    const meterOffsetY = meterConfig.ANALOG_METER_OFFSET_Y; // Relative to battery
                    const radius = meterConfig.ANALOG_METER_RADIUS;
                    
                    // Create meter graphics (will be added to container)
                    analogMeter = this.add.graphics();
                    
                    // Use charger color for meter arc if assigned, otherwise default
                    const meterColor = car.chargerColor || meterConfig.ANALOG_METER_ARC_COLOR;
                    
                    // Draw semi-circle arc at TOP (above the horizontal line)
                    analogMeter.lineStyle(meterConfig.ANALOG_METER_ARC_WIDTH, hexColor(meterColor), 1);
                    analogMeter.beginPath();
                    analogMeter.arc(0, meterOffsetY, radius, -Math.PI, 0, false); // From left (-PI) to right (0), going upward
                    analogMeter.strokePath();
                    
                    // Draw straight line at bottom to close the semicircle
                    analogMeter.lineStyle(meterConfig.ANALOG_METER_ARC_WIDTH, hexColor(meterColor), 1);
                    analogMeter.beginPath();
                    analogMeter.moveTo(-radius, meterOffsetY);
                    analogMeter.lineTo(radius, meterOffsetY);
                    analogMeter.strokePath();
                    
                    // Draw scale markers at specific angles (45°, 90°, 135°)
                    const markerAngles = [45, 90, 135];
                    for (let deg of markerAngles) {
                        // Map angle to radians (0° = -PI at left, 180° = 0 at right)
                        const angle = -Math.PI + (deg * Math.PI / 180);
                        const markerLength = meterConfig.ANALOG_METER_MARKER_LENGTH;
                        const startX = Math.cos(angle) * (radius - markerLength);
                        const startY = meterOffsetY + Math.sin(angle) * (radius - markerLength);
                        const endX = Math.cos(angle) * radius;
                        const endY = meterOffsetY + Math.sin(angle) * radius;
                        
                        analogMeter.lineStyle(meterConfig.ANALOG_METER_MARKER_WIDTH, hexColor(meterColor), 1);
                        analogMeter.beginPath();
                        analogMeter.moveTo(startX, startY);
                        analogMeter.lineTo(endX, endY);
                        analogMeter.strokePath();
                    }
                    
                    // Add meter to battery container
                    batteryContainer.add(analogMeter);
                    
                    // Create needle (separate graphics for rotation)
                    analogNeedle = this.add.graphics();
                    analogNeedle.setPosition(0, meterOffsetY);
                    
                    // Draw tapered needle (thick at center, thin at tip)
                    const needleLength = meterConfig.ANALOG_METER_NEEDLE_LENGTH;
                    const needleBaseWidth = 8; // Width at the base (center)
                    const needleTipWidth = 2;  // Width at the tip
                    
                    // Use charger color for needle if assigned, otherwise default
                    analogNeedle.fillStyle(hexColor(meterColor), 1);
                    analogNeedle.beginPath();
                    // Draw trapezoid pointing up (wide at center, narrow at tip)
                    analogNeedle.moveTo(-needleBaseWidth/2, 0); // Left base at center
                    analogNeedle.lineTo(needleBaseWidth/2, 0);  // Right base at center
                    analogNeedle.lineTo(needleTipWidth/2, -needleLength);  // Right tip at far end
                    analogNeedle.lineTo(-needleTipWidth/2, -needleLength); // Left tip at far end
                    analogNeedle.closePath();
                    analogNeedle.fillPath();
                    
                    // Draw center dot (use same color)
                    analogNeedle.fillStyle(hexColor(meterColor), 1);
                    analogNeedle.fillCircle(0, 0, 5);
                    
                    // Initialize needle at 5 degrees (slightly right from left edge of top arc)
                    analogNeedle.setRotation(-Math.PI/2 + (5 * Math.PI / 180)); // Start at 5 degrees
                    
                    // Add needle to battery container
                    batteryContainer.add(analogNeedle);
                }
                
                // Store references
                car.batteryContainer = batteryContainer;
                car.batteryFill = batteryFill;
                car.chargeText = chargeText;
                car.chargeBar = null;
                car.chargeBarBg = null;
                car.analogMeter = analogMeter;
                car.analogNeedle = analogNeedle;
                car.needleCurrentAngle = 5; // Current needle angle (5-160)
                car.needleTargetAngle = 5;  // Target needle angle based on charge
                car.needleVelocity = 0;     // Velocity for overshoot animation
            } else {
                // Progress bar mode - use simple offset
                const barWidth = 60;
                const barHeight = 8;
                
                // Calculate visual height based on orientation
                let visualHeight;
                if (car.orientation === 'up' || car.orientation === 'down') {
                    visualHeight = car.length * cellSize;
                } else {
                    visualHeight = car.width * cellSize;
                }
                const offsetY = -(visualHeight / 2 + CONFIG.PARKING_CAR.CHARGE_VALUE_PADDING);
                
                // Background bar
                const barBg = this.add.rectangle(
                    car.sprite.x,
                    car.sprite.y + offsetY,
                    barWidth,
                    barHeight,
                    0x888888
                );
                barBg.setOrigin(0, 0.5);
                barBg.setDepth(15);
                barBg.setVisible(false); // Hidden by default
                
                // Charge bar (green)
                const chargeBar = this.add.rectangle(
                    car.sprite.x,
                    car.sprite.y + offsetY,
                    0,
                    barHeight,
                    0x4CAF50
                );
                chargeBar.setOrigin(0, 0.5);
                chargeBar.setDepth(16);
                chargeBar.setVisible(false); // Hidden by default
                
                // Store references
                car.chargeBarBg = barBg;
                car.chargeBar = chargeBar;
                car.chargeText = null;
            }
        }

        updateCarChargeBar(car) {
            if (CONFIG.PARKING_CAR.CHARGE_DISPLAY_MODE === 'value') {
                // Update battery icon fill and text
                if (!car.chargeText || !car.batteryFill) return;
                
                // Use displayedCharge for smooth animation
                const displayCharge = car.displayedCharge !== undefined ? car.displayedCharge : car.currentCharge;
                
                // Calculate charge value based on config
                const chargeValue = CONFIG.PARKING_CAR.SHOW_REMAINING_CHARGE
                    ? Math.max(0, car.chargeRequired - displayCharge)  // Remaining: 100→0
                    : Math.min(displayCharge, car.chargeRequired);  // Charged: 0→100
                car.chargeText.setText(`${Math.round(chargeValue)}`);
                
                // Update battery fill (green bar grows from left to right)
                const progress = Math.min(displayCharge / car.chargeRequired, 1);
                const batteryWidth = CONFIG.PARKING_CAR.BATTERY_ICON_WIDTH;
                const batteryHeight = CONFIG.PARKING_CAR.BATTERY_ICON_HEIGHT;
                const fillWidth = (batteryWidth - CONFIG.PARKING_CAR.BATTERY_BORDER_WIDTH * 2) * progress;
                
                // Determine fill color based on progress
                let fillColor;
                if (CONFIG.PARKING_CAR.BATTERY_USE_GRADIENT) {
                    // Gradient: red (low) -> yellow (mid) -> green (high)
                    if (progress < 0.33) {
                        // 0-33%: Red to Yellow
                        fillColor = this.interpolateColor(
                            hexColor(CONFIG.PARKING_CAR.BATTERY_GRADIENT_LOW_COLOR),
                            hexColor(CONFIG.PARKING_CAR.BATTERY_GRADIENT_MID_COLOR),
                            progress / 0.33
                        );
                    } else if (progress < 0.66) {
                        // 33-66%: Yellow to Green
                        fillColor = this.interpolateColor(
                            hexColor(CONFIG.PARKING_CAR.BATTERY_GRADIENT_MID_COLOR),
                            hexColor(CONFIG.PARKING_CAR.BATTERY_GRADIENT_HIGH_COLOR),
                            (progress - 0.33) / 0.33
                        );
                    } else {
                        // 66-100%: Green
                        fillColor = hexColor(CONFIG.PARKING_CAR.BATTERY_GRADIENT_HIGH_COLOR);
                    }
                } else {
                    // Use solid color
                    fillColor = hexColor(CONFIG.PARKING_CAR.BATTERY_FILL_COLOR);
                }
                
                // Redraw the fill
                car.batteryFill.clear();
                if (fillWidth > 0) {
                    car.batteryFill.fillStyle(fillColor, 1);
                    car.batteryFill.fillRoundedRect(
                        -batteryWidth / 2 + CONFIG.PARKING_CAR.BATTERY_BORDER_WIDTH,
                        -batteryHeight / 2 + CONFIG.PARKING_CAR.BATTERY_BORDER_WIDTH,
                        fillWidth,
                        batteryHeight - CONFIG.PARKING_CAR.BATTERY_BORDER_WIDTH * 2,
                        Math.max(0, CONFIG.PARKING_CAR.BATTERY_CORNER_RADIUS - CONFIG.PARKING_CAR.BATTERY_BORDER_WIDTH)
                    );
                }
                
                // Update analog meter needle target angle
                if (car.analogNeedle && CONFIG.PARKING_CAR.ANALOG_METER_ENABLED && CONFIG.PARKING_CAR.ANALOG_METER_SHOW) {
                    const maxAngle = CONFIG.PARKING_CAR.ANALOG_METER_MAX_ANGLE;
                    const minAngle = 5; // Minimum angle (5 degrees from left)
                    car.needleTargetAngle = minAngle + (progress * (maxAngle - minAngle));
                }
            } else {
                // Update progress bar
                if (!car.chargeBar) return;
                const barWidth = 60;
                const progress = Math.min(car.currentCharge / car.chargeRequired, 1);
                car.chargeBar.width = barWidth * progress;
            }
        }

        updateLevelChargeDisplay() {
            // Charge display removed - no longer showing parking area charge
        }

        // Create pizzas at the counter (one for each vehicle in the level)
        createPizzasAtCounter() {
            // Clear any existing pizzas
            this.pizzas.forEach(pizza => pizza.destroy());
            this.pizzas = [];
            
            const numVehicles = this.cars.length;
            if (numVehicles === 0) return;
            
            const pizzaBaseSize = CONFIG.PIZZA_DELIVERY.PIZZA_SIZE;
            const pizzaScale = CONFIG.PIZZA_DELIVERY.PIZZA_SCALE || 1.0;
            const pizzaSize = pizzaBaseSize * pizzaScale; // Actual display size
            
            // Get shop_counter zone from GRASS.SPECIAL_ZONES
            const shopCounterZone = CONFIG.GRASS.SPECIAL_ZONES.find(zone => zone.tag === 'shop_counter');
            
            // Grid layout configuration
            const columns = CONFIG.PIZZA_DELIVERY.GRID_COLUMNS || 3;
            const rowGapPercent = CONFIG.PIZZA_DELIVERY.ROW_GAP_PERCENTAGE || 20;
            const columnGapPercent = CONFIG.PIZZA_DELIVERY.COLUMN_GAP_PERCENTAGE || 20;
            
            // Calculate spacing based on percentages
            const horizontalSpacing = pizzaSize * (rowGapPercent / 100); // Gap between items in same row
            const verticalSpacing = pizzaSize * (columnGapPercent / 100); // Gap between rows
            
            // Calculate grid dimensions
            const numRows = Math.ceil(numVehicles / columns);
            
            // Calculate bottom-left corner of shop_counter zone
            const zoneBottomLeftX = shopCounterZone.centerX - shopCounterZone.width / 2;
            const zoneBottomLeftY = shopCounterZone.centerY + shopCounterZone.height / 2;
            
            // Position first pizza (bottom row, left column) so its bottom-left corner
            // aligns with bottom-left corner of shop_counter zone
            // Pizza center = bottom-left corner + (pizzaSize/2, -pizzaSize/2)
            // Note: Y is negative because we go UP from bottom edge
            const firstPizzaCenterX = zoneBottomLeftX + pizzaSize / 2;
            const firstPizzaCenterY = zoneBottomLeftY - pizzaSize / 2;
            
            // Starting position for bottom-left pizza in grid
            const startX = firstPizzaCenterX;
            const startY = firstPizzaCenterY;
            
            // Create pizzas in 3-column overlapping grid
            // Grid builds upward and rightward from the first pizza position
            for (let i = 0; i < numVehicles; i++) {
                const col = i % columns; // Column index (0 to columns-1)
                const row = Math.floor(i / columns); // Row index
                
                // Position calculation:
                // - Columns (left to right): items stack with overlap, leftmost fully visible
                // - Rows (bottom to top): each row positioned with vertical spacing upward
                const x = startX + col * horizontalSpacing;
                const y = startY - row * verticalSpacing; // Negative because we stack upward
                
                // Depth calculation:
                // - Within a row: leftmost has highest depth (fully visible)
                // - Between rows: lower rows (higher indices) have higher depth (in front)
                // Formula: depth = (numRows - row) * columns + (columns - col)
                // This ensures: row 0 items are behind row 1, and within each row, left items are in front
                // Keep depth below 99 so pizzas are behind tutorial mask (mask is at depth 99)
                const depth = (numRows - row) * columns + (columns - col) + 10;
                
                const pizza = this.add.image(x, y, 'pizza')
                    .setDisplaySize(pizzaSize, pizzaSize)
                    .setDepth(depth);
                
                this.pizzas.push(pizza);
            }
        }

        // Process the next vehicle in the exit queue (called after previous vehicle finishes collecting pizza)
        processNextInPizzaQueue() {
            // Just call the exit queue processor
            this.processNextInExitQueue();
        }
        
        // Process next vehicle waiting in exit queue (after charging completes)
        processNextInExitQueue(attemptsThisFrame = 0) {
            // Check if there are vehicles waiting to exit
            if (this.exitQueue.length === 0) {
                return;
            }
            
            // Prevent infinite recursion if all vehicles are blocked
            // Stop after trying as many vehicles as were initially in queue
            if (attemptsThisFrame >= this.exitQueue.length) {
                return;
            }
            
            // Check if pizza delivery is enabled
            if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                // Don't call next car if current collector is still collecting
                if (this.currentPizzaCollector) {
                    const collectorNum = this.cars.indexOf(this.currentPizzaCollector) + 1;
                    console.log(`[EXIT-QUEUE] Cannot call next car - Vehicle ${collectorNum} is collecting pizza`);
                    return;
                }
                
                // Don't call next car if any car is heading to counter (not yet arrived)
                const carHeadingToCounter = this.cars.find(c => 
                    c.isMovingOut && 
                    c.goingToCounter && 
                    !c.stoppedAtCounter
                );
                
                if (carHeadingToCounter) {
                    const headingNum = this.cars.indexOf(carHeadingToCounter) + 1;
                    console.log(`[EXIT-QUEUE] Cannot call next car - Vehicle ${headingNum} is heading to counter`);
                    return;
                }
            }
            
            // Get the next vehicle from the exit queue
            const car = this.exitQueue.shift();
            
            const vNum = this.cars.indexOf(car) + 1;
            console.log(`[EXIT-QUEUE] ✅ CALLING Vehicle ${vNum} from queue (remaining in queue: ${this.exitQueue.length}, attempt ${attemptsThisFrame + 1})`);
            
            // LOG: Level 2 tracking
            if (this.currentLevelIndex === 1) {
                console.log(`[V2TRACK] [Frame ${this.game.loop.frame}] 🚗 CALLED from exit queue: Vehicle ${vNum} (attempt ${attemptsThisFrame + 1})`);
            }
            
            this.moveOutCar(car, attemptsThisFrame);
        }

        // Move car from parking lot to counter position
        moveCarToCounter(car) {
            // First, we need to get the car out of the parking area
            // CRITICAL: For pizza collection, vehicle MUST exit upward (through top) to enter road loop
            // Otherwise, vehicles near left edge will exit left and miss pizza counter entirely
            const upwardDirection = { row: -1, col: 0 };
            const upwardSteps = this.calculateStepsToExitInDirection(car, upwardDirection);
            
            let exitPath;
            if (upwardSteps > 0) {
                // Force upward exit for pizza collection
                exitPath = {
                    direction: upwardDirection,
                    steps: upwardSteps,
                    name: 'up'
                };
            } else {
                // If upward is blocked, fall back to any available exit
                exitPath = this.findBestExitPath(car);
            }
            
            if (!exitPath) {
                // Car is blocked - wait and retry
                console.warn('Car blocked when trying to go to counter');
                car.waitingToExit = true;
                car.isMovingOut = false;
                car.isCharging = false;
                
                // CRITICAL: Reset pizza delivery states so car doesn't continue to counter when unblocked
                if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                    car.goingToCounter = false;
                    car.stoppedAtCounter = false;
                    car.needsPizza = false;
                    car.needsFullLap = false;
                    car.hasCompletedLap = false;
                    
                    // Re-add to exit queue
                    this.exitQueue.push(car);
                    const vNum = this.cars.indexOf(car) + 1;
                    console.log(`[EXIT-QUEUE] 🚫 RE-QUEUED Blocked Vehicle ${vNum} (blocked at moveCarToCounter, queue length: ${this.exitQueue.length})`);
                    
                    // Try next vehicle in queue
                    this.processNextInExitQueue();
                }
                
                return;
            }
            
            // Determine exit direction type for animation purposes
            const forwardDir = this.getForwardDirection(car.orientation);
            const reverseDir = this.getReverseDirection(car.orientation);
            const exitDirection = (exitPath.direction.row === forwardDir.row && exitPath.direction.col === forwardDir.col) 
                ? 'forward' 
                : (exitPath.direction.row === reverseDir.row && exitPath.direction.col === reverseDir.col)
                ? 'reverse'
                : 'forward'; // For perpendicular movement, treat as forward
            
            const stepsToExit = exitPath.steps;
            
            // Calculate if this vehicle will miss the counter based on exit position
            // Counter is at top-right area (< 45 degrees from top center)
            // We need to check where the vehicle will join the road relative to counter
            const counterX = this.pizzaCounterPosition.x;
            const counterY = this.pizzaCounterPosition.y;
            
            // Get the vehicle's current position
            const carX = car.sprite.x;
            const carY = car.sprite.y;
            
            // Calculate the angle from parking center to counter (0 = top, 90 = right, clockwise)
            const parkingCenterX = this.parkingLeft + (this.gridConfig.cols * this.gridConfig.cellSize) / 2;
            const parkingCenterY = this.parkingTop + (this.gridConfig.rows * this.gridConfig.cellSize) / 2;
            
            const angleToCounter = Math.atan2(
                counterX - parkingCenterX,
                -(counterY - parkingCenterY)
            ) * 180 / Math.PI;
            
            const angleToVehicle = Math.atan2(
                carX - parkingCenterX,
                -(carY - parkingCenterY)
            ) * 180 / Math.PI;
            
            // Normalize angles to 0-360
            const normalizedCounterAngle = (angleToCounter + 360) % 360;
            const normalizedVehicleAngle = (angleToVehicle + 360) % 360;
            
            // If vehicle is exiting AFTER the counter in clockwise direction, it needs a full lap
            // Check if vehicle angle is greater than counter angle (accounting for wrap-around)
            let needsFullLap = false;
            if (normalizedVehicleAngle > normalizedCounterAngle + CONFIG.PIZZA_DELIVERY.REQUIRE_FULL_LAP_AFTER_ANGLE) {
                needsFullLap = true;
            }
            
            // Mark that this car needs to go to counter after exiting
            car.goingToCounter = true;
            car.needsFullLap = needsFullLap;
            car.hasCompletedLap = false; // Track if vehicle has done the full lap
            
            // Store the actual movement direction for use in moveCarToExitAndTransition
            car.exitMovementDirection = exitPath.direction;
            
            // Use the normal exit transition, but we'll intercept it
            this.moveCarToExitAndTransition(car, stepsToExit, exitDirection);
        }

        // Animate pizza collection for a car
        collectPizzaForCar(car) {
            // Check if there are any pizzas left
            if (this.pizzas.length === 0) {
                console.warn('No pizzas left to collect!');
                this.finishPizzaCollection(car);
                return;
            }
            
            // Get the first available pizza
            const pizza = this.pizzas.shift();
            
            // Animate pizza flying to car
            this.tweens.add({
                targets: pizza,
                x: car.sprite.x,
                y: car.sprite.y,
                scaleX: CONFIG.PIZZA_DELIVERY.PIZZA_SCALE_FINAL,
                scaleY: CONFIG.PIZZA_DELIVERY.PIZZA_SCALE_FINAL,
                duration: CONFIG.PIZZA_DELIVERY.PIZZA_COLLECT_DURATION,
                ease: 'Power2',
                onComplete: () => {
                    // Pizza collected - destroy it
                    pizza.destroy();
                    
                    // Mark car as having collected pizza
                    car.needsPizza = false;
                    car.hasPizza = true;
                    
                    // Finish collection and route to exit
                    this.finishPizzaCollection(car);
                }
            });
        }

        // Finish pizza collection and route car to exit
        finishPizzaCollection(car) {
            // Clear current collector
            this.currentPizzaCollector = null;
            
            // Now route this car to the parking exit and then to road
            // Since the car is now at the counter (top-right), we need to calculate
            // the best path to the parking exit
            
            // Find best exit path - check ALL 4 directions regardless of vehicle orientation
            const exitPath = this.findBestExitPath(car);
            
            // If no path found, the car needs to make a loop
            // For now, let's just move it to the road directly
            if (!exitPath) {
                // Route car to make a complete turn and come back to counter area
                // Then exit through top
                this.routeCarFromCounterToRoad(car);
            } else {
                // Normal exit
                // Determine exit direction type for animation purposes
                const forwardDir = this.getForwardDirection(car.orientation);
                const reverseDir = this.getReverseDirection(car.orientation);
                const exitDirection = (exitPath.direction.row === forwardDir.row && exitPath.direction.col === forwardDir.col) 
                    ? 'forward' 
                    : (exitPath.direction.row === reverseDir.row && exitPath.direction.col === reverseDir.col)
                    ? 'reverse'
                    : 'forward'; // For perpendicular movement, treat as forward
                
                // Store the actual movement direction for use in moveCarToExitAndTransition
                car.exitMovementDirection = exitPath.direction;
                
                this.moveCarToExitAndTransition(car, exitPath.steps, exitDirection);
            }
        }

        // Route car from counter to road (for vehicles that can't directly exit)
        routeCarFromCounterToRoad(car) {
            // The counter is at top-right
            // We need to route the car: counter -> top of parking area -> road
            // This is the same path that vehicles at the top row would take
            
            // Calculate a path to the top-left corner, then to the road
            // For simplicity, let's move the car to the road entrance point
            
            if (!this.roadPath) {
                console.warn('No road path available');
                this.removeCar(car);
                return;
            }
            
            // Get the starting point of the road (top-left corner)
            const roadStart = this.roadPath.getPoint(0);
            
            // Move car to road start position
            const distance = Phaser.Math.Distance.Between(
                car.sprite.x, car.sprite.y, roadStart.x, roadStart.y
            );
            const duration = (distance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;
            
            const tweenTargets = [car.sprite];
            if (car.chargeBar) tweenTargets.push(car.chargeBar);
            if (car.chargeBarBg) tweenTargets.push(car.chargeBarBg);
            if (car.batteryContainer) tweenTargets.push(car.batteryContainer);
            if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) tweenTargets.push(car.shadow);
            
            this.tweens.add({
                targets: tweenTargets,
                x: roadStart.x,
                y: roadStart.y,
                duration: duration,
                ease: 'Linear',
                onUpdate: () => {
                    // Update car rotation to face movement direction
                    const dx = roadStart.x - car.sprite.x;
                    const dy = roadStart.y - car.sprite.y;
                    if (dx !== 0 || dy !== 0) {
                        car.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                    }
                    
                    // Update shadow
                    if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                        car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                        car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                        car.shadow.rotation = car.sprite.rotation;
                    }
                },
                onComplete: () => {
                    // Now follow the road path
                    this.followRoadPath(car);
                }
            });
        }

        // Route car from road to counter, collect pizza, then continue on road
        routeCarFromRoadToCounter(car, spacedPoints, currentIndex) {
            // Safety check: if spacedPoints is null or undefined, regenerate it
            if (!spacedPoints || !Array.isArray(spacedPoints) || spacedPoints.length === 0) {
                console.warn('spacedPoints is invalid in routeCarFromRoadToCounter, regenerating');
                if (this.roadPath) {
                    spacedPoints = this.roadPath.getSpacedPoints(500);
                    currentIndex = 0;
                } else {
                    console.error('No roadPath available!');
                    this.removeCar(car);
                    return;
                }
            }
            
            const counterX = this.pizzaCounterPosition.x;
            const counterY = this.pizzaCounterPosition.y;
            
            // Calculate approach position (slightly to the left of counter)
            const approachX = counterX - 60;
            const approachY = counterY;
            
            const distance = Phaser.Math.Distance.Between(
                car.sprite.x, car.sprite.y, approachX, approachY
            );
            const duration = (distance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;
            
            const tweenTargets = [car.sprite];
            if (car.chargeBar) tweenTargets.push(car.chargeBar);
            if (car.chargeBarBg) tweenTargets.push(car.chargeBarBg);
            if (car.batteryContainer) tweenTargets.push(car.batteryContainer);
            if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) tweenTargets.push(car.shadow);
            
            // Move to counter
            this.tweens.add({
                targets: tweenTargets,
                x: approachX,
                y: approachY,
                duration: duration,
                ease: 'Linear',
                onUpdate: () => {
                    // Face towards counter (east)
                    car.sprite.rotation = Math.PI / 2;
                    
                    if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                        car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                        car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                        car.shadow.rotation = car.sprite.rotation;
                    }
                },
                onComplete: () => {
                    // Stop briefly, then collect pizza
                    this.time.delayedCall(CONFIG.PIZZA_DELIVERY.COUNTER_STOP_DURATION, () => {
                        this.collectPizzaAtCounter(car, spacedPoints, currentIndex);
                    });
                }
            });
        }

        // Collect pizza at counter and continue on road
        collectPizzaAtCounter(car, spacedPoints, resumeIndex) {
            // Safety check: if spacedPoints is null or undefined, regenerate it
            if (!spacedPoints || !Array.isArray(spacedPoints) || spacedPoints.length === 0) {
                console.warn('spacedPoints is invalid in collectPizzaAtCounter, regenerating');
                if (this.roadPath) {
                    spacedPoints = this.roadPath.getSpacedPoints(500);
                    resumeIndex = 0;
                } else {
                    console.error('No roadPath available!');
                    this.removeCar(car);
                    return;
                }
            }
            
            // Check if there are pizzas available
            if (this.pizzas.length === 0) {
                console.warn('No pizzas available!');
                // Mark collection as complete and continue
                car.needsPizza = false;
                car.hasPizza = false;
                car.goingToCounter = false;
                car.stoppedAtCounter = false;
                this.currentPizzaCollector = null;
                console.log(`[EXIT-QUEUE] No pizza available, calling next from queue (queue length: ${this.exitQueue.length})`);
                this.processNextInExitQueue();
                this.continueOnRoadAfterCounter(car, spacedPoints, resumeIndex);
                return;
            }
            
            // Get first pizza
            const pizza = this.pizzas.shift();
            
            // Store pizza's starting position
            const pizzaStartX = pizza.x;
            const pizzaStartY = pizza.y;
            
            // Animate pizza from counter to car (pizza moves, not car)
            this.tweens.add({
                targets: pizza,
                x: car.sprite.x,
                y: car.sprite.y,
                scaleX: CONFIG.PIZZA_DELIVERY.PIZZA_SCALE_FINAL,
                scaleY: CONFIG.PIZZA_DELIVERY.PIZZA_SCALE_FINAL,
                duration: CONFIG.PIZZA_DELIVERY.PIZZA_COLLECT_DURATION,
                ease: 'Power2',
                onComplete: () => {
                    pizza.destroy();
                    
                    car.needsPizza = false;
                    car.hasPizza = true;
                    car.goingToCounter = false;
                    car.stoppedAtCounter = false;
                    
                    // Clear current collector and call next vehicle from exit queue
                    this.currentPizzaCollector = null;
                    
                    console.log(`[EXIT-QUEUE] Vehicle ${this.cars.indexOf(car) + 1} finished collecting, calling next from queue (queue length: ${this.exitQueue.length})`);
                    this.processNextInExitQueue();
                    
                    // Continue on road
                    this.continueOnRoadAfterCounter(car, spacedPoints, resumeIndex);
                }
            });
        }

        // Collect pizza while vehicle stays on road (new method)
        collectPizzaOnRoad(car, spacedPoints, currentIndex) {
            // Safety check: if spacedPoints is null or undefined, regenerate it
            if (!spacedPoints || !Array.isArray(spacedPoints) || spacedPoints.length === 0) {
                console.warn('spacedPoints is invalid in collectPizzaOnRoad, regenerating');
                if (this.roadPath) {
                    spacedPoints = this.roadPath.getSpacedPoints(500);
                    currentIndex = 0;
                } else {
                    console.error('No roadPath available!');
                    this.removeCar(car);
                    return;
                }
            }
            
            // Check if there are pizzas available
            if (this.pizzas.length === 0) {
                console.warn('🍕 No pizzas available!');
                // Mark collection as complete and continue
                car.needsPizza = false;
                car.hasPizza = false;
                car.goingToCounter = false;
                car.stoppedAtCounter = false;
                this.currentPizzaCollector = null;
                console.log(`[EXIT-QUEUE] No pizza available, calling next from queue (queue length: ${this.exitQueue.length})`);
                this.processNextInExitQueue();
                this.continueOnRoadAfterCounter(car, spacedPoints, currentIndex);
                return;
            }
            
            // Get first pizza
            const pizza = this.pizzas.shift();
            
            // Animate pizza immediately from counter to car's position on road (no delay)
            this.tweens.add({
                    targets: pizza,
                    x: car.sprite.x,
                    y: car.sprite.y,
                    scaleX: CONFIG.PIZZA_DELIVERY.PIZZA_SCALE_FINAL,
                    scaleY: CONFIG.PIZZA_DELIVERY.PIZZA_SCALE_FINAL,
                    duration: CONFIG.PIZZA_DELIVERY.PIZZA_COLLECT_DURATION,
                    ease: 'Power2',
                    onComplete: () => {
                        pizza.destroy();
                        
                        car.needsPizza = false;
                        car.hasPizza = true;
                        car.goingToCounter = false;
                        car.stoppedAtCounter = false;
                        
                        // Spawn coins at pizza counter and animate to coin display
                        this.spawnCoinsAtPizzaCounter(car);
                        
                        // Clear current collector and call next vehicle from exit queue
                        this.currentPizzaCollector = null;
                        
                        console.log(`[EXIT-QUEUE] Vehicle ${this.cars.indexOf(car) + 1} finished collecting, calling next from queue (queue length: ${this.exitQueue.length})`);
                        this.processNextInExitQueue();
                        
                        // Continue on road
                        this.continueOnRoadAfterCounter(car, spacedPoints, currentIndex);
                    }
                });
        }

        // Continue vehicle journey on road after collecting pizza
        continueOnRoadAfterCounter(car, spacedPoints, startIndex) {
            if (!this.roadPath) {
                this.removeCar(car);
                return;
            }
            
            // Safety check: if spacedPoints is null or undefined, regenerate it
            if (!spacedPoints || !Array.isArray(spacedPoints) || spacedPoints.length === 0) {
                console.warn('spacedPoints is invalid, regenerating from roadPath');
                spacedPoints = this.roadPath.getSpacedPoints(500);
                startIndex = 0;
            }
            
            // Use the provided startIndex directly - this is where the vehicle stopped for pizza
            // Don't search for closest point as that can cause vehicles to jump backward
            let continueIndex = startIndex;
            
            // Ensure index is valid
            if (continueIndex < 0) continueIndex = 0;
            if (continueIndex >= spacedPoints.length) continueIndex = spacedPoints.length - 1;
            
            const pathLength = this.roadPath.getLength();
            const remainingPoints = spacedPoints.length - continueIndex;
            const remainingDistance = (remainingPoints / spacedPoints.length) * pathLength;
            const duration = (remainingDistance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;
            
            const roadFollower = { index: continueIndex };
            
            this.tweens.add({
                targets: roadFollower,
                index: spacedPoints.length - 1,
                duration: duration,
                ease: 'Linear',
                onUpdate: () => {
                    const idx = Math.floor(roadFollower.index);
                    const nextIdx = Math.min(idx + 1, spacedPoints.length - 1);
                    const fraction = roadFollower.index - idx;
                    
                    const point1 = spacedPoints[idx];
                    const point2 = spacedPoints[nextIdx];
                    
                    car.sprite.x = point1.x + (point2.x - point1.x) * fraction;
                    car.sprite.y = point1.y + (point2.y - point1.y) * fraction;
                    
                    const dx = point2.x - point1.x;
                    const dy = point2.y - point1.y;
                    if (dx !== 0 || dy !== 0) {
                        car.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                    }
                    
                    if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                        car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                        car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                        car.shadow.rotation = car.sprite.rotation;
                    }
                },
                onComplete: () => {
                    // LOG: Level 2 tracking
                    if (this.currentLevelIndex === 1) {
                        const vNum = this.cars.indexOf(car) + 1;
                        console.log(`[V2TRACK] [Frame ${this.game.loop.frame}] 👋 LEFT COUNTER: Vehicle ${vNum} - calling next vehicle from pizza queue`);
                    }
                    
                    this.removeCar(car);
                }
            });
        }

        // Helper function to interpolate between two hex colors
        interpolateColor(color1, color2, factor) {
            // Extract RGB components from hex colors
            const r1 = (color1 >> 16) & 0xFF;
            const g1 = (color1 >> 8) & 0xFF;
            const b1 = color1 & 0xFF;
            
            const r2 = (color2 >> 16) & 0xFF;
            const g2 = (color2 >> 8) & 0xFF;
            const b2 = color2 & 0xFF;
            
            // Interpolate each component
            const r = Math.round(r1 + (r2 - r1) * factor);
            const g = Math.round(g1 + (g2 - g1) * factor);
            const b = Math.round(b1 + (b2 - b1) * factor);
            
            // Combine back into hex
            return (r << 16) | (g << 8) | b;
        }

        updateMovableCars() {
            // This function is now used to reassign cars to slots after a car moves out
            // Hide charge bars for cars with no charge that aren't being charged
            for (let car of this.cars) {
                // Check if car is assigned to any slot
                let isAssignedToSlot = false;
                for (let i = 0; i < this.chargingSlots.length; i++) {
                    if (this.chargingSlots[i] && this.chargingSlots[i].assignedCar === car) {
                        isAssignedToSlot = true;
                        break;
                    }
                }
                
                // Hide charge display if car has no charge and isn't assigned
                if (!isAssignedToSlot && car.currentCharge === 0 && !car.isCharging) {
                    if (car.chargeBar) car.chargeBar.setVisible(false);
                    if (car.chargeBarBg) car.chargeBarBg.setVisible(false);
                    if (car.batteryContainer) car.batteryContainer.setVisible(false);
                }
            }
            
            // Try to assign cars to any slots that need them
            this.updateChargingSystem();
        }

        startCharging() {
            // Start charging cycle
            this.chargingInterval = this.time.addEvent({
                delay: 1000, // 1 second interval
                callback: this.chargeCycle,
                callbackScope: this,
                loop: true
            });
        }

        chargeCycle() {
            // Each slot charges its assigned car independently
            for (let i = 0; i < this.chargingSlots.length; i++) {
                const slot = this.chargingSlots[i];
                if (!slot || !slot.assignedCar) continue; // Slot empty or no car assigned
                
                const car = slot.assignedCar;
                if (car.isMovingOut) continue; // Skip cars that are leaving
                if (car.waitingForAnimationComplete) continue; // Skip cars waiting for animation
                
                // Check if at least 1 second has passed since car was assigned
                // This ensures player sees battery/meter at 0% before first charge
                const timeSinceAssignment = this.time.now - (slot.assignedAt || 0);
                if (timeSinceAssignment < 1000) {
                    // Update displays even when not charging yet (to show 0%)
                    this.updateCarChargeBar(car);
                    continue; // Skip charging on first pulse (t=0), wait until t=1000ms
                }
                
                // If this is the first time charging this car, spawn reward coins
                if (!car.isCharging && !car.rewardCoinsSpawned) {
                    this.spawnRewardCoins(car);
                }
                
                // Charge the car with this slot's battery charge per minute value
                const chargeAmount = slot.chargePerMinute;
                car.currentCharge += chargeAmount;
                car.isCharging = true;
                
                // Battery/meter is already visible from assignCarToSlot - no need to show again
                
                // Decrease remaining charge for the level
                this.remainingCharge = Math.max(0, this.remainingCharge - chargeAmount);
                
                // Update charge displays
                this.updateCarChargeBar(car);
                this.updateLevelChargeDisplay();
                
                // Show charging effect (bolt animation)
                this.showChargingEffect(car);
                
                // Mark this slot as pulsing (for connection line flash)
                this.chargingPulseTimestamps[i] = this.time.now;
                
                // Check if car is fully charged
                if (car.currentCharge >= car.chargeRequired) {
                    // Mark car as waiting for animation to complete
                    car.waitingForAnimationComplete = true;
                    
                    // KEEP CONNECTION VISIBLE - wait for final visual feedback to show
                    // (battery showing 100%, meter needle reaching max position)
                    // The updateCarChargeBar will show the final 100% state
                    
                    // Wait for battery fill and meter animations to complete (1000ms)
                    // This allows player to see the final charge animation (0% -> 100%)
                    // and needle overshoot/settle at max position
                    this.time.delayedCall(1000, () => {
                        // NOW the connection is complete - disconnect everything together
                        // CONNECTION DISCONNECTION: Remove all connection elements as one unit
                        // (wire + battery progress bar + meter are all parts of the connection)
                        
                        // 1. Hide connection wire
                        this.chargingAnimationProgress[i] = 0;
                        
                        // 2. Hide battery progress bar/icon (part of connection)
                        if (car.batteryContainer) car.batteryContainer.setVisible(false);
                        if (car.chargeBar) car.chargeBar.setVisible(false);
                        if (car.chargeBarBg) car.chargeBarBg.setVisible(false);
                        
                        // 3. Unassign car from slot
                        slot.assignedCar = null;
                        slot.assignedAt = null;
                        
                        // Clear charger color from car
                        car.chargerColor = null;
                        
                        // Make bolt grey (no longer charging)
                        const slotUI = this.chargingSlotsUI[i];
                        if (slotUI && slotUI.boltSprite) {
                            slotUI.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE);
                        }
                        
                        // Set cooldown - slot waits SLOT_SWITCH_DELAY before connecting to next vehicle
                        this.slotCooldownUntil[i] = this.time.now + CONFIG.CHARGING_CONNECTION.SLOT_SWITCH_DELAY;
                        
                        // NOW car can move out (connection is fully disconnected)
                        car.waitingForAnimationComplete = false;
                        
                        // LOG: Level 2 tracking
                        if (this.currentLevelIndex === 1) {
                            const vNum = this.cars.indexOf(car) + 1;
                            console.log(`[V2TRACK] [Frame ${this.game.loop.frame}] ✅ FINISHED CHARGING: Vehicle ${vNum}`);
                        }
                        
                        // When pizza delivery is enabled, use exit queue to ensure vehicles don't overlap
                        if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                            // Always add to queue to prevent race conditions
                            this.exitQueue.push(car);
                            
                            const vNum = this.cars.indexOf(car) + 1;
                            const qLen = this.exitQueue.length;
                            console.log(`[EXIT-QUEUE] ➕ ADDED Vehicle ${vNum} to queue (queue length: ${qLen})`);
                            
                            // LOG: Level 2 tracking
                            if (this.currentLevelIndex === 1) {
                                console.log(`[V2TRACK] [Frame ${this.game.loop.frame}] 🅿️ ADDED to exit queue: Vehicle ${vNum} (queue length: ${qLen})`);
                            }
                            
                            // Try to process the queue immediately
                            this.processNextInExitQueue();
                        } else {
                            // No pizza delivery - proceed directly
                            this.moveOutCar(car);
                        }
                        
                        // Schedule next car assignment after cooldown expires
                        // This ensures the slot connects to the next vehicle exactly after SLOT_SWITCH_DELAY
                        // rather than waiting for the next chargeCycle (which runs every 1000ms)
                        this.time.delayedCall(CONFIG.CHARGING_CONNECTION.SLOT_SWITCH_DELAY, () => {
                            this.assignCarToSlot(i);
                        });
                    });
                }
            }
        }

        spawnRewardCoins(car) {
            // Get vehicle definition for reward
            const vehicleDef = CONFIG.VEHICLES.find(v => v.key === car.type);
            if (!vehicleDef || !vehicleDef.reward) {
                console.warn('❌ No vehicle definition or reward found for:', car.type);
                return;
            }
            
            const coinCount = CONFIG.COIN_REWARD_ANIMATION.COIN_COUNT;
            const stackOffset = CONFIG.COIN_REWARD_ANIMATION.INITIAL_STACK_OFFSET; // 0 for single coin (top-down view)
            
            // Create coins at car position, hidden (will be moved to counter when pizza is collected)
            car.rewardCoins = [];
            for (let i = 0; i < coinCount; i++) {
                const coin = this.add.image(car.sprite.x, car.sprite.y - (i * stackOffset), 'coin');
                coin.setDisplaySize(CONFIG.COIN_REWARD_ANIMATION.REWARD_COIN_SIZE, CONFIG.COIN_REWARD_ANIMATION.REWARD_COIN_SIZE);
                coin.setDepth(car.sprite.depth - 1); // Below car so it's hidden
                coin.setVisible(false); // Hide coins until vehicle collects pizza
                car.rewardCoins.push(coin);
            }
            
            car.rewardCoinsSpawned = true;
            car.coinReward = vehicleDef.reward; // Store reward amount
            car.coinsSpawnedAtGate = false; // Track if coins have been spawned at gate
        }
        
        // Spawn coins at pizza counter when pizza is collected
        spawnCoinsAtPizzaCounter(car) {
            
            if (!car.rewardCoins || car.rewardCoins.length === 0) {
                console.warn('❌ No reward coins to spawn!', car.rewardCoins);
                return;
            }
            
            const stackOffset = CONFIG.COIN_REWARD_ANIMATION.INITIAL_STACK_OFFSET;
            const spawnDelay = CONFIG.COIN_REWARD_ANIMATION.COIN_SPAWN_DELAY || 100;
            
            // Calculate vehicle bottom position (below vehicle, above road)
            const vehicleBottomY = car.sprite.y + (car.sprite.displayHeight / 2) + 10; // 10px below vehicle
            
            // Move coins to vehicle bottom position and make them visible
            for (let i = 0; i < car.rewardCoins.length; i++) {
                const coin = car.rewardCoins[i];
                coin.x = car.sprite.x;
                coin.y = vehicleBottomY - (i * stackOffset);
                coin.setVisible(true);
                coin.setDepth(100 + i); // High depth to be visible above everything
            }
            
            // Wait for spawn delay, then animate coins to coin counter
            this.time.delayedCall(spawnDelay, () => {
                this.animateExistingCoins(car.rewardCoins, car.coinReward);
                car.rewardCoins = []; // Clear reference
            });
        }

        showChargingEffect(car) {
            // Create bolt effect at center of the car
            const bolt = this.add.sprite(car.sprite.x, car.sprite.y, 'bolt');
            bolt.setScale(0.5);
            bolt.setDepth(20);
            bolt.setAlpha(0.8);
            
            // Animate bolt
            this.tweens.add({
                targets: bolt,
                y: car.sprite.y - 20,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    bolt.destroy();
                }
            });
        }

        // ========== GRID-BASED MOVEMENT SYSTEM ==========
        
        // Get direction delta for forward movement based on orientation
        getForwardDirection(orientation) {
            const directions = {
                'up': { row: -1, col: 0 },
                'down': { row: 1, col: 0 },
                'left': { row: 0, col: -1 },
                'right': { row: 0, col: 1 }
            };
            return directions[orientation] || { row: 0, col: 0 };
        }

        // Get direction delta for reverse movement (opposite of forward)
        getReverseDirection(orientation) {
            const directions = {
                'up': { row: 1, col: 0 },
                'down': { row: -1, col: 0 },
                'left': { row: 0, col: 1 },
                'right': { row: 0, col: -1 }
            };
            return directions[orientation] || { row: 0, col: 0 };
        }

        // Find best exit path by checking ALL 4 directions (up, down, left, right)
        // This allows vehicles of any orientation to exit through the top
        findBestExitPath(car) {
            // All possible movement directions
            const directions = [
                { name: 'up', delta: { row: -1, col: 0 } },
                { name: 'down', delta: { row: 1, col: 0 } },
                { name: 'left', delta: { row: 0, col: -1 } },
                { name: 'right', delta: { row: 0, col: 1 } }
            ];
            
            let bestPath = null;
            let shortestSteps = Infinity;
            
            // Try each direction
            for (let dir of directions) {
                const steps = this.calculateStepsToExitInDirection(car, dir.delta);
                if (steps > 0 && steps < shortestSteps) {
                    shortestSteps = steps;
                    bestPath = {
                        direction: dir.delta,
                        steps: steps,
                        name: dir.name
                    };
                }
            }
            
            return bestPath;
        }
        
        // Calculate steps needed to reach TOP boundary in a specific direction
        calculateStepsToExitInDirection(car, direction) {
            let steps = 0;
            
            // Keep checking until we reach TOP boundary or obstacle
            while (steps < 20) {
                steps++;
                const newAnchorRow = car.gridRow + direction.row * steps;
                const newAnchorCol = car.gridCol + direction.col * steps;
                
                // Get cells at this position
                const newCells = this.getOccupiedCellsForGame(
                    newAnchorRow, 
                    newAnchorCol, 
                    car.orientation, 
                    car.width, 
                    car.length
                );
                
                // Check if any cell reaches TOP boundary (row < 0) - THE ONLY VALID EXIT
                let hasTopExitCell = false;
                for (let cell of newCells) {
                    if (cell.row < 0) {
                        hasTopExitCell = true;
                        break;
                    }
                }
                
                if (hasTopExitCell) {
                    // Found top exit - return steps to just before exit
                    return Math.max(1, steps - 1);
                }
                
                // Check if path is blocked by another car or other boundaries
                for (let cell of newCells) {
                    // Hit non-top boundary - blocked
                    if (cell.row >= this.gridConfig.rows || cell.col < 0 || cell.col >= this.gridConfig.cols) {
                        return 0;
                    }
                    
                    // Still in grid - check for car blocking
                    if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                        cell.col >= 0 && cell.col < this.gridConfig.cols) {
                        const occupant = this.gridOccupancy[cell.row][cell.col];
                        if (occupant !== null && occupant !== car) {
                            // Blocked by another car
                            return 0;
                        }
                    }
                }
            }
            
            return 0; // Can't reach top in 20 steps
        }

        // Check if car can move forward by steps in grid
        canMoveForward(car, steps = 1) {
            const direction = this.getForwardDirection(car.orientation);
            
            // Calculate new anchor position
            const newAnchorRow = car.gridRow + direction.row * steps;
            const newAnchorCol = car.gridCol + direction.col * steps;
            
            // Get cells that would be occupied in new position
            const newCells = this.getOccupiedCellsForGame(
                newAnchorRow, 
                newAnchorCol, 
                car.orientation, 
                car.width, 
                car.length
            );
            
            // Check if all new cells are either empty or outside parking area
            for (let cell of newCells) {
                // If outside grid bounds, it's the exit - allow it
                if (cell.row < 0 || cell.row >= this.gridConfig.rows ||
                    cell.col < 0 || cell.col >= this.gridConfig.cols) {
                    continue; // Outside is OK
                }
                
                // If inside grid, check if occupied by another car
                const occupant = this.gridOccupancy[cell.row][cell.col];
                if (occupant !== null && occupant !== car) {
                    return false; // Blocked by another car
                }
            }
            
            return true; // Path is clear
        }

        // Check if car has any cells outside parking area
        isOutsideParkingArea(car) {
            for (let cell of car.occupiedCells) {
                if (cell.row < 0 || cell.row >= this.gridConfig.rows ||
                    cell.col < 0 || cell.col >= this.gridConfig.cols) {
                    return true;
                }
            }
            return false;
        }

        // Update car's grid position (clear old cells, mark new cells)
        updateCarGridPosition(car) {
            // Clear old cells
            for (let cell of car.occupiedCells) {
                if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                    cell.col >= 0 && cell.col < this.gridConfig.cols) {
                    this.gridOccupancy[cell.row][cell.col] = null;
                }
            }
            
            // Calculate new occupied cells
            car.occupiedCells = this.getOccupiedCellsForGame(
                car.gridRow, 
                car.gridCol, 
                car.orientation, 
                car.width, 
                car.length
            );
            
            // Mark new cells as occupied
            for (let cell of car.occupiedCells) {
                if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                    cell.col >= 0 && cell.col < this.gridConfig.cols) {
                    this.gridOccupancy[cell.row][cell.col] = car;
                }
            }
        }

        // Show collision animation and return car to original position
        showCollisionAndReturn(car, onComplete) {
            const direction = this.getForwardDirection(car.orientation);
            const cellSize = this.gridConfig.cellSize;
            const bumpDistance = cellSize * 0.3; // Move 30% of cell size
            
            // Determine which elements to animate based on display mode
            const targets = [car.sprite];
            if (CONFIG.PARKING_CAR.CHARGE_DISPLAY_MODE === 'value') {
                if (car.batteryContainer) targets.push(car.batteryContainer);
            } else {
                if (car.chargeBar) targets.push(car.chargeBar);
                if (car.chargeBarBg) targets.push(car.chargeBarBg);
            }
            
            // Phase 1: Move forward a bit (bump)
            this.tweens.add({
                targets: targets,
                x: `+=${direction.col * bumpDistance}`,
                y: `+=${direction.row * bumpDistance}`,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    // Shake effect removed - was annoying
                    // this.cameras.main.shake(100, 0.005);
                    
                    // Phase 2: Return to original position
                    this.tweens.add({
                        targets: targets,
                        x: `-=${direction.col * bumpDistance}`,
                        y: `-=${direction.row * bumpDistance}`,
                        duration: 200,
                        ease: 'Back.easeOut',
                        onComplete: () => {
                            if (onComplete) onComplete();
                        }
                    });
                }
            });
        }

        // Show brief visual feedback when car is blocked (lighter than collision)
        showBlockedFeedback(car) {
            // Shake effect removed - was annoying
            // this.cameras.main.shake(100, 0.003);
        }

        // Retry movement for cars that are fully charged but blocked
        retryBlockedCars() {
            // Only check every 500ms to avoid performance issues
            if (!this.blockedCarsRetryTimer || this.time.now - this.blockedCarsRetryTimer > 500) {
                this.blockedCarsRetryTimer = this.time.now;
                
                // Find all cars waiting to exit
                const waitingCars = this.cars.filter(car => 
                    car.waitingToExit === true && 
                    car.currentCharge >= car.chargeRequired &&
                    !car.isMovingOut
                );
                
                if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                    // With pizza delivery, cars are managed by the exit queue
                    // Just clear the waitingToExit flag - they're already in the queue
                    // and will be called one at a time
                    if (waitingCars.length > 0) {
                        console.log(`[EXIT-QUEUE] 🔓 ${waitingCars.length} blocked car(s) now unblocked`);
                        for (let car of waitingCars) {
                            car.waitingToExit = false;
                        }
                        
                        // Trigger queue processor to try calling the next car
                        // (only if no one is currently heading to/at counter)
                        this.processNextInExitQueue();
                    }
                } else {
                    // Without pizza delivery, directly move cars (original behavior)
                    for (let car of waitingCars) {
                        car.waitingToExit = false;
                        this.moveOutCar(car);
                    }
                }
            }
        }

        moveOutCar(car, attemptsThisFrame = 0) {
            car.isCharging = false;
            car.isMovingOut = true;
            car.waitingToExit = false;  // Clear waiting flag since car is now moving
            
            // LOG: Level 2 tracking
            if (this.currentLevelIndex === 1) {
                const vNum = this.cars.indexOf(car) + 1;
                console.log(`[V2TRACK] [Frame ${this.game.loop.frame}] 🚀 STARTING EXIT: Vehicle ${vNum}`);
            }
            
            // If pizza delivery is enabled, mark car as needing pizza IMMEDIATELY
            // This ensures the exit queue system knows this vehicle is en route
            if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                car.needsPizza = true;
                car.goingToCounter = true;
                car.stoppedAtCounter = false;
                car.needsFullLap = false;
                car.hasCompletedLap = false;
            }
            
            // Start vehicle sound
            this.startVehicleSound(car);
            
            // IMPORTANT: Free all grid cells immediately when car starts leaving
            // This allows other cars to move into the vacated space right away
            for (let cell of car.occupiedCells) {
                if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                    cell.col >= 0 && cell.col < this.gridConfig.cols) {
                    this.gridOccupancy[cell.row][cell.col] = null;
                }
            }
            // Clear occupied cells so they won't be marked again
            car.occupiedCells = [];
            
            // Update movable cars immediately so next car can start charging
            this.updateMovableCars();
            
            // Note: Battery/meter/connection already hidden when charging completed
            // No need to hide again here
            
            // If vehicle is NOT facing up, rotate it in place to face up
            // Exit is always through the top, so all vehicles must face up to exit
            if (car.orientation !== 'up') {
                this.rotateCarInPlace(car, 'up', () => {
                    // After rotating, move to exit
                    this.continueToExit(car, attemptsThisFrame);
                });
            } else {
                // Already facing up or down, proceed directly to exit
                this.continueToExit(car, attemptsThisFrame);
            }
        }
        
        // Continue to exit after any necessary rotation
        continueToExit(car, attemptsThisFrame = 0) {
            // Car is now always facing up (rotated if needed)
            // Calculate steps to exit by moving forward
            const stepsToExit = this.calculateStepsToExit(car);
            
            if (stepsToExit === 0) {
                // No valid path to top - car is blocked
                this.stopVehicleSound(car);
                car.isMovingOut = false;
                car.isCharging = false;
                car.waitingToExit = true;
                
                // CRITICAL: Reset pizza delivery states so car doesn't continue to counter when unblocked
                // Car will be called fresh from queue when it's its turn again
                if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                    car.goingToCounter = false;
                    car.stoppedAtCounter = false;
                    car.needsPizza = false;
                    car.needsFullLap = false;
                    car.hasCompletedLap = false;
                }
                
                this.updateCarGridPosition(car);
                this.updateMovableCars();
                this.showBlockedFeedback(car);
                
                // Re-add blocked vehicle to END of exit queue so free vehicles can move first
                if (CONFIG.PIZZA_DELIVERY.ENABLED) {
                    this.exitQueue.push(car);
                    
                    const vNum = this.cars.indexOf(car) + 1;
                    const qLen = this.exitQueue.length;
                    console.log(`[EXIT-QUEUE] 🚫 RE-QUEUED Blocked Vehicle ${vNum} (queue length: ${qLen})`);
                    
                    // LOG: Level 2 tracking
                    if (this.currentLevelIndex === 1) {
                        console.log(`[V2TRACK] [Frame ${this.game.loop.frame}] 🚧 BLOCKED & RE-QUEUED: Vehicle ${vNum} (added back to exit queue, queue length: ${qLen})`);
                    }
                    
                    // Try next vehicle in queue (pass incremented attempt counter)
                    this.processNextInExitQueue(attemptsThisFrame + 1);
                }
                
                return;
            }
            
            // Always moving forward since car is facing up
            const exitDirection = 'forward';
            
            // Pizza delivery flags already set in moveOutCar() when it was called
            
            // Move to parking exit, then smoothly transition to road
            this.moveCarToExitAndTransition(car, stepsToExit, exitDirection);
        }
        
        // Rotate car in place to face a specific direction (simple rotation animation)
        rotateCarInPlace(car, targetOrientation, callback) {
            // Calculate target rotation angle
            const orientationAngles = {
                'up': 0,
                'right': Math.PI / 2,
                'down': Math.PI,
                'left': -Math.PI / 2
            };
            
            const targetAngle = orientationAngles[targetOrientation];
            const currentAngle = car.sprite.rotation;
            
            // Calculate shortest rotation direction
            let angleDiff = targetAngle - currentAngle;
            
            // Normalize to -PI to PI range
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            const finalAngle = currentAngle + angleDiff;
            
            // Animate rotation
            this.tweens.add({
                targets: [car.sprite, car.chargeBar, car.chargeBarBg, car.batteryContainer, car.shadow].filter(Boolean),
                rotation: finalAngle,
                duration: 300,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    // Update car orientation
                    car.orientation = targetOrientation;
                    car.sprite.rotation = targetAngle;
                    
                    // Update grid position based on new orientation
                    this.updateCarGridPosition(car);
                    
                    if (callback) callback();
                }
            });
        }
        
        // ========== REMOVED: ARC-BASED TURNING SYSTEM ==========
        // Complex arc pathfinding and turning logic removed.
        // Now using simple in-place rotation (rotateCarInPlace) above.
        
        // Update car's grid position from current pixel coordinates
        updateCarGridPositionFromPixels(car) {
            const cellSize = this.gridConfig.cellSize;
            
            // Calculate grid position from pixel position
            const gridCol = Math.round((car.sprite.x - this.parkingLeft) / cellSize);
            const gridRow = Math.round((car.sprite.y - this.parkingTop) / cellSize);
            
            car.gridRow = gridRow;
            car.gridCol = gridCol;
            
            // Recalculate occupied cells with new orientation
            car.occupiedCells = this.getOccupiedCellsForGame(
                car.gridRow,
                car.gridCol,
                car.orientation,
                car.width,
                car.length
            );
        }

        // Calculate steps needed to reach parking boundary in forward direction
        calculateStepsToExit(car) {
            const direction = this.getForwardDirection(car.orientation);
            let steps = 0;
            
            // Keep checking forward until we reach TOP boundary or obstacle
            while (steps < 20) {
                steps++;
                const newAnchorRow = car.gridRow + direction.row * steps;
                const newAnchorCol = car.gridCol + direction.col * steps;
                
                // Get cells at this position
                const newCells = this.getOccupiedCellsForGame(
                    newAnchorRow, 
                    newAnchorCol, 
                    car.orientation, 
                    car.width, 
                    car.length
                );
                
                // Check if any cell reaches TOP boundary (row < 0) - THE ONLY VALID EXIT
                let hasTopExitCell = false;
                for (let cell of newCells) {
                    if (cell.row < 0) {
                        hasTopExitCell = true;
                        break;
                    }
                }
                
                if (hasTopExitCell) {
                    // Found top exit - return steps to just before exit
                    return Math.max(1, steps - 1);
                }
                
                // Check if path is blocked by another car or other boundaries
                for (let cell of newCells) {
                    // Hit non-top boundary - blocked
                    if (cell.row >= this.gridConfig.rows || cell.col < 0 || cell.col >= this.gridConfig.cols) {
                        return 0;
                    }
                    
                    // Still in grid - check for car blocking
                    if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                        cell.col >= 0 && cell.col < this.gridConfig.cols) {
                        const occupant = this.gridOccupancy[cell.row][cell.col];
                        if (occupant !== null && occupant !== car) {
                            // Blocked by another car
                            return 0;
                        }
                    }
                }
            }
            
            return 0; // Can't reach top in 20 steps
        }

        // Calculate steps needed to reach TOP boundary in reverse direction
        calculateStepsToReverseExit(car) {
            const direction = this.getReverseDirection(car.orientation);
            let steps = 0;
            
            // Keep checking reverse until we reach TOP boundary or obstacle
            while (steps < 20) {
                steps++;
                const newAnchorRow = car.gridRow + direction.row * steps;
                const newAnchorCol = car.gridCol + direction.col * steps;
                
                // Get cells at this position
                const newCells = this.getOccupiedCellsForGame(
                    newAnchorRow, 
                    newAnchorCol, 
                    car.orientation, 
                    car.width, 
                    car.length
                );
                
                // Check if any cell reaches TOP boundary (row < 0) - THE ONLY VALID EXIT
                let hasTopExitCell = false;
                for (let cell of newCells) {
                    if (cell.row < 0) {
                        hasTopExitCell = true;
                        break;
                    }
                }
                
                if (hasTopExitCell) {
                    // Found top exit - return steps to just before exit
                    return Math.max(1, steps - 1);
                }
                
                // Check if path is blocked by another car or other boundaries
                for (let cell of newCells) {
                    // Hit non-top boundary - blocked
                    if (cell.row >= this.gridConfig.rows || cell.col < 0 || cell.col >= this.gridConfig.cols) {
                        return 0;
                    }
                    
                    // Still in grid - check for car blocking
                    if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                        cell.col >= 0 && cell.col < this.gridConfig.cols) {
                        const occupant = this.gridOccupancy[cell.row][cell.col];
                        if (occupant !== null && occupant !== car) {
                            // Blocked by another car
                            return 0;
                        }
                    }
                }
            }
            
            return 0; // Can't reach top in 20 steps
        }

        // Move car to parking exit, then smoothly curve onto road
        moveCarToExitAndTransition(car, steps, exitDirection = 'forward') {
            // Get the appropriate direction
            // If car has an explicit movement direction set (from findBestExitPath), use that
            // Otherwise fall back to forward/reverse based on orientation
            let direction;
            if (car.exitMovementDirection) {
                direction = car.exitMovementDirection;
            } else {
                direction = exitDirection === 'reverse' 
                    ? this.getReverseDirection(car.orientation)
                    : this.getForwardDirection(car.orientation);
            }
            
            const cellSize = this.gridConfig.cellSize;
            
            // Calculate exit position (just at parking boundary)
            const exitDeltaX = direction.col * cellSize * steps;
            const exitDeltaY = direction.row * cellSize * steps;
            const exitX = car.sprite.x + exitDeltaX;
            const exitY = car.sprite.y + exitDeltaY;
            
            // Calculate duration based on constant speed (distance / speed * 1000)
            const distance = steps * cellSize;
            const moveDuration = (distance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;
            
            // Clear tire tracks at start (will only be drawn during bezier curve)
            if (car.leftTrackPoints) car.leftTrackPoints = [];
            if (car.rightTrackPoints) car.rightTrackPoints = [];
            if (car.tireTrackGraphics) car.tireTrackGraphics.clear();
            
            // Track total journey progress (parking -> curve -> road = 0 to 1)
            car.totalJourneyProgress = 0;
            const parkingPhaseWeight = 0.15; // Parking exit is 15% of total journey
            
            // Prepare tween targets (include shadow if it exists)
            const tweenTargets = [car.sprite, car.chargeBar, car.chargeBarBg];
            if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                tweenTargets.push(car.shadow);
            }
            
            // Phase 1: Move to parking exit point
            this.tweens.add({
                targets: tweenTargets,
                x: exitX,
                y: exitY,
                duration: moveDuration,
                ease: 'Linear',
                onUpdate: (tween) => {
                    // Update sound based on parking phase progress (0 to 15%)
                    const parkingProgress = tween.progress;
                    car.totalJourneyProgress = parkingProgress * parkingPhaseWeight;
                    this.updateVehicleSound(car, car.totalJourneyProgress);
                    // No tire tracks during parking exit phase
                    
                    // Update shadow position and rotation manually if shadow exists (to maintain offset and alignment)
                    if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                        car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                        car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                        car.shadow.rotation = car.sprite.rotation;
                    }
                },
                onComplete: () => {
                    // Car has left parking area - no grid cells to update
                    
                    // Clean up temporary movement direction
                    delete car.exitMovementDirection;
                    
                    // Phase 2: Smoothly curve onto road (use appropriate curve function)
                    if (exitDirection === 'reverse') {
                        this.curveOntoRoadReverse(car);
                    } else {
                        this.curveOntoRoad(car);
                    }
                }
            });
        }

        // Smoothly curve from parking exit onto the road with a natural right turn
        curveOntoRoad(car) {
    if (!this.roadPath) {
        // No road path - remove car immediately (coins already animated in moveCarToExitAndTransition)
        this.removeCar(car);
        return;
    }

    const startX = car.sprite.x;
    const startY = car.sprite.y;
    const startRotation = car.sprite.rotation;

    const forwardDirX = Math.sin(startRotation);
    const forwardDirY = -Math.cos(startRotation);

    // Find closest road point in the forward direction
    // ONLY consider points on the top road segment (above parking area)
    let bestT = 0;
    let bestScore = -Infinity;
    let closestValidT = 0;
    let closestValidDist = Infinity;

    for (let t = 0; t <= 1; t += 0.005) {
        const point = this.roadPath.getPoint(t);
        
        // Filter: Only consider points on top road segment
        if (point.y > this.parkingTop) continue;
        
        const toPointX = point.x - startX;
        const toPointY = point.y - startY;
        const dist = Math.sqrt(toPointX * toPointX + toPointY * toPointY);

        // Track closest valid point as fallback
        if (dist < closestValidDist) {
            closestValidDist = dist;
            closestValidT = t;
        }

        if (dist < 20) continue;

        const normX = toPointX / dist;
        const normY = toPointY / dist;

        const forwardAlignment = normX * forwardDirX + normY * forwardDirY;
        if (forwardAlignment < 0.3) continue;

        const score = forwardAlignment / dist;

        if (score > bestScore) {
            bestScore = score;
            bestT = t;
        }
    }
    
    // If no point found with forward alignment, use closest valid point
    if (bestScore === -Infinity) {
        bestT = closestValidT;
    }

    const roadPoint = this.roadPath.getPoint(bestT);
    const roadTangent = this.roadPath.getTangent(bestT);

    // P1 = go straight forward from car until at road level
    const toRoadX = roadPoint.x - startX;
    const toRoadY = roadPoint.y - startY;
    const fwdDist = toRoadX * forwardDirX + toRoadY * forwardDirY;
    const p1x = startX + forwardDirX * fwdDist;
    const p1y = startY + forwardDirY * fwdDist;

    // P2 = road point shifted further along road tangent (rightward / clockwise)
    // const turnRadius = this.gridConfig.cellSize * 1.5;
    // const p2x = roadPoint.x + roadTangent.x * turnRadius;
    // const p2y = roadPoint.y + roadTangent.y * turnRadius;

    // Desired P2 = road point shifted along road tangent for a smooth arc
const turnRadius = this.gridConfig.cellSize * 1.5;
const desiredP2x = roadPoint.x + roadTangent.x * turnRadius;
const desiredP2y = roadPoint.y + roadTangent.y * turnRadius;

// Clamp P2 to the nearest actual point ON the road path
// This handles edge cases (e.g. right-column cars) where the offset overshoots the road
let p2x = roadPoint.x;
let p2y = roadPoint.y;
let nearestDist = Infinity;
for (let t = 0; t <= 1; t += 0.002) {
    const rp = this.roadPath.getPoint(t);
    const dx = rp.x - desiredP2x;
    const dy = rp.y - desiredP2y;
    const d = dx * dx + dy * dy;
    if (d < nearestDist) {
        nearestDist = d;
        p2x = rp.x;
        p2y = rp.y;
    }
}

    const turnCurve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(startX, startY),
        new Phaser.Math.Vector2(p1x, p1y),
        new Phaser.Math.Vector2(p2x, p2y)
    );

    // Debug visualization (only if enabled in config)
    let curveGraphics;
    if (CONFIG.PARKING_CAR.DEBUG_SHOW_CURVE) {
        curveGraphics = this.add.graphics();
        curveGraphics.lineStyle(4, 0xFF0000, 0.8);
        const curvePath = new Phaser.Curves.Path();
        curvePath.add(turnCurve);
        curvePath.draw(curveGraphics);
        curveGraphics.fillStyle(0x00FF00, 1);
        curveGraphics.fillCircle(p1x, p1y, 8);
        curveGraphics.fillStyle(0x0000FF, 1);
        curveGraphics.fillCircle(startX, startY, 8);
        curveGraphics.fillCircle(p2x, p2y, 8);
        curveGraphics.setDepth(1000);
    }

    const curveLength = turnCurve.getLength();
    const turnDuration = (curveLength / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;

    const follower = { t: 0 };
    const curvePhaseWeight = 0.25; // Curve is 25% of total journey (15-40%)
    const parkingPhaseWeight = 0.15; // Already completed

    this.tweens.add({
        targets: follower,
        t: 1.0,
        duration: turnDuration,
        ease: 'Linear',
        onUpdate: (tween) => {
            const point = turnCurve.getPoint(follower.t);
            car.sprite.x = point.x;
            car.sprite.y = point.y;

            const tangent = turnCurve.getTangent(follower.t);
            car.sprite.rotation = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
            
            // Update sound based on curve phase progress (15% to 40%)
            car.totalJourneyProgress = parkingPhaseWeight + (tween.progress * curvePhaseWeight);
            this.updateVehicleSound(car, car.totalJourneyProgress);
            
            // Update tire tracks only during forward curve if enabled in config
            if (CONFIG.TIRE_TRACKS.SHOW_FORWARD_TURN) {
                this.updateTireTracks(car);
            }
            
            // Update shadow position and rotation if shadow exists
            if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                car.shadow.rotation = car.sprite.rotation;
            }
        },
        onComplete: () => {
            if (CONFIG.PARKING_CAR.DEBUG_SHOW_CURVE && curveGraphics) {
                curveGraphics.destroy();
            }
            
            // Fade out tire tracks after forward curve if enabled
            if (CONFIG.TIRE_TRACKS.SHOW_FORWARD_TURN && CONFIG.TIRE_TRACKS.FADE_ENABLED) {
                this.fadeTireTracks(car);
            }

            const pathLength = this.roadPath.getLength();
            const spacedPoints = this.roadPath.getSpacedPoints(500);

            // Find spaced point closest to p2 (where curve ended)
            let startIndex = 0;
            let minD = Infinity;
            for (let i = 0; i < spacedPoints.length; i++) {
                const dx = spacedPoints[i].x - p2x;
                const dy = spacedPoints[i].y - p2y;
                const d = dx * dx + dy * dy;
                if (d < minD) { minD = d; startIndex = i; }
            }

            // Correct needsFullLap based on actual road entry position vs counter position
            if (car.goingToCounter && this.counterPathIndex !== undefined) {
                car.needsFullLap = startIndex > this.counterPathIndex;
            }

            const remainingPoints = spacedPoints.length - startIndex;
            const remainingDistance = (remainingPoints / spacedPoints.length) * pathLength;
            const pathDuration = (remainingDistance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;

            // Coins will be animated when vehicle collects pizza at counter
            // Do NOT animate coins here

            const roadFollower = { index: startIndex };
            const roadPhaseWeight = 0.60; // Road is 60% of total journey (40-100%)

            // Store path data in car for proximity checking
            car.roadPathData = {
                spacedPoints: spacedPoints,
                currentIndex: 0  // Will be updated in onUpdate
            };
            
            // Set flag to indicate vehicle is now on road path (for pizza waypoint check)
            car.onRoadPath = true;

            // Create and store tween reference for stopping/resuming
            car.roadTween = this.tweens.add({
                targets: roadFollower,
                index: spacedPoints.length - 1,
                duration: pathDuration,
                ease: 'Linear',
                onUpdate: (tween) => {
                    const idx = Math.floor(roadFollower.index);
                    const nextIdx = Math.min(idx + 1, spacedPoints.length - 1);
                    const fraction = roadFollower.index - idx;

                    const point1 = spacedPoints[idx];
                    const point2 = spacedPoints[nextIdx];

                    car.sprite.x = point1.x + (point2.x - point1.x) * fraction;
                    car.sprite.y = point1.y + (point2.y - point1.y) * fraction;
                    
                    // Update current path index for proximity checking
                    car.roadPathData.currentIndex = idx;

                    const dx = point2.x - point1.x;
                    const dy = point2.y - point1.y;
                    if (dx !== 0 || dy !== 0) {
                        car.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                    }
                    
                    // Check if car needs to stop at counter (for pizza collection)
                    // ONLY check when vehicle is on road path (not during parking, charging, or Bezier curve)
                    if (car.onRoadPath && car.goingToCounter && !car.stoppedAtCounter) {
                        // Check if vehicle needs a full lap first
                        if (car.needsFullLap && !car.hasCompletedLap) {
                            // Check if vehicle has completed a full lap (near starting point)
                            const pathProgress = idx / spacedPoints.length;
                            if (pathProgress > 0.9) { // 90% through the path
                                car.hasCompletedLap = true;
                            }
                        } else {
                            // Either doesn't need full lap, or has already completed it
                            // Stop when vehicle reaches the pizza counter waypoint
                            const waypointTolerance = 5; // Allow ±5 indices tolerance for waypoint detection
                            const atWaypoint = Math.abs(idx - this.pizzaCounterWaypointIndex) <= waypointTolerance;
                            
                            if (atWaypoint) {
                                car.stoppedAtCounter = true;
                                
                                // Set as current collector (no queue check needed - single queue system ensures only one vehicle at a time)
                                this.currentPizzaCollector = car;
                                
                                // Kill this tween
                                tween.stop();
                                
                                if (CONFIG.PIZZA_DELIVERY.STAY_ON_ROAD) {
                                    // Keep car on road and animate pizza to it
                                    this.collectPizzaOnRoad(car, spacedPoints, idx);
                                } else {
                                    // Original behavior: route car off road to counter
                                    this.routeCarFromRoadToCounter(car, spacedPoints, idx);
                                }
                                return;
                            }
                        }
                    }
                    
                    // Update sound based on road phase progress (40% to 100%)
                    car.totalJourneyProgress = parkingPhaseWeight + curvePhaseWeight + (tween.progress * roadPhaseWeight);
                    this.updateVehicleSound(car, car.totalJourneyProgress);
                    // No tire tracks during road following phase (only during bezier curve)
                    
                    // Update shadow position and rotation if shadow exists
                    if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                        car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                        car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                        car.shadow.rotation = car.sprite.rotation;
                    }
                },
                onComplete: () => {
                    // Clear road path flag - vehicle finished road traversal
                    car.onRoadPath = false;
                    
                    // Car has completed road traversal - remove it immediately
                    // (coins were already animated when Bezier curve finished)
                    if (car.goingToCounter && !car.stoppedAtCounter) {
                        // Vehicle finished road without collecting pizza - force collect and remove
                        if (this.pizzas.length > 0) {
                            const pizza = this.pizzas.shift();
                            pizza.destroy();
                        }
                    }
                    this.removeCar(car);
                }
            });
        }
    });
}
        
        // Smoothly curve from parking exit onto the road with reverse entry (anticlockwise turn)
        curveOntoRoadReverse(car) {
    if (!this.roadPath) {
        // No road path - remove car immediately (coins already animated in moveCarToExitAndTransition)
        this.removeCar(car);
        return;
    }

    const startX = car.sprite.x;
    const startY = car.sprite.y;
    const startRotation = car.sprite.rotation;

    // For reverse exit, the car is facing backwards, so we need to flip the forward direction
    const reverseDirX = Math.sin(startRotation + Math.PI);
    const reverseDirY = -Math.cos(startRotation + Math.PI);

    // Find closest road point, but preferring points in the reverse direction
    // ONLY consider points on the top road segment (above parking area)
    let bestT = 0;
    let bestScore = -Infinity;
    let closestValidT = 0;
    let closestValidDist = Infinity;

    for (let t = 0; t <= 1; t += 0.005) {
        const point = this.roadPath.getPoint(t);
        
        // Filter: Only consider points on top road segment
        if (point.y > this.parkingTop) continue;
        
        const toPointX = point.x - startX;
        const toPointY = point.y - startY;
        const dist = Math.sqrt(toPointX * toPointX + toPointY * toPointY);

        // Track closest valid point as fallback
        if (dist < closestValidDist) {
            closestValidDist = dist;
            closestValidT = t;
        }

        if (dist < 20) continue;

        const normX = toPointX / dist;
        const normY = toPointY / dist;

        // Alignment with reverse direction
        const reverseAlignment = normX * reverseDirX + normY * reverseDirY;
        if (reverseAlignment < 0.3) continue;

        const score = reverseAlignment / dist;

        if (score > bestScore) {
            bestScore = score;
            bestT = t;
        }
    }
    
    // If no point found with reverse alignment, use closest valid point
    if (bestScore === -Infinity) {
        bestT = closestValidT;
    }

    const roadPoint = this.roadPath.getPoint(bestT);
    const roadTangent = this.roadPath.getTangent(bestT);

    // P1 = go straight in reverse direction from car until at road level
    const toRoadX = roadPoint.x - startX;
    const toRoadY = roadPoint.y - startY;
    const revDist = toRoadX * reverseDirX + toRoadY * reverseDirY;
    const p1x = startX + reverseDirX * revDist;
    const p1y = startY + reverseDirY * revDist;

    // P2 = road point shifted along road tangent (anticlockwise/leftward for reverse entry)
    // Negate the tangent direction to go anticlockwise instead of clockwise
    const turnRadius = this.gridConfig.cellSize * 1.5;
    const desiredP2x = roadPoint.x - roadTangent.x * turnRadius; // Note the minus
    const desiredP2y = roadPoint.y - roadTangent.y * turnRadius; // Note the minus

    // Clamp P2 to the nearest actual point ON the road path
    let p2x = roadPoint.x;
    let p2y = roadPoint.y;
    let nearestDist = Infinity;
    for (let t = 0; t <= 1; t += 0.002) {
        const rp = this.roadPath.getPoint(t);
        const dx = rp.x - desiredP2x;
        const dy = rp.y - desiredP2y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) {
            nearestDist = d;
            p2x = rp.x;
            p2y = rp.y;
        }
    }

    const turnCurve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(startX, startY),
        new Phaser.Math.Vector2(p1x, p1y),
        new Phaser.Math.Vector2(p2x, p2y)
    );

    // Debug visualization (only if enabled in config)
    let curveGraphics;
    if (CONFIG.PARKING_CAR.DEBUG_SHOW_CURVE) {
        curveGraphics = this.add.graphics();
        curveGraphics.lineStyle(4, 0x0000FF, 0.8); // Blue for reverse
        const curvePath = new Phaser.Curves.Path();
        curvePath.add(turnCurve);
        curvePath.draw(curveGraphics);
        curveGraphics.fillStyle(0x00FF00, 1);
        curveGraphics.fillCircle(p1x, p1y, 8);
        curveGraphics.fillStyle(0xFF00FF, 1); // Magenta for reverse start/end
        curveGraphics.fillCircle(startX, startY, 8);
        curveGraphics.fillCircle(p2x, p2y, 8);
        curveGraphics.setDepth(1000);
    }

    const curveLength = turnCurve.getLength();
    const turnDuration = (curveLength / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;

    const follower = { t: 0 };
    const curvePhaseWeight = 0.25; // Curve is 25% of total journey (15-40%)
    const parkingPhaseWeight = 0.15; // Already completed

    this.tweens.add({
        targets: follower,
        t: 1.0,
        duration: turnDuration,
        ease: 'Linear',
        onUpdate: (tween) => {
            const point = turnCurve.getPoint(follower.t);
            car.sprite.x = point.x;
            car.sprite.y = point.y;

            const tangent = turnCurve.getTangent(follower.t);
            // Add PI to flip car 180 degrees - makes BACK face direction of motion (reverse)
            car.sprite.rotation = Math.atan2(tangent.y, tangent.x) + Math.PI / 2 + Math.PI;
            
            // Update sound based on curve phase progress (15% to 40%)
            car.totalJourneyProgress = parkingPhaseWeight + (tween.progress * curvePhaseWeight);
            this.updateVehicleSound(car, car.totalJourneyProgress);
            
            // Always update tire tracks during reverse curve (this is a reverse turn)
            this.updateTireTracks(car);
            
            // Update shadow position and rotation if shadow exists
            if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                car.shadow.rotation = car.sprite.rotation;
            }
        },
        onComplete: () => {
            if (CONFIG.PARKING_CAR.DEBUG_SHOW_CURVE && curveGraphics) {
                curveGraphics.destroy();
            }
            
            // Fade out tire tracks after reverse curve if enabled
            if (CONFIG.TIRE_TRACKS.FADE_ENABLED) {
                this.fadeTireTracks(car);
            }

            // After the reverse curve, car should be on road facing clockwise
            // Now traverse the road in forward direction (clockwise)
            const pathLength = this.roadPath.getLength();
            const spacedPoints = this.roadPath.getSpacedPoints(500);

            // Find spaced point closest to p2 (where curve ended)
            let startIndex = 0;
            let minD = Infinity;
            for (let i = 0; i < spacedPoints.length; i++) {
                const dx = spacedPoints[i].x - p2x;
                const dy = spacedPoints[i].y - p2y;
                const d = dx * dx + dy * dy;
                if (d < minD) { minD = d; startIndex = i; }
            }

            // Correct needsFullLap based on actual road entry position vs counter position
            if (car.goingToCounter && this.counterPathIndex !== undefined) {
                car.needsFullLap = startIndex > this.counterPathIndex;
            }

            const remainingPoints = spacedPoints.length - startIndex;
            const remainingDistance = (remainingPoints / spacedPoints.length) * pathLength;
            const pathDuration = (remainingDistance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;

            // Coins will be animated when vehicle crosses the gate (payment on exit)
            // No longer animate coins here

            const roadFollower = { index: startIndex };
            const roadPhaseWeight = 0.60; // Road is 60% of total journey (40-100%)

            // Store path data in car for proximity checking
            car.roadPathData = {
                spacedPoints: spacedPoints,
                currentIndex: 0  // Will be updated in onUpdate
            };
            
            // Set flag to indicate vehicle is now on road path (for pizza waypoint check)
            car.onRoadPath = true;

            // Create and store tween reference for stopping/resuming
            car.roadTween = this.tweens.add({
                targets: roadFollower,
                index: spacedPoints.length - 1,
                duration: pathDuration,
                ease: 'Linear',
                onUpdate: (tween) => {
                    const idx = Math.floor(roadFollower.index);
                    const nextIdx = Math.min(idx + 1, spacedPoints.length - 1);
                    const fraction = roadFollower.index - idx;

                    const point1 = spacedPoints[idx];
                    const point2 = spacedPoints[nextIdx];

                    car.sprite.x = point1.x + (point2.x - point1.x) * fraction;
                    car.sprite.y = point1.y + (point2.y - point1.y) * fraction;
                    
                    // Update current path index for proximity checking
                    car.roadPathData.currentIndex = idx;

                    const dx = point2.x - point1.x;
                    const dy = point2.y - point1.y;
                    if (dx !== 0 || dy !== 0) {
                        car.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                    }
                    
                    // Check if car needs to stop at counter (for pizza collection)
                    // ONLY check when vehicle is on road path (not during parking, charging, or Bezier curve)
                    if (car.onRoadPath && car.goingToCounter && !car.stoppedAtCounter) {
                        // Check if vehicle needs a full lap first
                        if (car.needsFullLap && !car.hasCompletedLap) {
                            // Check if vehicle has completed a full lap (near starting point)
                            const pathProgress = idx / spacedPoints.length;
                            if (pathProgress > 0.9) { // 90% through the path
                                car.hasCompletedLap = true;
                            }
                        } else {
                            // Either doesn't need full lap, or has already completed it
                            // Stop when vehicle reaches the pizza counter waypoint
                            const waypointTolerance = 5; // Allow ±5 indices tolerance for waypoint detection
                            const atWaypoint = Math.abs(idx - this.pizzaCounterWaypointIndex) <= waypointTolerance;
                            
                            if (atWaypoint) {
                                car.stoppedAtCounter = true;
                                
                                // Set as current collector (no queue check needed - single queue system ensures only one vehicle at a time)
                                this.currentPizzaCollector = car;
                                
                                // Kill this tween
                                tween.stop();
                                
                                if (CONFIG.PIZZA_DELIVERY.STAY_ON_ROAD) {
                                    // Keep car on road and animate pizza to it
                                    this.collectPizzaOnRoad(car, spacedPoints, idx);
                                } else {
                                    // Original behavior: route car off road to counter
                                    this.routeCarFromRoadToCounter(car, spacedPoints, idx);
                                }
                                return;
                            }
                        }
                    }
                    
                    // Update sound based on road phase progress (40% to 100%)
                    car.totalJourneyProgress = parkingPhaseWeight + curvePhaseWeight + (tween.progress * roadPhaseWeight);
                    this.updateVehicleSound(car, car.totalJourneyProgress);
                    // No tire tracks during road following phase (only during bezier curve)
                    
                    // Update shadow position and rotation if shadow exists
                    if (car.shadow && CONFIG.VEHICLE_SHADOW.ENABLED) {
                        car.shadow.x = car.sprite.x + CONFIG.VEHICLE_SHADOW.OFFSET_X;
                        car.shadow.y = car.sprite.y + CONFIG.VEHICLE_SHADOW.OFFSET_Y;
                        car.shadow.rotation = car.sprite.rotation;
                    }
                },
                onComplete: () => {
                    // Clear road path flag - vehicle finished road traversal
                    car.onRoadPath = false;
                    
                    // Car has completed road traversal - remove it immediately
                    // (coins were already animated when Bezier curve finished)
                    if (car.goingToCounter && !car.stoppedAtCounter) {
                        // Vehicle finished road without collecting pizza - force collect and remove
                        if (this.pizzas.length > 0) {
                            const pizza = this.pizzas.shift();
                            pizza.destroy();
                        }
                    }
                    this.removeCar(car);
                }
            });
        }
    });
}
        
        // Find the closest point on the road path to given coordinates
        findClosestPointOnPath(x, y) {
            if (!this.roadPath) return 0;
            
            let closestT = 0;
            let closestDist = Infinity;
            
            // Sample the path at regular intervals to find closest point
            for (let t = 0; t <= 1; t += 0.01) {
                const point = this.roadPath.getPoint(t);
                const dist = Phaser.Math.Distance.Between(x, y, point.x, point.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestT = t;
                }
            }
            
            return closestT;
        }
        
        // Update tire tracks for a moving car
        updateTireTracks(car) {
            if (!CONFIG.TIRE_TRACKS.ENABLED) return;
            if (!car.tireTrackGraphics) {
                console.warn('Car missing tire track graphics:', car);
                return;
            }
            if (!car.sprite) return;
            
            const carX = car.sprite.x;
            const carY = car.sprite.y;
            const carRotation = car.sprite.rotation;
            
            // Calculate left and right tire positions (perpendicular offset from car center)
            // Perpendicular to car direction: rotate 90 degrees from car's forward direction
            const perpX = Math.cos(carRotation); // Perpendicular X (left-right relative to car)
            const perpY = Math.sin(carRotation); // Perpendicular Y
            
            const offset = CONFIG.TIRE_TRACKS.WHEEL_OFFSET;
            const leftTireX = carX - perpX * offset;
            const leftTireY = carY - perpY * offset;
            const rightTireX = carX + perpX * offset;
            const rightTireY = carY + perpY * offset;
            
            // Add points to tracks if car has moved enough distance
            const addPoint = (trackPoints, x, y) => {
                if (trackPoints.length > 0) {
                    const lastPoint = trackPoints[trackPoints.length - 1];
                    const dist = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
                    if (dist < CONFIG.TIRE_TRACKS.MIN_DISTANCE) return; // Too close, skip
                }
                
                trackPoints.push({ x, y });
                
                // Limit number of points to prevent memory issues
                if (trackPoints.length > CONFIG.TIRE_TRACKS.MAX_POINTS) {
                    trackPoints.shift(); // Remove oldest point
                }
            };
            
            addPoint(car.leftTrackPoints, leftTireX, leftTireY);
            addPoint(car.rightTrackPoints, rightTireX, rightTireY);
            
            // Redraw tire tracks
            car.tireTrackGraphics.clear();
            car.tireTrackGraphics.lineStyle(
                CONFIG.TIRE_TRACKS.LINE_WIDTH,
                hexColor(CONFIG.TIRE_TRACKS.COLOR),
                CONFIG.TIRE_TRACKS.ALPHA
            );
            
            // Draw left tire track
            if (car.leftTrackPoints.length > 1) {
                car.tireTrackGraphics.beginPath();
                car.tireTrackGraphics.moveTo(car.leftTrackPoints[0].x, car.leftTrackPoints[0].y);
                for (let i = 1; i < car.leftTrackPoints.length; i++) {
                    car.tireTrackGraphics.lineTo(car.leftTrackPoints[i].x, car.leftTrackPoints[i].y);
                }
                car.tireTrackGraphics.strokePath();
            }
            
            // Draw right tire track
            if (car.rightTrackPoints.length > 1) {
                car.tireTrackGraphics.beginPath();
                car.tireTrackGraphics.moveTo(car.rightTrackPoints[0].x, car.rightTrackPoints[0].y);
                for (let i = 1; i < car.rightTrackPoints.length; i++) {
                    car.tireTrackGraphics.lineTo(car.rightTrackPoints[i].x, car.rightTrackPoints[i].y);
                }
                car.tireTrackGraphics.strokePath();
            }
        }
        
        // Fade out tire tracks with animation
        fadeTireTracks(car) {
            if (!CONFIG.TIRE_TRACKS.ENABLED || !CONFIG.TIRE_TRACKS.FADE_ENABLED) return;
            if (!car.tireTrackGraphics) return;
            
            // Use delayedCall to wait before starting fade
            this.time.delayedCall(CONFIG.TIRE_TRACKS.FADE_DELAY, () => {
                // Animate alpha from current value to 0
                this.tweens.add({
                    targets: car.tireTrackGraphics,
                    alpha: 0,
                    duration: CONFIG.TIRE_TRACKS.FADE_DURATION,
                    ease: 'Linear',
                    onComplete: () => {
                        // Clear the tracks after fade completes
                        if (car.tireTrackGraphics) {
                            car.tireTrackGraphics.clear();
                            car.tireTrackGraphics.alpha = 1; // Reset alpha for next use
                        }
                        if (car.leftTrackPoints) car.leftTrackPoints = [];
                        if (car.rightTrackPoints) car.rightTrackPoints = [];
                    }
                });
            });
        }
        
        // Remove car and cleanup
        removeCar(car) {
            // Stop vehicle sound if playing
            this.stopVehicleSound(car);
            
            // Clear grid occupancy
            if (car.occupiedCells) {
                for (let cell of car.occupiedCells) {
                    if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                        cell.col >= 0 && cell.col < this.gridConfig.cols) {
                        this.gridOccupancy[cell.row][cell.col] = null;
                    }
                }
            }
            
            // Destroy tire track graphics
            if (car.tireTrackGraphics) {
                car.tireTrackGraphics.destroy();
            }
            
            // Destroy shadow graphics
            if (car.shadow) {
                car.shadow.destroy();
            }
            
            car.sprite.destroy();
            if (car.chargeBar) car.chargeBar.destroy();
            if (car.chargeBarBg) car.chargeBarBg.destroy();
            if (car.batteryContainer) car.batteryContainer.destroy();
            
            // PIZZA DELIVERY: If this car was the current collector, clear it and process next
            if (CONFIG.PIZZA_DELIVERY.ENABLED && this.currentPizzaCollector === car) {
                this.currentPizzaCollector = null;
                this.processNextInExitQueue();
            }
            
            // Remove from array
            const index = this.cars.indexOf(car);
            if (index > -1) {
                this.cars.splice(index, 1);
            }
            
            // Update which cars can move next
            this.updateMovableCars();
            
            // Check win condition
            if (this.cars.length === 0) {
                this.winLevel();
            }
        }

        // Start vehicle sound with realistic acceleration
        startVehicleSound(car) {
            // Check if we've reached the concurrent sound limit
            if (this.activeSounds.length >= this.maxConcurrentSounds) {
                // Remove oldest sound
                const oldestSound = this.activeSounds.shift();
                if (oldestSound && oldestSound.isPlaying) {
                    oldestSound.stop();
                }
            }
            
            // Create sound for this vehicle
            const sound = this.sound.add('car_idle', {
                loop: true,
                volume: CONFIG.AUDIO.ENGINE_IDLE_VOLUME,
                rate: CONFIG.AUDIO.ENGINE_IDLE_RATE
            });
            
            sound.play();
            car.engineSound = sound;
            car.soundProgress = 0; // Track movement progress for dynamic sound
            this.activeSounds.push(sound);
        }

        // Update vehicle sound based on movement progress (0 to 1)
        updateVehicleSound(car, progress) {
            if (!car.engineSound || !car.engineSound.isPlaying) return;
            
            const ac = CONFIG.AUDIO;
            let targetRate, targetVolume;
            
            // Simulate realistic vehicle sound: acceleration -> cruising -> deceleration
            if (progress < 0.2) {
                // Starting/accelerating (0 to 20%)
                const accelProgress = progress / 0.2;
                targetRate = Phaser.Math.Linear(ac.ENGINE_IDLE_RATE, ac.ENGINE_MAX_RATE, accelProgress);
                targetVolume = Phaser.Math.Linear(ac.ENGINE_IDLE_VOLUME, ac.ENGINE_ACTIVE_VOLUME, accelProgress);
            } else if (progress < 0.8) {
                // Cruising at speed (20% to 80%)
                targetRate = ac.ENGINE_MAX_RATE;
                targetVolume = ac.ENGINE_ACTIVE_VOLUME;
            } else {
                // Decelerating/exiting (80% to 100%)
                const decelProgress = (progress - 0.8) / 0.2;
                targetRate = Phaser.Math.Linear(ac.ENGINE_MAX_RATE, ac.ENGINE_IDLE_RATE, decelProgress);
                targetVolume = Phaser.Math.Linear(ac.ENGINE_ACTIVE_VOLUME, ac.ENGINE_IDLE_VOLUME * 0.5, decelProgress);
            }
            
            // Smooth interpolation for natural sound transitions
            const currentRate = car.engineSound.rate;
            const currentVolume = car.engineSound.volume;
            
            const newRate = Phaser.Math.Linear(currentRate, targetRate, ac.RATE_LERP_SPEED);
            const newVolume = Phaser.Math.Linear(currentVolume, targetVolume, ac.VOLUME_LERP_SPEED);
            
            car.engineSound.setRate(newRate);
            car.engineSound.setVolume(newVolume);
        }

        // Stop vehicle sound
        stopVehicleSound(car) {
            if (car.engineSound) {
                if (car.engineSound.isPlaying) {
                    car.engineSound.stop();
                }
                
                // Remove from active sounds list
                const index = this.activeSounds.indexOf(car.engineSound);
                if (index > -1) {
                    this.activeSounds.splice(index, 1);
                }
                
                car.engineSound = null;
            }
        }

        winLevel() {
            // Stop charging
            if (this.chargingInterval) {
                this.chargingInterval.remove();
            }
            
            // Trigger white flash transition and load next level
            this.transitionToNextLevel();
        }
        
        transitionToNextLevel() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Create white overlay for the entire game area
            const whiteOverlay = this.add.rectangle(
                sceneWidth / 2, 
                sceneHeight / 2, 
                sceneWidth, 
                sceneHeight, 
                0xFFFFFF
            );
            whiteOverlay.setDepth(1000);
            whiteOverlay.setAlpha(0); // Start fully transparent
            
            // Fade to semi-transparent (20% opacity means 80% transparency = alpha 0.2)
            this.tweens.add({
                targets: whiteOverlay,
                alpha: 0.2,
                duration: 50, // Quick fade in
                ease: 'Linear',
                onComplete: () => {
                    // Then fade out in steps (10 frames = ~167ms at 60fps)
                    this.tweens.add({
                        targets: whiteOverlay,
                        alpha: 0,
                        duration: 167, // About 10 frames
                        ease: 'Linear',
                        onComplete: () => {
                            whiteOverlay.destroy();
                            
                            // Load next level
                            this.loadNextLevel();
                        }
                    });
                }
            });
        }
        
        loadNextLevel() {
            // Move to next level, loop back to start if we've completed all levels
            this.currentLevelIndex++;
            if (this.currentLevelIndex >= this.allLevelsData.length) {
                this.currentLevelIndex = 0; // Loop back to first level
            }
            
            // Clear existing parking area elements
            this.clearParkingArea();
            
            // Load new level
            this.levelData = this.allLevelsData[this.currentLevelIndex];
            this.loadLevel(this.levelData);
        }
        
        clearParkingArea() {
            // Destroy all cars and their UI elements
            for (let car of this.cars) {
                if (car.sprite) car.sprite.destroy();
                if (car.chargeBar) car.chargeBar.destroy();
                if (car.chargeBarBg) car.chargeBarBg.destroy();
                if (car.chargeText) car.chargeText.destroy();
                if (car.batteryContainer) car.batteryContainer.destroy();
            }
            this.cars = [];
            
            // Clear pizza delivery system
            this.pizzas.forEach(pizza => pizza.destroy());
            this.pizzas = [];
            this.exitQueue = [];
            this.currentPizzaCollector = null;
            
            // Destroy parking lot graphics
            if (this.roadRope) this.roadRope.destroy();
            if (this.parkingRect) this.parkingRect.destroy();
            
            // Reset grid occupancy (will be recreated in loadLevel)
            this.gridOccupancy = null;
        }
        
        // ========== END PARKING JAM METHODS ==========
        
        handleBatteryDrop(gameObject, slotIndex) {
            // Handle battery drop from MergeScene (to be implemented)
        }
        
        // Test buttons removed - batteries added via drag and drop from grid

        createVehicle() {
            const vc = CONFIG.VEHICLE;
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Spawn vehicle at the left end of the screen (fully visible)
            const x = 120; // Left side position
            const y = this.groundY - 50; // Above ground
            
            // Create collision group for vehicle (like car.ts example)
            const vehicleGroup = this.matter.world.nextGroup(true);
            
            // Create chassis (NO COLLISION with ground or wheels)
            this.vehicle = {
                chassis: this.matter.add.rectangle(x, y, vc.CHASSIS_WIDTH, vc.CHASSIS_HEIGHT, {
                    density: vc.CHASSIS_DENSITY,  // Use density like car.ts example
                    friction: vc.FRICTION,
                    chamfer: { radius: vc.CHASSIS_HEIGHT * 0.5 },  // Rounded corners like car.ts
                    collisionFilter: {
                        group: vehicleGroup  // Use collision group
                    },
                    render: {
                        visible: CONFIG.PHYSICS.DEBUG_CHASSIS_COLLIDER
                    }
                }),
                
                // Create rear wheel (COLLIDES with ground only)
                rearWheel: this.matter.add.circle(
                    x + vc.REAR_WHEEL_OFFSET_X,
                    y + vc.REAR_WHEEL_OFFSET_Y,
                    vc.WHEEL_RADIUS,
                    {
                        density: vc.WHEEL_DENSITY,  // Use density like car.ts example
                        friction: vc.WHEEL_FRICTION,
                        restitution: 0,  // No bounce
                        collisionFilter: {
                            group: vehicleGroup  // Use collision group
                        },
                        render: {
                            visible: CONFIG.PHYSICS.DEBUG_WHEEL_COLLIDER
                        }
                    }
                ),
                
                // Create front wheel (COLLIDES with ground only)
                frontWheel: this.matter.add.circle(
                    x + vc.FRONT_WHEEL_OFFSET_X,
                    y + vc.FRONT_WHEEL_OFFSET_Y,
                    vc.WHEEL_RADIUS,
                    {
                        density: vc.WHEEL_DENSITY,  // Use density like car.ts example
                        friction: vc.WHEEL_FRICTION,
                        restitution: 0,  // No bounce
                        collisionFilter: {
                            group: vehicleGroup  // Use collision group
                        },
                        render: {
                            visible: CONFIG.PHYSICS.DEBUG_WHEEL_COLLIDER
                        }
                    }
                )
            };
            
            // Create rigid axle constraints (like car.ts example)
            // Rigid constraint (length=0, stiffness=0.2) connects wheel to chassis offset point
            // This prevents bouncing while allowing slight compliance
            
            // REAR WHEEL axle (rigid constraint)
            this.vehicle.rearSpring = this.matter.add.constraint(
                this.vehicle.chassis,
                this.vehicle.rearWheel,
                vc.SPRING_LENGTH,  // 0 = rigid constraint
                vc.SPRING_STIFFNESS,  // 0.2 = slight compliance
                {
                    pointA: { x: vc.REAR_WHEEL_OFFSET_X, y: vc.REAR_WHEEL_OFFSET_Y },  // Exact offset point on chassis
                    pointB: { x: 0, y: 0 },  // Center of wheel
                    render: { visible: true }  // Make visible for debugging
                }
            );
            
            // FRONT WHEEL axle (rigid constraint)
            this.vehicle.frontSpring = this.matter.add.constraint(
                this.vehicle.chassis,
                this.vehicle.frontWheel,
                vc.SPRING_LENGTH,  // 0 = rigid constraint
                vc.SPRING_STIFFNESS,  // 0.2 = slight compliance
                {
                    pointA: { x: vc.FRONT_WHEEL_OFFSET_X, y: vc.FRONT_WHEEL_OFFSET_Y },  // Exact offset point on chassis
                    pointB: { x: 0, y: 0 },  // Center of wheel
                    render: { visible: true }  // Make visible for debugging
                }
            );
            
            // Create sprites with proper depth layering:
            // Ground (created in terrain) = depth 20
            // Chassis = depth 10
            // Wheels = depth 5
            this.rearWheelSprite = this.add.image(0, 0, 'tire').setDepth(5);
            this.frontWheelSprite = this.add.image(0, 0, 'tire').setDepth(5);
            this.chassisSprite = this.add.image(0, 0, 'chassis').setDepth(10);
            
            // Scale sprites to match physics bodies
            this.chassisSprite.setDisplaySize(vc.CHASSIS_WIDTH, vc.CHASSIS_HEIGHT);
            this.rearWheelSprite.setDisplaySize(vc.WHEEL_RADIUS * 2, vc.WHEEL_RADIUS * 2);
            this.frontWheelSprite.setDisplaySize(vc.WHEEL_RADIUS * 2, vc.WHEEL_RADIUS * 2);
            
            // Create debug circles for wheel offset visualization
            this.debugCircles = this.add.graphics();
            this.debugCircles.setDepth(100);  // Draw on top of everything
        }

        createBox() {
            const bc = CONFIG.BOX;
            const sceneWidth = this.cameras.main.width;
            const boxY = this.groundY - bc.HEIGHT / 2; // Resting on ground
            
            // Create 4 boxes with gaps between them
            const numBoxes = 4;
            const gapBetweenBoxes = 80; // Gap between each box
            const startX = 350; // Starting position for first box
            
            for (let i = 0; i < numBoxes; i++) {
                const boxX = startX + i * (bc.WIDTH + gapBetweenBoxes);
                
                // Create box physics body
                const box = {
                    body: this.matter.add.rectangle(boxX, boxY, bc.WIDTH, bc.HEIGHT, {
                        density: bc.WEIGHT,
                        friction: bc.BOX_FRICTION,
                        frictionStatic: bc.FRICTION,  // Static friction with ground
                        restitution: 0,  // No bounce
                        render: {
                            visible: CONFIG.PHYSICS.DEBUG_GROUND_COLLIDER,
                            fillStyle: bc.COLOR
                        }
                    })
                };
                
                // Create box sprite using graphics
                box.sprite = this.add.graphics();
                box.sprite.setDepth(15);  // Between chassis (10) and ground (20)
                
                // Draw the box
                box.sprite.fillStyle(bc.COLOR, 1);
                box.sprite.fillRect(-bc.WIDTH / 2, -bc.HEIGHT / 2, bc.WIDTH, bc.HEIGHT);
                box.sprite.lineStyle(bc.BORDER_WIDTH, bc.BORDER_COLOR, 1);
                box.sprite.strokeRect(-bc.WIDTH / 2, -bc.HEIGHT / 2, bc.WIDTH, bc.HEIGHT);
                
                // Store box in array
                this.boxes.push(box);
            }
        }

        // Brake and gas buttons removed - car automatically accelerates

        setupEngineSound() {
            // Create looping engine sound
            this.engineSound = this.sound.add('car_idle', {
                loop: true,
                volume: CONFIG.AUDIO.ENGINE_IDLE_VOLUME,
                rate: CONFIG.AUDIO.ENGINE_IDLE_RATE
            });
        }

        startEngine() {
            if (!this.isEngineRunning && this.engineSound) {
                this.engineSound.play();
                this.isEngineRunning = true;
                this.currentPlaybackRate = CONFIG.AUDIO.ENGINE_IDLE_RATE;
                this.currentVolume = CONFIG.AUDIO.ENGINE_IDLE_VOLUME;
            }
        }

        stopEngine() {
            if (this.isEngineRunning && this.engineSound) {
                this.engineSound.stop();
                this.isEngineRunning = false;
            }
        }

        updateEngineSound() {
            if (!this.isEngineRunning || !this.engineSound) return;

            const vc = CONFIG.VEHICLE;
            const ac = CONFIG.AUDIO;
            
            // Get current wheel speed (absolute value for pitch calculation)
            const wheelSpeed = Math.abs(this.vehicle.rearWheel.angularSpeed);
            // Use reference speed for engine sound (speed naturally emerges from torque)
            const referenceSpeed = 5;  // Reference max angular velocity for sound scaling
            
            // Calculate speed ratio (0 to 1)
            const speedRatio = Math.min(wheelSpeed / referenceSpeed, 1.0);

            // Always accelerating - increase pitch and volume based on speed
            this.targetPlaybackRate = Phaser.Math.Linear(
                ac.ENGINE_IDLE_RATE,
                ac.ENGINE_MAX_RATE,
                speedRatio
            );
            this.targetVolume = ac.ENGINE_ACTIVE_VOLUME;

            // Smooth interpolation (lerp) for natural sound transitions
            this.currentPlaybackRate = Phaser.Math.Linear(
                this.currentPlaybackRate,
                this.targetPlaybackRate,
                ac.RATE_LERP_SPEED
            );
            
            this.currentVolume = Phaser.Math.Linear(
                this.currentVolume,
                this.targetVolume,
                ac.VOLUME_LERP_SPEED
            );

            // Apply the smoothed values to the sound
            if (this.engineSound.isPlaying) {
                this.engineSound.setRate(this.currentPlaybackRate);
                this.engineSound.setVolume(this.currentVolume);
            }
        }

        update(time, delta) {
            // Update logic for merge scene only
            // Vehicle physics removed - now handled by ParkingJamScene
            
            // Smoothly animate charge display for all cars
            this.updateChargeAnimations(delta);
            
            // Update gate state based on vehicle proximity
            this.updateGate();
            
            // Update pizza counter - DISABLED: now using waypoint-based detection in road traversal loop
            // this.updatePizzaCounter();
            
            // Draw charging connections (DISABLED - using color coding instead)
            // this.drawChargingConnections();
            
            // Check level-up timer
            this.checkLevelUpTimer();
            
            // Retry blocked cars periodically
            this.retryBlockedCars();
        }
        
        updateChargeAnimations(delta) {
            // Smoothly interpolate displayedCharge towards currentCharge
            const animationSpeed = CONFIG.PARKING_CAR.CHARGE_ANIMATION_SPEED;
            const deltaSeconds = delta / 1000;
            
            for (let car of this.cars) {
                if (car.displayedCharge === undefined) {
                    car.displayedCharge = car.currentCharge;
                    continue;
                }
                
                // Calculate the difference between target and current display
                const difference = car.currentCharge - car.displayedCharge;
                
                if (Math.abs(difference) > 0.01) {
                    // Move displayedCharge towards currentCharge
                    const maxChange = animationSpeed * deltaSeconds;
                    const change = Math.sign(difference) * Math.min(Math.abs(difference), maxChange);
                    car.displayedCharge += change;
                    
                    // Update the visual display
                    this.updateCarChargeBar(car);
                } else {
                    // Snap to final value when very close
                    car.displayedCharge = car.currentCharge;
                }
                
                // Animate analog meter needle with overshoot and pulse
                if (car.analogNeedle && CONFIG.PARKING_CAR.ANALOG_METER_ENABLED && CONFIG.PARKING_CAR.ANALOG_METER_SHOW && car.isCharging) {
                    const meterConfig = CONFIG.PARKING_CAR;
                    const targetAngle = car.needleTargetAngle;
                    const currentAngle = car.needleCurrentAngle;
                    const minAngle = 5;  // Minimum angle (5 degrees)
                    const maxAngle = 180; // Maximum angle (180 degrees)
                    
                    // Calculate difference
                    const diff = targetAngle - currentAngle;
                    
                    // Apply overshoot when target changes significantly
                    if (Math.abs(diff) > 1) {
                        // Add velocity towards target with overshoot
                        car.needleVelocity += diff * 0.08; // Acceleration towards target
                        
                        // Add random pulse for dynamic movement
                        if (Math.random() < 0.1) { // 10% chance each frame
                            car.needleVelocity += (Math.random() - 0.5) * meterConfig.ANALOG_METER_PULSE_INTENSITY;
                        }
                        
                        // Apply damping to settle
                        car.needleVelocity *= (1 - meterConfig.ANALOG_METER_SETTLE_SPEED);
                        
                        // Update current angle
                        car.needleCurrentAngle += car.needleVelocity * deltaSeconds * 60;
                        
                        // Clamp to arc bounds (don't allow needle to go below horizontal or beyond right)
                        car.needleCurrentAngle = Math.max(minAngle, Math.min(maxAngle, car.needleCurrentAngle));
                    } else {
                        // Snap to target when very close
                        car.needleCurrentAngle = targetAngle;
                        car.needleVelocity = 0;
                    }
                    
                    // Convert angle to rotation for top-oriented meter
                    // Needle is drawn pointing up (-Y direction), which is angle -PI/2
                    // 0° charge = needle points left on arc (rotation -PI/2)
                    // 90° charge = needle points top on arc (rotation 0)
                    // 180° charge = needle points right on arc (rotation PI/2)
                    const rotation = -Math.PI/2 + (car.needleCurrentAngle * Math.PI / 180);
                    car.analogNeedle.setRotation(rotation);
                }
            }
        }

        applyMotorPower() {
            const vc = CONFIG.VEHICLE;
            
            // Get rear wheel
            const rearWheel = this.vehicle.rearWheel;
            
            // Apply CONSTANT torque to rear wheel
            // Speed is determined by physics: torque vs friction, mass, obstacles, etc.
            // Torque = Force × Distance, here we apply rotational force
            const torque = vc.MOTOR_TORQUE;
            
            // Convert torque to angular acceleration: α = τ / I
            // Where: α = angular acceleration, τ = torque, I = moment of inertia
            const angularAcceleration = torque / rearWheel.inertia;
            
            // Apply angular acceleration to current angular velocity
            const newAngularVelocity = rearWheel.angularSpeed + angularAcceleration;
            this.matter.body.setAngularVelocity(rearWheel, newAngularVelocity);
            
            // Note: Front wheel rotates naturally through the chassis constraint
            // No need to set its velocity - physics handles it
        }

        updateVehicleGraphics() {
            // Update chassis sprite
            this.chassisSprite.setPosition(
                this.vehicle.chassis.position.x,
                this.vehicle.chassis.position.y
            );
            this.chassisSprite.setRotation(this.vehicle.chassis.angle);
            
            // Update rear wheel sprite
            this.rearWheelSprite.setPosition(
                this.vehicle.rearWheel.position.x,
                this.vehicle.rearWheel.position.y
            );
            this.rearWheelSprite.setRotation(this.vehicle.rearWheel.angle);
            
            // Update front wheel sprite
            this.frontWheelSprite.setPosition(
                this.vehicle.frontWheel.position.x,
                this.vehicle.frontWheel.position.y
            );
            this.frontWheelSprite.setRotation(this.vehicle.frontWheel.angle);
            
            // Update all box sprites
            for (let i = 0; i < this.boxes.length; i++) {
                const box = this.boxes[i];
                if (box && box.sprite) {
                    box.sprite.setPosition(
                        box.body.position.x,
                        box.body.position.y
                    );
                    box.sprite.setRotation(box.body.angle);
                }
            }
            
            // Draw debug circles for wheel offset positions
            this.drawDebugOffsets();
        }
        
        drawDebugOffsets() {
            const vc = CONFIG.VEHICLE;
            
            // Clear previous debug graphics
            this.debugCircles.clear();
            
            const chassis = this.vehicle.chassis;
            const cos = Math.cos(chassis.angle);
            const sin = Math.sin(chassis.angle);
            
            // Draw wheel offset circles (yellow)
            if (vc.DEBUG_WHEEL_OFFSET) {
                // Calculate world position of rear wheel offset point
                const rearOffsetWorldX = chassis.position.x + 
                    (vc.REAR_WHEEL_OFFSET_X * cos - vc.REAR_WHEEL_OFFSET_Y * sin);
                const rearOffsetWorldY = chassis.position.y + 
                    (vc.REAR_WHEEL_OFFSET_X * sin + vc.REAR_WHEEL_OFFSET_Y * cos);
                
                // Calculate world position of front wheel offset point
                const frontOffsetWorldX = chassis.position.x + 
                    (vc.FRONT_WHEEL_OFFSET_X * cos - vc.FRONT_WHEEL_OFFSET_Y * sin);
                const frontOffsetWorldY = chassis.position.y + 
                    (vc.FRONT_WHEEL_OFFSET_X * sin + vc.FRONT_WHEEL_OFFSET_Y * cos);
                
                this.debugCircles.fillStyle(0xFFFF00, 1);
                this.debugCircles.fillCircle(rearOffsetWorldX, rearOffsetWorldY, 4);
                this.debugCircles.fillCircle(frontOffsetWorldX, frontOffsetWorldY, 4);
            }
            
            // Draw custom debug point (yellow circle)
            if (vc.DEBUG_POINT_SHOW) {
                // Calculate world position of custom debug point
                const debugPointWorldX = chassis.position.x + 
                    (vc.DEBUG_POINT_OFFSET_X * cos - vc.DEBUG_POINT_OFFSET_Y * sin);
                const debugPointWorldY = chassis.position.y + 
                    (vc.DEBUG_POINT_OFFSET_X * sin + vc.DEBUG_POINT_OFFSET_Y * cos);
                
                this.debugCircles.fillStyle(0xFFFF00, 1);
                this.debugCircles.fillCircle(debugPointWorldX, debugPointWorldY, 4);
            }
        }

        // Debug text removed
        
        // ====================
        // MERGE SCENE METHODS
        // ====================
        
        createCoinDisplay() {
            const sceneWidth = this.cameras.main.width;
            
            // Calculate grid panel top edge
            const gridWidth = this.GRID_COLS * this.CELL_SIZE + (this.GRID_COLS - 1) * this.CELL_GAP;
            const panelPadding = CONFIG.CELL.GRID_PANEL_PADDING;
            const gridCenterX = this.gridStartX - this.CELL_SIZE / 2 + gridWidth / 2;
            const gridCenterY = this.gridStartY - this.CELL_SIZE / 2 + (this.GRID_ROWS * this.CELL_SIZE + (this.GRID_ROWS - 1) * this.CELL_GAP) / 2;
            const gridHeight = this.GRID_ROWS * this.CELL_SIZE + (this.GRID_ROWS - 1) * this.CELL_GAP;
            const panelHeight = gridHeight + 2 * panelPadding;
            
            // Position above grid panel (centered horizontally, above panel top edge)
            const coinY = gridCenterY - panelHeight / 2 - 40; // 40px above panel top
            const coinX = gridCenterX; // Horizontally centered with grid
            
            // Coin text (centered)
            this.coinText = this.add.text(coinX, coinY, `${this.coins}`, {
                fontSize: CONFIG.COIN_COUNTER.TEXT_SIZE,
                fontFamily: CONFIG.FONT_FAMILY,
                color: CONFIG.COIN_COUNTER.TEXT_COLOR,
                fontStyle: 'bold',
                stroke: CONFIG.COIN_COUNTER.TEXT_STROKE_COLOR,
                strokeThickness: CONFIG.COIN_COUNTER.TEXT_STROKE_THICKNESS
            }).setOrigin(0.5);  // Center-aligned
            this.coinText.setDepth(10); // Below tutorial overlay (so it gets masked)
            
            // Position coin icon to the right of the text
            const coinIconX = coinX + this.coinText.width / 2 + CONFIG.COIN_COUNTER.TEXT_ICON_SPACING + CONFIG.COIN_COUNTER.COIN_ICON_WIDTH / 2;
            this.coinIcon = this.add.image(coinIconX, coinY, 'coin');
            this.coinIcon.setDisplaySize(CONFIG.COIN_COUNTER.COIN_ICON_WIDTH, CONFIG.COIN_COUNTER.COIN_ICON_HEIGHT);
            this.coinIcon.setDepth(10); // Below tutorial overlay (so it gets masked)
        }
        
        // Animate coin reward when car is fully charged and moves out
        animateCoinReward(startX, startY, rewardAmount) {
            const coinCount = CONFIG.COIN_REWARD_ANIMATION.COIN_COUNT;
            const topSpeed = CONFIG.COIN_REWARD_ANIMATION.TOP_SPEED_DURATION;
            const speedVariation = CONFIG.COIN_REWARD_ANIMATION.SPEED_VARIATION;
            const staggerDelay = CONFIG.COIN_REWARD_ANIMATION.STAGGER_DELAY;
            const stackOffset = CONFIG.COIN_REWARD_ANIMATION.INITIAL_STACK_OFFSET;
            
            // Target position (coin icon in the counter)
            const targetX = this.coinIcon.x;
            const targetY = this.coinIcon.y;
            
            // Create array to track animated coins
            const animatedCoins = [];
            let completedCount = 0;
            
            // Create and animate each coin with slight delay and speed variation
            for (let i = 0; i < coinCount; i++) {
                // Create coin sprite at car position (stacked vertically with small offset)
                const coin = this.add.image(startX, startY - (i * stackOffset), 'coin');
                coin.setDisplaySize(CONFIG.COIN_REWARD_ANIMATION.REWARD_COIN_SIZE, CONFIG.COIN_REWARD_ANIMATION.REWARD_COIN_SIZE);
                coin.setDepth(100 + i); // Higher depth for coins on top
                
                animatedCoins.push(coin);
                
                // Calculate duration for this coin (top speed with variation)
                // First coin is fastest, others are progressively slower
                const durationMultiplier = 1 + (i * speedVariation / (coinCount - 1));
                const duration = topSpeed * durationMultiplier;
                
                // Animate coin to target position with staggered start
                this.time.delayedCall(i * staggerDelay, () => {
                    const shrinkSize = CONFIG.COIN_REWARD_ANIMATION.REWARD_COIN_SIZE * 0.6; // Shrink to 60% at end
                    this.tweens.add({
                        targets: coin,
                        x: targetX,
                        y: targetY,
                        displayWidth: shrinkSize,
                        displayHeight: shrinkSize,
                        duration: duration,
                        ease: CONFIG.COIN_REWARD_ANIMATION.EASE,
                        onComplete: () => {
                            // Destroy coin after animation
                            coin.destroy();
                            completedCount++;
                            
                            // When all coins have completed, update the coin count
                            if (completedCount === coinCount) {
                                this.coins += rewardAmount;
                                this.updateCoinDisplay();
                            }
                        }
                    });
                });
            }
        }

        // Animate existing coin sprites (spawned at car position) to coin counter
        animateExistingCoins(coinSprites, rewardAmount) {
            const topSpeed = CONFIG.COIN_REWARD_ANIMATION.TOP_SPEED_DURATION;
            const speedVariation = CONFIG.COIN_REWARD_ANIMATION.SPEED_VARIATION;
            const staggerDelay = CONFIG.COIN_REWARD_ANIMATION.STAGGER_DELAY;
            
            // Target position (coin icon in the counter)
            const targetX = this.coinIcon.x;
            const targetY = this.coinIcon.y;
            
            let completedCount = 0;
            const coinCount = coinSprites.length;
            
            // Animate each existing coin with slight delay and speed variation
            for (let i = 0; i < coinCount; i++) {
                const coin = coinSprites[i];
                
                // Make coin visible and bring to top
                coin.setDepth(100 + i);
                
                // Calculate duration for this coin (top speed with variation)
                const durationMultiplier = 1 + (i * speedVariation / (coinCount - 1));
                const duration = topSpeed * durationMultiplier;
                
                // Animate coin to target position with staggered start
                this.time.delayedCall(i * staggerDelay, () => {
                    const shrinkSize = coin.displayWidth * 0.6; // Shrink to 60% at end
                    this.tweens.add({
                        targets: coin,
                        x: targetX,
                        y: targetY,
                        displayWidth: shrinkSize,
                        displayHeight: shrinkSize,
                        duration: duration,
                        ease: CONFIG.COIN_REWARD_ANIMATION.EASE,
                        onComplete: () => {
                            // Destroy coin after animation
                            coin.destroy();
                            completedCount++;
                            
                            // When all coins have completed, update the coin count
                            if (completedCount === coinCount) {
                                this.coins += rewardAmount;
                                this.updateCoinDisplay();
                            }
                        }
                    });
                });
            }
        }

        createGrid() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Calculate grid dimensions
            const gridWidth = this.GRID_COLS * this.CELL_SIZE + (this.GRID_COLS - 1) * this.CELL_GAP;
            const gridHeight = this.GRID_ROWS * this.CELL_SIZE + (this.GRID_ROWS - 1) * this.CELL_GAP;
            
            // Calculate grid position: above spawn button with configurable padding
            // Grid is built from BOTTOM-UP:
            // 1. Calculate bottom edge of grid (above spawn button)
            // 2. Calculate starting Y (top row center) by subtracting grid height
            const buttonY = sceneHeight - CONFIG.BUTTON.BOTTOM_PADDING;
            const gridBottomY = buttonY - CONFIG.BUTTON.SPAWN_HEIGHT / 2 - CONFIG.MERGE_GRID.PADDING_FROM_BUTTON_TOP;
            const gridStartY = gridBottomY - gridHeight + this.CELL_SIZE / 2;
            
            // Store grid boundaries for coin display
            this.gridStartY = gridStartY;
            this.gridStartX = (sceneWidth - gridWidth) / 2 + this.CELL_SIZE / 2;
            
            // Create grid background panel
            const panelPadding = CONFIG.CELL.GRID_PANEL_PADDING;
            const panelWidth = gridWidth + 2 * panelPadding;
            const panelHeight = gridHeight + 2 * panelPadding;
            
            // Calculate panel center position
            // Grid spans from (gridStartX - CELL_SIZE/2) to (gridStartX + gridWidth - CELL_SIZE/2)
            const gridCenterX = this.gridStartX - this.CELL_SIZE / 2 + gridWidth / 2;
            const gridCenterY = this.gridStartY - this.CELL_SIZE / 2 + gridHeight / 2;
            
            // Create grid panel using sprite image
            const gridPanel = this.add.image(gridCenterX, gridCenterY, 'grid_panel');
            gridPanel.setDisplaySize(panelWidth, panelHeight);
            gridPanel.setDepth(1.5); // Above grass (1), below cells (2)
            
            for (let row = 0; row < this.GRID_ROWS; row++) {
                this.gridCells[row] = [];
                for (let col = 0; col < this.GRID_COLS; col++) {
                    const x = this.gridStartX + col * (this.CELL_SIZE + this.CELL_GAP);
                    const y = this.gridStartY + row * (this.CELL_SIZE + this.CELL_GAP);
                    
                    // Create inset look for empty cell
                    const emptyCell = this.add.graphics();
                    
                    // Outer shadow border (creates recessed/inset effect)
                    emptyCell.fillStyle(hexColor(CONFIG.CELL.INSET_SHADOW_COLOR), 1);
                    emptyCell.fillRoundedRect(
                        x - this.CELL_SIZE / 2,
                        y - this.CELL_SIZE / 2,
                        this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_RADIUS
                    );
                    
                    // Inner fill (lighter, creating depth)
                    const inset = CONFIG.CELL.INSET_BORDER_WIDTH;
                    emptyCell.fillStyle(hexColor(CONFIG.CELL.EMPTY_BG_COLOR), 1);
                    emptyCell.fillRoundedRect(
                        x - this.CELL_SIZE / 2 + inset,
                        y - this.CELL_SIZE / 2 + inset,
                        this.CELL_SIZE - inset * 2,
                        this.CELL_SIZE - inset * 2,
                        this.CELL_RADIUS - inset
                    );
                    emptyCell.setDepth(2); // Above grass (1), below other elements
                    
                    // Create inset look for filled cell (when battery is present)
                    const filledBg = this.add.graphics();
                    
                    // Outer shadow border (same as empty for consistency)
                    filledBg.fillStyle(hexColor(CONFIG.CELL.INSET_SHADOW_COLOR), 1);
                    filledBg.fillRoundedRect(
                        x - this.CELL_SIZE / 2,
                        y - this.CELL_SIZE / 2,
                        this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_RADIUS
                    );
                    
                    // Inner fill (brighter almost-white for occupied cells)
                    filledBg.fillStyle(hexColor(CONFIG.CELL.FILLED_BG_COLOR), 1);
                    filledBg.fillRoundedRect(
                        x - this.CELL_SIZE / 2 + inset,
                        y - this.CELL_SIZE / 2 + inset,
                        this.CELL_SIZE - inset * 2,
                        this.CELL_SIZE - inset * 2,
                        this.CELL_RADIUS - inset
                    );
                    filledBg.setDepth(2); // Above grass (1), below other elements
                    filledBg.setVisible(false);
                    
                    this.gridCells[row][col] = {
                        x: x,
                        y: y,
                        row: row,
                        col: col,
                        isEmpty: true,
                        cell: emptyCell,
                        filledBg: filledBg
                    };
                }
            }
        }

        createButtons() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            const buttonY = sceneHeight - CONFIG.BUTTON.BOTTOM_PADDING;
            
            // Spawn button
            const spawnButton = this.add.container(sceneWidth / 2, buttonY);
            
            const spawnBg = this.add.image(0, 0, 'button');
            spawnBg.setDisplaySize(CONFIG.BUTTON.SPAWN_WIDTH+30, CONFIG.BUTTON.SPAWN_HEIGHT+30);
            spawnBg.setInteractive({ useHandCursor: true });
            
            // Battery icon on button - use correct level based on BATTERY_START_LEVEL
            const batteryIconLevel = getBatteryIconLevel(this.spawnButtonLevel);
            const spawnIcon = this.add.image(CONFIG.BUTTON.BATTERY_ICON_X, CONFIG.BUTTON.BATTERY_ICON_Y, `battery${batteryIconLevel}`);
            spawnIcon.setDisplaySize(CONFIG.BUTTON.BATTERY_ICON_WIDTH, CONFIG.BUTTON.BATTERY_ICON_HEIGHT);
            
            this.spawnButtonText = this.add.text(CONFIG.BUTTON.COIN_TEXT_X, CONFIG.BUTTON.COIN_TEXT_Y, `10`, {
                fontSize: CONFIG.BUTTON.COIN_TEXT_SIZE,
                fontFamily: CONFIG.FONT_FAMILY,
                color: '#FFFFFF',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Coin icon on button
            const spawnCoinIcon = this.add.image(CONFIG.BUTTON.COIN_ICON_X, CONFIG.BUTTON.COIN_ICON_Y, 'coin');
            spawnCoinIcon.setDisplaySize(CONFIG.BUTTON.COIN_ICON_WIDTH, CONFIG.BUTTON.COIN_ICON_HEIGHT);
            
            spawnButton.add([spawnBg, spawnIcon, this.spawnButtonText, spawnCoinIcon]);
            spawnButton.setDepth(100); // UI elements always on top
            
            spawnBg.on('pointerdown', () => {
                this.spawnBattery();
            });
            
            this.spawnButton = spawnButton;
            this.spawnButtonBg = spawnBg;
            this.spawnButtonIcon = spawnIcon;  // Store icon reference for updating
            
            // Level-up button (left of spawn button)
            const levelUpButton = this.add.container(sceneWidth / 2 - CONFIG.BUTTON.BUTTON_SPACING, buttonY);
            
            const levelUpBg = this.add.rectangle(0, 0, CONFIG.BUTTON.LEVELUP_WIDTH, CONFIG.BUTTON.LEVELUP_HEIGHT, hexColor(CONFIG.BUTTON.LEVELUP_COLOR));
            levelUpBg.setStrokeStyle(CONFIG.BUTTON.LEVELUP_BORDER_WIDTH, hexColor(CONFIG.BUTTON.LEVELUP_BORDER_COLOR));
            levelUpBg.setInteractive({ useHandCursor: true });
            
            const levelUpText = this.add.text(0, 0, '📺 Level Up\nAll', {
                fontSize: '18px',
                fontFamily: CONFIG.FONT_FAMILY,
                align: 'center',
                color: '#FFFFFF',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            levelUpButton.add([levelUpBg, levelUpText]);
            levelUpButton.setDepth(100); // UI elements always on top
            
            levelUpBg.on('pointerdown', () => {
                if (this.levelUpButtonVisible) {
                    this.levelUpAll();
                }
            });
            
            this.levelUpButton = levelUpButton;
            this.levelUpButtonBg = levelUpBg;
            
            // Hide level-up button initially
            this.levelUpButton.setVisible(false);
            this.levelUpButtonVisible = false;
            this.levelUpButtonShowTime = null;
            
            // Start level-up timer (first appearance after 20 seconds)
            this.time.addEvent({
                delay: 1000,
                callback: this.checkLevelUpTimer,
                callbackScope: this,
                loop: true
            });
        }

        createStartOverlay() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Create overlay covering entire scene
            const maskColor = parseInt(CONFIG.POINTER.TUTORIAL_MASK_COLOR.substring(1), 16);
            this.startOverlay = this.add.rectangle(
                sceneWidth / 2,
                sceneHeight / 2,
                sceneWidth,
                sceneHeight,
                maskColor,
                CONFIG.POINTER.TUTORIAL_MASK_OPACITY  // Mask opacity from config
            );
            this.startOverlay.setAlpha(0);  // Start fully transparent (will fade in)
            this.startOverlay.setDepth(99);   // Overlay just below spawn button (100)
            
            // Animated pointer (point.png) positioned below button center (start invisible)
            const pointerY = this.spawnButton.y + CONFIG.POINTER.OFFSET_Y;
            
            // Create stroke effect by rendering offset copies in stroke color
            const strokeWidth = CONFIG.POINTER.STROKE_WIDTH;
            const strokeColor = parseInt(CONFIG.POINTER.STROKE_COLOR.substring(1), 16);
            const fillColor = parseInt(CONFIG.POINTER.FILL_COLOR.substring(1), 16);
            
            const pointerContainer = this.add.container(this.spawnButton.x, pointerY);
            pointerContainer.setAlpha(0);  // Start invisible
            pointerContainer.setDepth(102);   // Pointer on top
            
            // Create stroke copies (8 directions for smooth outline)
            for (let angle = 0; angle < 360; angle += 45) {
                const rad = angle * Math.PI / 180;
                const offsetX = Math.cos(rad) * strokeWidth;
                const offsetY = Math.sin(rad) * strokeWidth;
                
                const strokeCopy = this.add.image(offsetX, offsetY, 'point');
                strokeCopy.setScale(CONFIG.POINTER.SCALE);
                strokeCopy.setTint(strokeColor);
                strokeCopy.setOrigin(0.5, 0);
                pointerContainer.add(strokeCopy);
            }
            
            // Create main pointer on top with fill color
            const pointer = this.add.image(0, 0, 'point');
            pointer.setScale(CONFIG.POINTER.SCALE);
            pointer.setTint(fillColor);
            pointer.setOrigin(0.5, 0);  // Origin at top center, so top appears at pointerY
            pointerContainer.add(pointer);
            
            this.startPointer = pointerContainer;
            
            // Wait before starting tutorial, then fade in overlay
            this.time.delayedCall(CONFIG.POINTER.TUTORIAL_START_DELAY, () => {
                // Safety check: ensure objects still exist before animating
                if (!this.startOverlay || !pointerContainer || !pointerContainer.active) {
                    return;
                }
                
                // Fade in overlay
                this.tweens.add({
                    targets: this.startOverlay,
                    alpha: 1,  // Fade to fully visible (showing 0.6 fillAlpha)
                    duration: CONFIG.POINTER.TUTORIAL_FADE_DURATION,
                    ease: 'Linear',
                    onComplete: () => {
                        // Safety check again before showing pointer
                        if (!pointerContainer || !pointerContainer.active) {
                            return;
                        }
                        
                        // After mask finishes, show pointer immediately (no fade)
                        pointerContainer.setAlpha(1);
                        
                        // Start position/scale animation
                        this.tweens.add({
                            targets: pointerContainer,
                            y: pointerY - CONFIG.POINTER.ANIMATION_MOVE_UP,
                            scaleX: CONFIG.POINTER.SCALE * CONFIG.POINTER.ANIMATION_SCALE_DOWN,
                            scaleY: CONFIG.POINTER.SCALE * CONFIG.POINTER.ANIMATION_SCALE_DOWN,
                            duration: CONFIG.POINTER.ANIMATION_DURATION,
                            yoyo: CONFIG.POINTER.ANIMATION_YOYO,
                            repeat: CONFIG.POINTER.ANIMATION_REPEAT
                        });
                    }
                });
            });
        }

        removeStartOverlay() {
            if (this.startOverlay) {
                this.startOverlay.destroy();
                this.startPointer.destroy();
                this.startOverlay = null;
                this.hasStartedPlaying = true;
                
                // Start level-up timer (20 seconds for first appearance)
                this.levelUpTimer = this.time.now;
                this.firstLevelUpTimer = true;
            }
        }
        
        checkAndShowMergeTutorial() {
            // Show merge tutorial when second battery is spawned
            if (!this.mergeTutorialShown && this.batteries.length === 2 && !this.mergePointer) {
                this.createMergeTutorial();
            }
        }
        
        createMergeTutorial() {
            // NO OVERLAY - just the hand animation
            
            // Get positions of first two cells (0,0) and (0,1)
            const cell1X = this.gridStartX;
            const cell1Y = this.gridStartY;
            const cell2X = this.gridStartX + (this.CELL_SIZE + this.CELL_GAP);
            const cell2Y = this.gridStartY;
            
            // Create stroke effect by rendering offset copies in stroke color
            const strokeWidth = CONFIG.POINTER.STROKE_WIDTH;
            const strokeColor = parseInt(CONFIG.POINTER.STROKE_COLOR.substring(1), 16);
            const fillColor = parseInt(CONFIG.POINTER.FILL_COLOR.substring(1), 16);
            
            const pointerContainer = this.add.container(cell1X, cell1Y);
            
            // Create stroke copies (8 directions for smooth outline)
            for (let angle = 0; angle < 360; angle += 45) {
                const rad = angle * Math.PI / 180;
                const offsetX = Math.cos(rad) * strokeWidth;
                const offsetY = Math.sin(rad) * strokeWidth;
                
                const strokeCopy = this.add.image(offsetX, offsetY, 'point');
                strokeCopy.setScale(CONFIG.POINTER.SCALE);
                strokeCopy.setTint(strokeColor);
                strokeCopy.setOrigin(0.5, 0);
                pointerContainer.add(strokeCopy);
            }
            
            // Create main pointer on top with fill color
            const mergePointer = this.add.image(0, 0, 'point');
            mergePointer.setScale(CONFIG.POINTER.SCALE);
            mergePointer.setTint(fillColor);
            mergePointer.setOrigin(0.5, 0);  // Origin at top center, so tip is at cell center
            pointerContainer.add(mergePointer);
            
            pointerContainer.setDepth(102); // Above everything else
            
            // Animate pointer from cell 1 to cell 2 horizontally
            // Left to right, then reset and repeat (no yoyo)
            this.tweens.add({
                targets: pointerContainer,
                x: cell2X,
                duration: CONFIG.MERGE_TUTORIAL.ANIMATION_DURATION,
                ease: CONFIG.MERGE_TUTORIAL.ANIMATION_EASE,
                yoyo: false,  // Don't go back
                repeat: -1,   // Repeat infinitely
                repeatDelay: 200  // Small pause before repeating (appears, animates, disappears, reappears)
            });
            
            this.mergePointer = pointerContainer;
        }
        
        removeMergeTutorial() {
            if (this.mergePointer) {
                this.mergePointer.destroy();
                this.mergePointer = null;
                this.mergeTutorialShown = true; // Mark as shown so it never appears again
            }
        }

        spawnBattery() {
            // Check if player can afford
            if (this.coins < this.spawnCost) {
                return;
            }
            
            // Find first empty cell (top-left to bottom-right)
            let emptyCell = null;
            for (let row = 0; row < this.GRID_ROWS; row++) {
                for (let col = 0; col < this.GRID_COLS; col++) {
                    if (this.grid[row][col] === null) {
                        emptyCell = { row, col };
                        break;
                    }
                }
                if (emptyCell) break;
            }
            
            // Simply don't spawn if grid is full (no message)
            if (!emptyCell) {
                return;
            }
            
            // Deduct coins
            this.coins -= this.spawnCost;
            this.updateCoinDisplay();
            
            // Spawn battery
            this.spawnBatteryInGrid(emptyCell.row, emptyCell.col, this.spawnButtonLevel);
            
            // Remove overlay if first spawn
            if (this.startOverlay) {
                this.removeStartOverlay();
            }
            
            // Check if we should show merge tutorial
            this.checkAndShowMergeTutorial();
            
            // Update spawn button state
            this.updateSpawnButton();
        }

        spawnBatteryInGrid(row, col, level) {
            const cellData = this.gridCells[row][col];
            
            // Determine which battery icon to use (dynamically uses highest available)
            const batteryIconLevel = getBatteryIconLevel(level);
            const batteryIcon = `battery${batteryIconLevel}`;
            
            // Create transparent draggable background covering entire cell
            // This makes dragging work anywhere in the cell, not just on non-transparent sprite pixels
            const draggableBg = this.add.rectangle(
                cellData.x, 
                cellData.y, 
                this.CELL_SIZE, 
                this.CELL_SIZE, 
                hexColor(CONFIG.CELL.DRAGGABLE_BG_COLOR), 
                CONFIG.CELL.DRAGGABLE_BG_ALPHA
            );
            draggableBg.setDepth(10); // Above merge grid cells (2), below battery sprite (11)
            draggableBg.setInteractive({
                draggable: true,
                useHandCursor: true
            });
            
            // Create battery sprite (not directly draggable, dragged via draggableBg)
            const battery = this.add.image(cellData.x, cellData.y + CONFIG.CELL.BATTERY_Y_OFFSET, batteryIcon);
            battery.setDisplaySize(CONFIG.CELL.BATTERY_DISPLAY_SIZE, CONFIG.CELL.BATTERY_DISPLAY_SIZE);
            battery.setDepth(11); // Above merge grid cells (2) and draggable bg (10)
            
            // Add level text at top of battery
            const levelText = this.add.text(
                cellData.x, 
                cellData.y + CONFIG.CELL.BATTERY_Y_OFFSET + CONFIG.CELL.LEVEL_TEXT_Y_OFFSET, 
                `LVL ${level}`, 
                {
                    fontSize: CONFIG.CELL.LEVEL_TEXT_SIZE,
                    fontFamily: CONFIG.FONT_FAMILY,
                    color: CONFIG.CELL.LEVEL_TEXT_COLOR,
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5);
            levelText.setDepth(12); // Above battery sprite
            
            const batteryData = {
                draggableBg: draggableBg,
                sprite: battery,
                levelText: levelText,
                level: level,
                row: row,
                col: col,
                originalX: cellData.x,
                originalY: cellData.y + CONFIG.CELL.BATTERY_Y_OFFSET,
                inGrid: true,
                inChargingSlot: false
            };
            
            draggableBg.setData('batteryData', batteryData);
            
            this.batteries.push(batteryData);
            this.grid[row][col] = batteryData;
            
            // Show filled background
            cellData.filledBg.setVisible(true);
            cellData.isEmpty = false;
            
            // Squash & Stretch animation with overshoot and settle
            this.playSpawnAnimation(batteryData);
            
            return batteryData;
        }

        playSpawnAnimation(batteryData) {
            const { sprite, levelText } = batteryData;
            const baseSize = CONFIG.CELL.BATTERY_DISPLAY_SIZE;
            const anim = CONFIG.SPAWN_ANIMATION;
            
            // Start from squashed state (wide and short)
            sprite.setDisplaySize(baseSize * anim.INITIAL_SCALE_X, baseSize * anim.INITIAL_SCALE_Y);
            levelText.setScale(anim.INITIAL_SCALE_X, anim.INITIAL_SCALE_Y);
            
            // Animate sprite with squash & stretch using chained tweens
            // Phase 1: Overshoot stretch (tall and narrow)
            this.tweens.add({
                targets: sprite,
                displayWidth: baseSize * anim.STRETCH_SCALE_X,
                displayHeight: baseSize * anim.STRETCH_SCALE_Y,
                duration: anim.STRETCH_DURATION,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Phase 2: Slight opposite bounce (squash again but less)
                    this.tweens.add({
                        targets: sprite,
                        displayWidth: baseSize * anim.BOUNCE_SCALE_X,
                        displayHeight: baseSize * anim.BOUNCE_SCALE_Y,
                        duration: anim.BOUNCE_DURATION,
                        ease: 'Cubic.easeInOut',
                        onComplete: () => {
                            // Phase 3: Settle to normal scale
                            this.tweens.add({
                                targets: sprite,
                                displayWidth: baseSize,
                                displayHeight: baseSize,
                                duration: anim.SETTLE_DURATION,
                                ease: 'Cubic.easeOut'
                            });
                        }
                    });
                }
            });
            
            // Animate level text with same squash & stretch pattern
            // Phase 1: Overshoot stretch
            this.tweens.add({
                targets: levelText,
                scaleX: anim.STRETCH_SCALE_X,
                scaleY: anim.STRETCH_SCALE_Y,
                duration: anim.STRETCH_DURATION,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Phase 2: Slight opposite bounce
                    this.tweens.add({
                        targets: levelText,
                        scaleX: anim.BOUNCE_SCALE_X,
                        scaleY: anim.BOUNCE_SCALE_Y,
                        duration: anim.BOUNCE_DURATION,
                        ease: 'Cubic.easeInOut',
                        onComplete: () => {
                            // Phase 3: Settle to normal scale
                            this.tweens.add({
                                targets: levelText,
                                scaleX: 1.0,
                                scaleY: 1.0,
                                duration: anim.SETTLE_DURATION,
                                ease: 'Cubic.easeOut'
                            });
                        }
                    });
                }
            });
        }

        onDragStart(pointer, gameObject) {
            if (!gameObject.getData('batteryData')) return;
            
            const batteryData = gameObject.getData('batteryData');
            this.draggingBattery = batteryData;
            
            // If dragging from charging slot, immediately stop its contribution to charging
            if (batteryData.inChargingSlot) {
                const slotIndex = batteryData.slotIndex;
                const slot = this.chargingSlotsUI[slotIndex];
                
                // Remove from charging system
                this.chargingSlots[slotIndex] = null;
                
                // Hide charge rate text
                slot.chargeText.setVisible(false);
                
                // Switch to OFF sprite (no battery in slot)
                slot.switchSprite.setTexture('charger_off');
                
                // Toggle drop zone appearance (show empty, hide filled)
                slot.dropZoneEmpty.setVisible(true);
                slot.dropZoneFilled.setVisible(false);
                
                // Keep charger normal appearance (no tint when empty)
                // slot.chargerSprite.clearTint();
                
                // Make bolt grey (not charging)
                slot.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE);
                
                // Update charging system (may stop charging if this was the last battery)
                this.updateChargingSystem();
            }
            
            // Bring to front with very high depth (above both scenes)
            if (batteryData.draggableBg) {
                batteryData.draggableBg.setDepth(10000);
            }
            batteryData.sprite.setDepth(10001);
            batteryData.levelText.setDepth(10002);
            
            // Remove start overlay on first drag (if user drags instead of clicking spawn)
            if (this.startOverlay) {
                this.removeStartOverlay();
            }
        }

        onDrag(pointer, gameObject, dragX, dragY) {
            if (!gameObject.getData('batteryData')) return;
            
            const batteryData = gameObject.getData('batteryData');
            
            // Move all battery elements together (draggableBg, sprite, and text)
            if (batteryData.draggableBg) {
                batteryData.draggableBg.x = dragX;
                batteryData.draggableBg.y = dragY;
            }
            batteryData.sprite.x = dragX;
            batteryData.sprite.y = dragY;
            batteryData.levelText.setPosition(dragX, dragY + CONFIG.CELL.LEVEL_TEXT_Y_OFFSET);
            
            // Check if battery left original cell (for grid items)
            if (batteryData.inGrid) {
                const cellData = this.gridCells[batteryData.row][batteryData.col];
                const bounds = new Phaser.Geom.Rectangle(
                    cellData.x - this.CELL_SIZE / 2,
                    cellData.y - this.CELL_SIZE / 2,
                    this.CELL_SIZE,
                    this.CELL_SIZE
                );
                
                if (!Phaser.Geom.Rectangle.Contains(bounds, dragX, dragY)) {
                    cellData.filledBg.setVisible(false);
                } else {
                    cellData.filledBg.setVisible(true);
                }
            }
            
            // Note: For charging slots, the slot remains empty during drag
            // Battery only contributes to charging when dropped/placed
        }

        onDragEnd(pointer, gameObject) {
            if (!gameObject.getData('batteryData')) return;
            
            const batteryData = gameObject.getData('batteryData');
            const dropX = batteryData.sprite.x;
            const dropY = batteryData.sprite.y;
            
            // Check if dropped on charging slot
            let droppedOnChargingSlot = false;
            for (let i = 0; i < this.chargingSlotsUI.length; i++) {
                const slot = this.chargingSlotsUI[i];
                const bounds = new Phaser.Geom.Rectangle(
                    slot.x - 50,
                    slot.y - 50,
                    100,
                    100
                );
                
                if (Phaser.Geom.Rectangle.Contains(bounds, dropX, dropY)) {
                    // Handle drop on charging slot
                    this.handleDropOnChargingSlot(i, batteryData);
                    droppedOnChargingSlot = true;
                    break;
                }
            }
            
            if (!droppedOnChargingSlot) {
                // Find which grid cell was dropped on
                let targetCell = null;
                for (let row = 0; row < this.GRID_ROWS; row++) {
                    for (let col = 0; col < this.GRID_COLS; col++) {
                        const cellData = this.gridCells[row][col];
                        const bounds = new Phaser.Geom.Rectangle(
                            cellData.x - this.CELL_SIZE / 2,
                            cellData.y - this.CELL_SIZE / 2,
                            this.CELL_SIZE,
                            this.CELL_SIZE
                        );
                        
                        if (Phaser.Geom.Rectangle.Contains(bounds, dropX, dropY)) {
                            targetCell = { row, col, cellData };
                            break;
                        }
                    }
                    if (targetCell) break;
                }
                
                if (targetCell) {
                    this.handleDrop(batteryData, targetCell);
                } else {
                    // Return to original position
                    this.returnBatteryToPosition(batteryData);
                }
            }
            
            this.draggingBattery = null;
        }

        handleDropOnChargingSlot(slotIndex, batteryData) {
            const targetSlotData = this.chargingSlots[slotIndex];
            
            if (targetSlotData === null) {
                // Empty slot - move battery to slot
                this.moveBatteryToChargingSlot(batteryData, slotIndex);
            } else if (batteryData.inChargingSlot && batteryData.slotIndex === slotIndex) {
                // Same slot - return to position
                this.returnBatteryToPosition(batteryData);
            } else if (targetSlotData.batteryData.level === batteryData.level) {
                // Same level - merge in charging slot
                this.mergeBatteriesInChargingSlot(batteryData, targetSlotData.batteryData, slotIndex);
            } else {
                // Different level - swap
                this.swapBatteryWithChargingSlot(batteryData, targetSlotData.batteryData, slotIndex);
            }
        }

        handleDrop(batteryData, targetCell) {
            const targetBattery = this.grid[targetCell.row][targetCell.col];
            
            if (targetBattery === null) {
                // Empty cell - move battery
                this.moveBattery(batteryData, targetCell.row, targetCell.col);
            } else if (targetBattery === batteryData) {
                // Same cell - return to position
                this.returnBatteryToPosition(batteryData);
            } else if (targetBattery.level === batteryData.level) {
                // Same level - merge
                this.mergeBatteries(batteryData, targetBattery, targetCell.row, targetCell.col);
            } else {
                // Different level - swap
                this.swapBatteries(batteryData, targetBattery);
            }
        }

        moveBattery(batteryData, newRow, newCol) {
            // Clear old position
            if (batteryData.inGrid) {
                this.grid[batteryData.row][batteryData.col] = null;
                this.gridCells[batteryData.row][batteryData.col].filledBg.setVisible(false);
                this.gridCells[batteryData.row][batteryData.col].isEmpty = true;
            } else if (batteryData.inChargingSlot) {
                // Remove from charging slot
                this.chargingSlots[batteryData.slotIndex] = null;
                const slot = this.chargingSlotsUI[batteryData.slotIndex];
                slot.chargeText.setVisible(false);
                slot.batterySprite = null;
                slot.batteryLevelText = null;
                
                // Switch to OFF sprite (no battery in slot)
                slot.switchSprite.setTexture('charger_off');
                
                // Toggle drop zone appearance (show empty, hide filled)
                slot.dropZoneEmpty.setVisible(true);
                slot.dropZoneFilled.setVisible(false);
                
                // Keep charger normal appearance (no tint when empty)
                // slot.chargerSprite.clearTint();
                
                // Make bolt grey (not charging)
                slot.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE);
                
                this.updateChargingSystem();
            }
            
            // Update position
            batteryData.row = newRow;
            batteryData.col = newCol;
            batteryData.inGrid = true;
            batteryData.inChargingSlot = false;
            this.grid[newRow][newCol] = batteryData;
            
            // Add to batteries array if not already there
            if (!this.batteries.includes(batteryData)) {
                this.batteries.push(batteryData);
            }
            
            const cellData = this.gridCells[newRow][newCol];
            batteryData.originalX = cellData.x;
            batteryData.originalY = cellData.y + CONFIG.CELL.BATTERY_Y_OFFSET;
            
            // Animate to new position
            this.returnBatteryToPosition(batteryData);
            
            // Show filled background
            cellData.filledBg.setVisible(true);
            cellData.isEmpty = false;
        }

        mergeBatteries(draggedBattery, targetBattery, targetRow, targetCol) {
            // Remove merge tutorial animation on first merge
            if (this.mergePointer) {
                this.removeMergeTutorial();
            }
            
            // Remove dragged battery
            this.removeBattery(draggedBattery);
            
            // Remove target battery
            this.removeBattery(targetBattery);
            
            // Create new battery at target position with level + 1
            const newLevel = targetBattery.level + 1;
            this.spawnBatteryInGrid(targetRow, targetCol, newLevel);
            
            // Update highest level
            if (newLevel > this.highestBatteryLevel) {
                this.highestBatteryLevel = newLevel;
                this.updateSpawnButton();
            }
            
            // Merge animation effect
            this.createMergeEffect(this.gridCells[targetRow][targetCol].x, this.gridCells[targetRow][targetCol].y);
        }

        swapBatteries(battery1, battery2) {
            const row1 = battery1.row;
            const col1 = battery1.col;
            const row2 = battery2.row;
            const col2 = battery2.col;
            
            // Swap in grid
            this.grid[row1][col1] = battery2;
            this.grid[row2][col2] = battery1;
            
            // Update positions
            battery1.row = row2;
            battery1.col = col2;
            battery1.originalX = this.gridCells[row2][col2].x;
            battery1.originalY = this.gridCells[row2][col2].y + CONFIG.CELL.BATTERY_Y_OFFSET;
            
            battery2.row = row1;
            battery2.col = col1;
            battery2.originalX = this.gridCells[row1][col1].x;
            battery2.originalY = this.gridCells[row1][col1].y + CONFIG.CELL.BATTERY_Y_OFFSET;
            
            // Animate both
            this.returnBatteryToPosition(battery1);
            this.returnBatteryToPosition(battery2);
        }

        moveBatteryToChargingSlot(batteryData, slotIndex) {
            // Save the car assignment from the target slot before clearing it
            const preserveAssignedCar = this.chargingSlots[slotIndex] ? this.chargingSlots[slotIndex].assignedCar : null;
            
            // Clear old position
            if (batteryData.inGrid) {
                this.removeBattery(batteryData);
            } else if (batteryData.inChargingSlot) {
                // Remove from old charging slot
                this.chargingSlots[batteryData.slotIndex] = null;
                const oldSlot = this.chargingSlotsUI[batteryData.slotIndex];
                oldSlot.chargeText.setVisible(false);
                oldSlot.batterySprite = null;
                oldSlot.batteryLevelText = null;
                
                // Switch to OFF sprite (no battery in old slot)
                oldSlot.switchSprite.setTexture('charger_off');
                
                // Toggle drop zone appearance (show empty, hide filled)
                oldSlot.dropZoneEmpty.setVisible(true);
                oldSlot.dropZoneFilled.setVisible(false);
                
                // Keep charger normal appearance (no tint)
                // oldSlot.chargerSprite.clearTint();
                
                // Make old bolt grey (not charging)
                oldSlot.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE);
                
                // Destroy old sprites to prevent duplicates
                if (batteryData.sprite) {
                    batteryData.sprite.destroy();
                }
                if (batteryData.levelText) {
                    batteryData.levelText.destroy();
                }
            }
            
            // Add to new charging slot, preserving car assignment
            this.addBatteryToSlot(slotIndex, batteryData.level, preserveAssignedCar);
        }

        swapBatteryWithChargingSlot(battery1, battery2, slotIndex) {
            // battery1 is being dragged, battery2 is in charging slot at slotIndex
            
            if (battery1.inGrid) {
                // Swap grid battery with charging slot battery
                const row1 = battery1.row;
                const col1 = battery1.col;
                
                // Save the car assignment from the target slot before clearing it
                const preserveAssignedCar = this.chargingSlots[slotIndex] ? this.chargingSlots[slotIndex].assignedCar : null;
                
                // Remove battery1 from grid
                this.removeBattery(battery1);
                
                // Remove battery2 from charging slot (destroy old sprites)
                this.chargingSlots[slotIndex] = null;
                const slot = this.chargingSlotsUI[slotIndex];
                slot.chargeText.setVisible(false);
                slot.batterySprite = null;
                slot.batteryLevelText = null;
                
                // Destroy battery2's charging slot sprites
                if (battery2.sprite) {
                    battery2.sprite.destroy();
                }
                if (battery2.levelText) {
                    battery2.levelText.destroy();
                }
                
                // Create new sprites for battery2 in grid
                battery2.inChargingSlot = false;
                battery2.inGrid = true;
                battery2.row = row1;
                battery2.col = col1;
                
                // Spawn battery in grid (this creates new sprites with draggableBg)
                const newBattery2 = this.spawnBatteryInGrid(row1, col1, battery2.level);
                
                // Add battery1 to charging slot, preserving car assignment
                this.addBatteryToSlot(slotIndex, battery1.level, preserveAssignedCar);
                
            } else if (battery1.inChargingSlot) {
                // Swap two charging slot batteries
                const slot1Index = battery1.slotIndex;
                const slot2Index = slotIndex;
                
                const slot1 = this.chargingSlotsUI[slot1Index];
                const slot2 = this.chargingSlotsUI[slot2Index];
                
                const level1 = battery1.level;
                const level2 = battery2.level;
                
                // Save car assignments before clearing slots
                const preserveCar1 = this.chargingSlots[slot1Index] ? this.chargingSlots[slot1Index].assignedCar : null;
                const preserveCar2 = this.chargingSlots[slot2Index] ? this.chargingSlots[slot2Index].assignedCar : null;
                
                // Clear both slots
                this.chargingSlots[slot1Index] = null;
                this.chargingSlots[slot2Index] = null;
                
                slot1.batterySprite.destroy();
                slot1.batteryLevelText.destroy();
                slot1.chargeText.setVisible(false);
                
                slot2.batterySprite.destroy();
                slot2.batteryLevelText.destroy();
                slot2.chargeText.setVisible(false);
                
                // Add swapped batteries, preserving each slot's car assignment
                this.addBatteryToSlot(slot1Index, level2, preserveCar1);
                this.addBatteryToSlot(slot2Index, level1, preserveCar2);
            }
            
            this.updateChargingSystem();
        }

        mergeBatteriesInChargingSlot(draggedBattery, targetBattery, targetSlotIndex) {
            // Remove merge tutorial animation on first merge
            if (this.mergePointer) {
                this.removeMergeTutorial();
            }
            
            // Remove dragged battery
            if (draggedBattery.inGrid) {
                this.removeBattery(draggedBattery);
            } else if (draggedBattery.inChargingSlot) {
                this.chargingSlots[draggedBattery.slotIndex] = null;
                const slot = this.chargingSlotsUI[draggedBattery.slotIndex];
                
                // Destroy sprites via batteryData references (more reliable)
                if (draggedBattery.sprite) draggedBattery.sprite.destroy();
                if (draggedBattery.levelText) draggedBattery.levelText.destroy();
                if (draggedBattery.draggableBg) draggedBattery.draggableBg.destroy();
                
                slot.chargeText.setVisible(false);
                slot.batterySprite = null;
                slot.batteryLevelText = null;
                
                // Switch to OFF sprite (no battery in slot)
                slot.switchSprite.setTexture('charger_off');
                
                // Toggle drop zone appearance (show empty, hide filled)
                slot.dropZoneEmpty.setVisible(true);
                slot.dropZoneFilled.setVisible(false);
                
                // Keep charger normal appearance (no tint when empty)
                // slot.chargerSprite.clearTint();
                
                // Make bolt grey (not charging)
                slot.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE);
            }
            
            // Save car assignment before removing battery from charging slot
            const preserveAssignedCar = this.chargingSlots[targetSlotIndex] ? this.chargingSlots[targetSlotIndex].assignedCar : null;
            
            // Remove target battery from charging slot
            this.chargingSlots[targetSlotIndex] = null;
            const targetSlot = this.chargingSlotsUI[targetSlotIndex];
            
            // Destroy target sprites
            if (targetBattery.sprite) targetBattery.sprite.destroy();
            if (targetBattery.levelText) targetBattery.levelText.destroy();
            
            targetSlot.chargeText.setVisible(false);
            targetSlot.batterySprite = null;
            targetSlot.batteryLevelText = null;
            
            // Create new battery at target slot with level + 1, preserving car assignment
            const newLevel = targetBattery.level + 1;
            this.addBatteryToSlot(targetSlotIndex, newLevel, preserveAssignedCar);
            
            // Update highest level
            if (newLevel > this.highestBatteryLevel) {
                this.highestBatteryLevel = newLevel;
                this.updateSpawnButton();
            }
            
            // Merge animation effect
            this.createMergeEffect(targetSlot.x, targetSlot.y);
            
            this.updateChargingSystem();
        }

        removeBattery(batteryData) {
            // Remove from grid
            if (batteryData.inGrid) {
                this.grid[batteryData.row][batteryData.col] = null;
                this.gridCells[batteryData.row][batteryData.col].filledBg.setVisible(false);
                this.gridCells[batteryData.row][batteryData.col].isEmpty = true;
            }
            
            // Remove from charging slot
            if (batteryData.inChargingSlot) {
                this.chargingSlots[batteryData.slotIndex] = null;
                const slot = this.chargingSlotsUI[batteryData.slotIndex];
                slot.chargeText.setVisible(false);
                slot.batterySprite = null;
                slot.batteryLevelText = null;
                
                // Switch to OFF sprite (no battery in slot)
                slot.switchSprite.setTexture('charger_off');
                
                // Toggle drop zone appearance (show empty, hide filled)
                slot.dropZoneEmpty.setVisible(true);
                slot.dropZoneFilled.setVisible(false);
                
                // Keep charger normal appearance (no tint when empty)
                // slot.chargerSprite.clearTint();
                
                // Make bolt grey (not charging)
                slot.boltSprite.setTint(CONFIG.EV_CHARGER.BOLT_COLOR_INACTIVE);
                
                this.updateChargingSystem();
            }
            
            // Remove from batteries array
            const index = this.batteries.indexOf(batteryData);
            if (index > -1) {
                this.batteries.splice(index, 1);
            }
            
            // Destroy all elements
            if (batteryData.draggableBg) {
                batteryData.draggableBg.destroy();
            }
            batteryData.sprite.destroy();
            batteryData.levelText.destroy();
        }

        returnBatteryToPosition(batteryData) {
            // Reset depths to proper values (above grid cells)
            if (batteryData.draggableBg) {
                batteryData.draggableBg.setDepth(10); // Above grid cells (2)
            }
            batteryData.sprite.setDepth(11); // Above draggable bg (10)
            batteryData.levelText.setDepth(12); // Above sprite (11)
            
            // Calculate appropriate scale based on location
            let targetScale = 1; // Default for grid cells
            let targetBatterySize = CONFIG.CELL.BATTERY_DISPLAY_SIZE; // Default for grid cells
            
            if (batteryData.inChargingSlot) {
                // Scale down to fit in drop zone
                const dropZoneScale = CONFIG.EV_CHARGER.DROP_ZONE_SIZE / CONFIG.CELL.SIZE;
                targetScale = dropZoneScale;
                targetBatterySize = CONFIG.CELL.BATTERY_DISPLAY_SIZE * dropZoneScale;
            }
            
            // Apply scale to battery sprite
            batteryData.sprite.setDisplaySize(targetBatterySize, targetBatterySize);
            
            // Apply scale to level text
            batteryData.levelText.setScale(targetScale);
            
            // If battery is in grid, ensure background is visible
            if (batteryData.inGrid) {
                this.gridCells[batteryData.row][batteryData.col].filledBg.setVisible(true);
                this.gridCells[batteryData.row][batteryData.col].isEmpty = false;
            }
            
            // If battery is in charging slot, re-add to charging system
            if (batteryData.inChargingSlot) {
                const slotIndex = batteryData.slotIndex;
                const slot = this.chargingSlotsUI[slotIndex];
                const chargePerMinute = getBatteryChargeValue(batteryData.level);
                
                // Re-add to charging slots
                this.chargingSlots[slotIndex] = {
                    level: batteryData.level,
                    chargePerMinute: chargePerMinute,
                    batteryData: batteryData
                };
                
                // Show UI
                slot.chargeText.setText(`${chargePerMinute}`);
                slot.chargeText.setVisible(true);
                
                // Update charging system
                this.updateChargingSystem();
            }
            
            // Animate draggable background back to original position (cell center)
            if (batteryData.draggableBg) {
                this.tweens.add({
                    targets: batteryData.draggableBg,
                    x: batteryData.originalX,
                    y: batteryData.originalY - CONFIG.CELL.BATTERY_Y_OFFSET,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
            }
            
            // Animate back to original position
            this.tweens.add({
                targets: batteryData.sprite,
                x: batteryData.originalX,
                y: batteryData.originalY,
                duration: 200,
                ease: 'Back.easeOut'
            });
            
            this.tweens.add({
                targets: batteryData.levelText,
                x: batteryData.originalX,
                y: batteryData.originalY + CONFIG.CELL.LEVEL_TEXT_Y_OFFSET,
                duration: 200,
                ease: 'Back.easeOut'
            });
        }
        
        createMergeEffect(x, y) {
            // Particle burst effect
            const circle = this.add.circle(x, y, 50, 0xFFFFFF, 0.8);
            this.tweens.add({
                targets: circle,
                scaleX: 2,
                scaleY: 2,
                alpha: 0,
                duration: 300,
                onComplete: () => circle.destroy()
            });
        }

        updateSpawnButton() {
            // Update spawn button based on highest level
            if (this.highestBatteryLevel >= 9) {
                const newButtonLevel = this.highestBatteryLevel - 7; // 9->2, 10->3, 11->4
                if (newButtonLevel > this.spawnButtonLevel) {
                    this.spawnButtonLevel = newButtonLevel;
                    this.spawnCost = newButtonLevel * 10;
                    this.spawnButtonText.setText(`${this.spawnCost}`);
                    
                    // Update battery icon texture to match new level
                    const batteryIconLevel = getBatteryIconLevel(this.spawnButtonLevel);
                    this.spawnButtonIcon.setTexture(`battery${batteryIconLevel}`);
                }
            }
            
            // Disable button if not enough coins
            if (this.coins < this.spawnCost) {
                this.spawnButtonBg.setTint(0x888888);
                this.spawnButtonBg.disableInteractive();
            } else {
                this.spawnButtonBg.clearTint();
                this.spawnButtonBg.setInteractive({ useHandCursor: true });
            }
        }

        checkLevelUpTimer() {
            if (!this.hasStartedPlaying) return;
            
            const currentTime = this.time.now;
            
            // If button is visible, check if 30 seconds have passed
            if (this.levelUpButtonVisible && this.levelUpButtonShowTime) {
                const elapsedVisible = currentTime - this.levelUpButtonShowTime;
                if (elapsedVisible >= 30000) { // Hide after 30 seconds
                    this.levelUpButton.setVisible(false);
                    this.levelUpButtonVisible = false;
                    this.levelUpButtonBg.setAlpha(0.5);
                    // Stop pulse animation
                    this.tweens.killTweensOf(this.levelUpButton);
                    this.levelUpButton.setScale(1); // Reset scale
                    // Start hidden period
                    this.levelUpTimer = currentTime;
                }
            }
            // If button is hidden, check if it's time to show it
            else if (!this.levelUpButtonVisible && this.levelUpTimer) {
                const elapsed = currentTime - this.levelUpTimer;
                const waitTime = this.firstLevelUpTimer ? 20000 : 30000; // 20s first, then 30s
                
                if (elapsed >= waitTime) {
                    this.levelUpButton.setVisible(true);
                    this.levelUpButtonVisible = true;
                    this.levelUpButtonBg.setAlpha(1);
                    this.levelUpButtonShowTime = currentTime;
                    this.firstLevelUpTimer = false; // After first time, use 30s
                    
                    // Start pulse animation (scale up and down by 10%)
                    this.tweens.add({
                        targets: this.levelUpButton,
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 300,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
        }

        levelUpAll() {
            // Upgrade all batteries in grid
            this.batteries.forEach(battery => {
                if (battery.inGrid) {
                    battery.level += 1;
                    battery.levelText.setText(`LVL ${battery.level}`);
                    
                    // Update battery sprite to match new level
                    const batteryIconLevel = getBatteryIconLevel(battery.level);
                    const batteryIcon = `battery${batteryIconLevel}`;
                    battery.sprite.setTexture(batteryIcon);
                    
                    // Update highest level
                    if (battery.level > this.highestBatteryLevel) {
                        this.highestBatteryLevel = battery.level;
                    }
                }
            });
            
            // Upgrade batteries in charging slots
            for (let i = 0; i < 3; i++) {
                if (this.chargingSlots[i] !== null) {
                    const slot = this.chargingSlotsUI[i];
                    const slotData = this.chargingSlots[i];
                    const newLevel = slotData.level + 1;
                    
                    // Update slot data
                    slotData.level = newLevel;
                    slotData.chargePerMinute = getBatteryChargeValue(newLevel);
                    
                    // Update batteryData if it exists
                    if (slotData.batteryData) {
                        slotData.batteryData.level = newLevel;
                    }
                    
                    // Update battery sprite to match new level
                    const batteryIconLevel = getBatteryIconLevel(newLevel);
                    const batteryIcon = `battery${batteryIconLevel}`;
                    if (slot.batterySprite) {
                        slot.batterySprite.setTexture(batteryIcon);
                    }
                    
                    // Update UI
                    slot.batteryLevelText.setText(`LVL ${newLevel}`);
                    slot.chargeText.setText(`${getBatteryChargeValue(newLevel)}`);
                }
            }
            
            // Update spawn button
            this.updateSpawnButton();
            
            // Hide button and reset timer
            // Stop pulse animation
            this.tweens.killTweensOf(this.levelUpButton);
            this.levelUpButton.setScale(1); // Reset scale
            this.levelUpButton.setVisible(false);
            this.levelUpButtonVisible = false;
            this.levelUpButtonBg.setAlpha(0.5);
            this.levelUpTimer = this.time.now;
        }

        updateCoinDisplay() {
            this.coinText.setText(`${this.coins}`);
            
            // Update coin icon position to stay next to text
            // Since text is center-aligned (origin 0.5), we need to add half the text width
            const coinIconX = this.coinText.x + this.coinText.width / 2 + CONFIG.COIN_COUNTER.TEXT_ICON_SPACING + CONFIG.COIN_COUNTER.COIN_ICON_WIDTH / 2;
            this.coinIcon.setX(coinIconX);
            
            this.updateSpawnButton();
        }
    }

    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        // backgroundColor: '#EEF5F8',
        backgroundColor: '#7B68EE',
        scene: [GameScene],
        
        physics: {
            default: 'matter',
            matter: {
                debug: CONFIG.PHYSICS.DEBUG,
                gravity: { y: CONFIG.PHYSICS.GRAVITY_Y },
                enableSleeping: false,
                timing: {
                    timestamp: 0,
                    timeScale: 1
                },
                positionIterations: CONFIG.PHYSICS.ITERATIONS,
                velocityIterations: CONFIG.PHYSICS.ITERATIONS,
                constraintIterations: CONFIG.PHYSICS.ITERATIONS
            }
        },

        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 720,
            height: 1280,
            resolution: window.devicePixelRatio || 1,
        },

        render: {
            antialias: true,
            pixelArt: false,
        },
    };

    // Initialize battery image paths cache, then create game instance
    if (typeof window !== 'undefined' && !window.__LEVEL_VIEWER__) {
        initBatteryImagePaths().then(() => {
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            const game = new Phaser.Game(config);
        });
    }
