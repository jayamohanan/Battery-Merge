    // Single Scene combining Parking Jam (top) and Battery Merge Game (bottom)
    class GameScene extends Phaser.Scene {
        constructor() {
            super('GameScene');
        }

        init() {
            // Parking Jam properties (top half)
            this.cars = [];                     // Array of car objects {sprite, chargeRequired, currentCharge, canMove}
            this.chargingInterval = null;       // Interval for charging
            this.chargingRate = 0;              // Total charging rate (sum of battery values)
            this.chargingEffects = [];          // Visual charging effects
            this.levelData = null;              // Current level data
            this.currentLevelIndex = 0;         // Track which level we're on
            this.allLevelsData = null;          // Store all levels data
            
            // Charging system properties (for parking jam)
            this.chargingSlots = [null, null, null]; // 3 slots for batteries
            this.chargingSlotsUI = [];
            
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
            
            console.log('Parking grid sizes calculated:', {
                screenWidth: sceneWidth,
                parkingGridWidth: parkingGridWidth.toFixed(2),
                defaultParkingCellSize: this.defaultParkingCellSize.toFixed(2),
                roadWidthFactor: this.roadWidthFactor
            });
        }

        preload() {
            // Load battery images with extension fallback (from pre-initialized cache)
            loadBatteryImagesFromCache(this);
            
            this.load.image('coin', 'graphics/coin.svg');
            this.load.image('point', 'graphics/point.png');
            this.load.image('button', 'graphics/Button.png');
            
            // Load parking jam assets
            this.load.image('car', 'graphics/vehicles/car_1x2.png');
            this.load.image('bolt', 'graphics/bolt_64.png');
            this.load.image('road', 'graphics/road_80.png');
            
            // Load level data
            this.load.json('levels', 'levels.json');
        }

        create() {
            // Calculate dynamic sizes for parking grid only
            this.calculateParkingGridSizes();
            
            // Get scene dimensions
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Top half: Parking Jam area (0 to 50%)
            const parkingHeight = sceneHeight * 0.5;
            const parkingBg = this.add.rectangle(sceneWidth / 2, parkingHeight / 2, sceneWidth, parkingHeight, 0xE8F4F8);
            parkingBg.setDepth(0); // Background layer
            
            // Title for parking area
            this.add.text(sceneWidth / 2, 20, 'PARKING JAM', {
                fontSize: '24px',
                fontFamily: CONFIG.FONT_FAMILY,
                color: '#333333',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Bottom half: Merge section background (50% to 100%)
            const mergeBg = this.add.rectangle(sceneWidth / 2, sceneHeight * 0.75, sceneWidth, sceneHeight * 0.5, 0xEEF5F8);
            mergeBg.setDepth(0); // Background layer
            
            // Create 3 charging slots (moved to top of bottom half, just below parking area)
            this.createChargingSlots();
            
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
                    color: '#666666',
                    align: 'center'
                }).setOrigin(0.5);
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
            
            // Position slots at top of bottom half (just below the parking area)
            const slotY = sceneHeight * 0.5 + 80; // Top of bottom half + some padding
            const slotSize = 100; // Same as grid cells
            const slotGap = 15; // Same as grid cell gap
            const totalWidth = 3 * slotSize + 2 * slotGap;
            const startX = (sceneWidth - totalWidth) / 2;
            
            for (let i = 0; i < 3; i++) {
                const slotX = startX + i * (slotSize + slotGap) + slotSize / 2;
                
                // Slot background (rounded rectangle)
                const slotBg = this.add.graphics();
                slotBg.lineStyle(4, 0x6B9BD1, 1);
                slotBg.strokeRoundedRect(
                    slotX - slotSize / 2,
                    slotY - slotSize / 2,
                    slotSize,
                    slotSize,
                    15
                );
                
                // Slot filled background (hidden initially)
                const slotFilledBg = this.add.graphics();
                slotFilledBg.fillStyle(0x8BC6EC, 1);
                slotFilledBg.fillRoundedRect(
                    slotX - slotSize / 2,
                    slotY - slotSize / 2,
                    slotSize,
                    slotSize,
                    15
                );
                slotFilledBg.setVisible(false);
                
                // Charge rate text (above slot, hidden initially)
                const chargeText = this.add.text(slotX, slotY - slotSize / 2 - 20, '', {
                    fontSize: '18px',
                    fontFamily: CONFIG.FONT_FAMILY,
                    color: '#2C5F8D',
                    fontStyle: 'bold'
                }).setOrigin(0.5).setVisible(false);
                
                // Drop zone for batteries
                const dropZone = this.add.zone(slotX, slotY, slotSize, slotSize);
                dropZone.setRectangleDropZone(slotSize, slotSize);
                dropZone.setData('slotIndex', i);
                
                this.chargingSlotsUI.push({
                    x: slotX,
                    y: slotY,
                    slotBg: slotBg,
                    slotFilledBg: slotFilledBg,
                    chargeText: chargeText,
                    dropZone: dropZone,
                    batterySprite: null,
                    batteryLevelText: null
                });
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
        addBatteryToSlot(slotIndex, level) {
            if (slotIndex < 0 || slotIndex >= 3) return;
            if (this.chargingSlots[slotIndex] !== null) {
                // Slot already occupied
                return;
            }
            
            const slot = this.chargingSlotsUI[slotIndex];
            const chargePerMinute = level * 5;
            
            // Determine which battery icon to use (dynamically uses highest available)
            const batteryIconLevel = getBatteryIconLevel(level);
            const batteryIcon = `battery${batteryIconLevel}`;
            
            // Create battery sprite in slot (using same offset as grid cells)
            const batterySprite = this.add.image(slot.x, slot.y + CONFIG.CELL.BATTERY_Y_OFFSET, batteryIcon).setScale(CONFIG.CELL.BATTERY_SCALE);
            
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
            
            // Level text at top (using same offset as grid cells)
            const levelText = this.add.text(slot.x, slot.y + CONFIG.CELL.BATTERY_Y_OFFSET + CONFIG.CELL.LEVEL_TEXT_Y_OFFSET, `LVL ${level}`, {
                fontSize: CONFIG.CELL.LEVEL_TEXT_SIZE,
                fontFamily: CONFIG.FONT_FAMILY,
                color: CONFIG.CELL.LEVEL_TEXT_COLOR,
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Show charge rate
            slot.chargeText.setText(`${chargePerMinute}`);
            slot.chargeText.setVisible(true);
            slot.slotFilledBg.setVisible(true);
            
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
                batteryData: batteryData
            };
            
            // Start charging if this is the first battery
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
            slot.slotFilledBg.setVisible(false);
            
            this.chargingSlots[slotIndex] = null;
            
            // Update charging system
            this.updateChargingSystem();
        }
        
        updateChargingSystem() {
            // Calculate total charging rate from batteries in slots
            this.chargingRate = 0;
            for (let battery of this.chargingSlots) {
                if (battery !== null) {
                    this.chargingRate += battery.level; // Battery level = charge units
                }
            }
        }
        
        // ========== PARKING JAM METHODS ==========
        
        loadLevel(levelData) {
            console.log('Loading level:', levelData);
            
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
            const calculatedCellSize = parkingGridWidth / this.gridConfig.cols;
            
            // Set calculated cellSize
            this.gridConfig.cellSize = calculatedCellSize;
            
            console.log('Parking grid config:', {
                cols: this.gridConfig.cols,
                rows: this.gridConfig.rows,
                levelSizeFactor: levelSizeFactor,
                cellSize: this.gridConfig.cellSize.toFixed(2),
                parkingGridWidth: parkingGridWidth.toFixed(2)
            });
            
            // Initialize grid occupancy tracking (null = empty, car reference = occupied)
            this.gridOccupancy = Array(this.gridConfig.rows).fill(null).map(() => 
                Array(this.gridConfig.cols).fill(null)
            );
            
            // Draw parking and road if they exist in level data
            console.log('Checking parking and road data:', {
                hasParkingData: !!levelData.parking,
                hasRoadData: !!levelData.road,
                parkingData: levelData.parking,
                roadData: levelData.road
            });
            
            if (levelData.parking && levelData.road) {
                console.log('Drawing parking and road...');
                this.drawParkingAndRoad(levelData.parking, levelData.road);
            } else {
                console.warn('Missing parking or road data in level!');
            }
            
            // Spawn cars from level data
            for (let carData of levelData.cars) {
                this.spawnCar(carData);
            }
            
            // Determine which cars can move initially
            this.updateMovableCars();
            
            // Start charging system
            this.startCharging();
        }
        
        drawParkingAndRoad(parkingData, roadData) {
            console.log('=== DRAW PARKING AND ROAD START ===');
            console.log('Parking data:', parkingData);
            console.log('Road data:', roadData);
            
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            const parkingAreaHeight = sceneHeight * 0.5;
            
            console.log('Scene dimensions:', sceneWidth, 'x', sceneHeight);
            console.log('Parking area height:', parkingAreaHeight);
            
            // Center position for parking area (in top half)
            const centerX = sceneWidth / 2;
            const centerY = parkingAreaHeight / 2 + 30; // Slightly below center to account for title
            
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
            
            console.log('Road width calculated:', {
                cellSize: this.gridConfig.cellSize.toFixed(2),
                roadWidthFactor: this.roadWidthFactor,
                calculatedRoadWidth: calculatedRoadWidth.toFixed(2)
            });
            
            // Create curved road path
            const halfW = parkingWidth / 2;
            const halfH = parkingHeight / 2;
            const offset = roadWidth / 2;
            
            this.roadPath = this.createRoadPath(
                centerX, centerY, halfW, halfH, offset
            );
            
            // Draw road using Rope (same as editor)
            // Sample points along the center path - using same method as editor
            const numPoints = 150;
            const worldPoints = [];
            
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const point = this.roadPath.getPoint(t);
                worldPoints.push(point);
            }
            
            console.log('********numPoints for road rope:', numPoints);
            
            // Find bounding box to determine rope origin
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            for (let p of worldPoints) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
            
            // Use center of bounding box as rope origin
            const ropeOriginX = (minX + maxX) / 2;
            const ropeOriginY = (minY + maxY) / 2;
            
            // Convert world points to relative points (relative to rope origin)
            const relativePoints = worldPoints.map(p => ({
                x: p.x - ropeOriginX,
                y: p.y - ropeOriginY
            }));
            
            // Create rope with road texture at the rope origin with relative points
            console.log('=== ROAD ROPE CREATION DEBUG ===');
            console.log('Road texture exists:', this.textures.exists('road'));
            console.log('Road texture key:', 'road');
            console.log('Rope origin:', ropeOriginX.toFixed(2), ropeOriginY.toFixed(2));
            console.log('Points count:', relativePoints.length);
            console.log('First 5 relative points:', relativePoints.slice(0, 5));
            
            this.roadRope = this.add.rope(ropeOriginX, ropeOriginY, 'road', null, relativePoints);
            
            console.log('Rope created:', this.roadRope);
            console.log('Rope visible:', this.roadRope.visible);
            console.log('Rope alpha before set:', this.roadRope.alpha);
            console.log('Rope depth before set:', this.roadRope.depth);
            console.log('Rope scale:', this.roadRope.scaleX, this.roadRope.scaleY);
            
            // Apply alpha from level data (Rope doesn't support tint)
            if (roadData.fillAlpha !== undefined) {
                this.roadRope.setAlpha(roadData.fillAlpha);
                console.log('Rope alpha set to:', roadData.fillAlpha);
            }
            
            // Set depth above parking area so road is visible
            this.roadRope.setDepth(5);
            console.log('Rope depth set to: 5');
            console.log('=== END ROAD ROPE DEBUG ===');
            
            console.log('Road created:', {
                position: { x: ropeOriginX, y: ropeOriginY },
                points: relativePoints.length,
                roadWidth: roadData.width,
                depth: 5,
                alpha: roadData.fillAlpha
            });
            
            // Draw parking area rectangle
            const parkingRect = this.add.rectangle(
                centerX,
                centerY,
                parkingWidth,
                parkingHeight,
                parkingData.color,
                parkingData.alpha
            );
            parkingRect.setStrokeStyle(parkingData.borderWidth, parkingData.borderColor);
            parkingRect.setDepth(3);
            
            console.log('Parking rectangle created:', {
                position: { x: centerX, y: centerY },
                dimensions: { width: parkingWidth, height: parkingHeight },
                depth: 3,
                alpha: parkingData.alpha
            });
            console.log('=== DRAW PARKING AND ROAD COMPLETE ===');
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
            // Fallback: parse from type name
            else {
                const match = carData.type.match(/_(\d+)x(\d+)$/);
                if (match) {
                    width = parseInt(match[1]);
                    length = parseInt(match[2]);
                } else {
                    width = 1;
                    length = 2;
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
            
            // Car object with charging state AND grid position
            const car = {
                sprite: carSprite,
                type: carData.type,
                chargeRequired: carData.chargeRequired || 100,
                currentCharge: 0,
                canMove: false,
                isCharging: false,
                isMovingOut: false,
                // Grid position data
                gridRow: carData.gridRow,
                gridCol: carData.gridCol,
                orientation: orientation,
                width: width,
                length: length,
                occupiedCells: cells
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
            const barWidth = 60;
            const barHeight = 8;
            const offsetY = -40; // Above the car
            
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
            
            // Store references
            car.chargeBarBg = barBg;
            car.chargeBar = chargeBar;
        }

        updateCarChargeBar(car) {
            if (!car.chargeBar) return;
            
            const barWidth = 60;
            const progress = Math.min(car.currentCharge / car.chargeRequired, 1);
            car.chargeBar.width = barWidth * progress;
        }

        updateMovableCars() {
            // Simple logic: determine which cars can move based on collision detection
            // For now, we'll assume the first uncharged car can move
            
            // Reset all canMove flags
            for (let car of this.cars) {
                car.canMove = false;
            }
            
            // Find first car that isn't moving out and isn't fully charged
            for (let car of this.cars) {
                if (!car.isMovingOut) {
                    car.canMove = true;
                    break; // Only one car can be charged/moved at a time
                }
            }
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
            // Use charging rate from batteries in slots
            if (this.chargingRate === 0) return; // No batteries in slots
            
            // Find the car that can be charged
            const carToCharge = this.cars.find(car => car.canMove && !car.isMovingOut);
            
            if (!carToCharge) return;
            
            // Charge the car
            carToCharge.currentCharge += this.chargingRate;
            carToCharge.isCharging = true;
            
            // Update charge bar
            this.updateCarChargeBar(carToCharge);
            
            // Show charging effect
            this.showChargingEffect(carToCharge);
            
            console.log(`Charging car: ${carToCharge.currentCharge}/${carToCharge.chargeRequired}`);
            
            // Check if car is fully charged
            if (carToCharge.currentCharge >= carToCharge.chargeRequired) {
                this.moveOutCar(carToCharge);
            }
        }

        showChargingEffect(car) {
            // Create bolt effect near the car
            const bolt = this.add.sprite(car.sprite.x + 30, car.sprite.y, 'bolt');
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
            
            // Phase 1: Move forward a bit (bump)
            this.tweens.add({
                targets: [car.sprite, car.chargeBar, car.chargeBarBg],
                x: `+=${direction.col * bumpDistance}`,
                y: `+=${direction.row * bumpDistance}`,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    // Add shake effect
                    this.cameras.main.shake(100, 0.005);
                    
                    // Phase 2: Return to original position
                    this.tweens.add({
                        targets: [car.sprite, car.chargeBar, car.chargeBarBg],
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

        moveOutCar(car) {
            console.log('Car fully charged! Moving out...');
            
            car.isCharging = false;
            car.isMovingOut = true;
            
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
            
            // Hide charge bar
            if (car.chargeBar) car.chargeBar.setVisible(false);
            if (car.chargeBarBg) car.chargeBarBg.setVisible(false);
            
            // Calculate how many cells car needs to move to exit parking area
            const stepsToExit = this.calculateStepsToExit(car);
            
            console.log(`Car needs ${stepsToExit} cells to exit parking`);
            
            // If can't move at all, show collision and give up
            if (stepsToExit === 0) {
                console.log('Car is blocked! Showing collision...');
                this.showCollisionAndReturn(car, () => {
                    car.isMovingOut = false;
                    car.isCharging = false;
                    // Restore grid cells since car couldn't leave
                    this.updateCarGridPosition(car);
                    if (car.chargeBar) car.chargeBar.setVisible(true);
                    if (car.chargeBarBg) car.chargeBarBg.setVisible(true);
                });
                return;
            }
            
            // Move continuously to parking exit, then smoothly transition to road
            this.moveCarToExitAndTransition(car, stepsToExit);
        }

        // Calculate steps needed to reach parking boundary in forward direction
        calculateStepsToExit(car) {
            const direction = this.getForwardDirection(car.orientation);
            let steps = 0;
            
            // Keep checking forward until we hit boundary or obstacle
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
                
                // Check if any cell is outside grid (exit point found)
                let hasExitCell = false;
                for (let cell of newCells) {
                    if (cell.row < 0 || cell.row >= this.gridConfig.rows ||
                        cell.col < 0 || cell.col >= this.gridConfig.cols) {
                        hasExitCell = true;
                        break;
                    }
                }
                
                if (hasExitCell) {
                    // Found exit point - return steps to just before exit
                    return Math.max(1, steps - 1);
                }
                
                // Check if path is blocked by another car
                for (let cell of newCells) {
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
            
            return 0; // Shouldn't reach here
        }

        // Move car to parking exit, then smoothly curve onto road
        moveCarToExitAndTransition(car, steps) {
            const direction = this.getForwardDirection(car.orientation);
            const cellSize = this.gridConfig.cellSize;
            
            // Calculate exit position (just at parking boundary)
            const exitDeltaX = direction.col * cellSize * steps;
            const exitDeltaY = direction.row * cellSize * steps;
            const exitX = car.sprite.x + exitDeltaX;
            const exitY = car.sprite.y + exitDeltaY;
            
            // Calculate duration based on constant speed (distance / speed * 1000)
            const distance = steps * cellSize;
            const moveDuration = (distance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;
            
            // Phase 1: Move to parking exit point
            this.tweens.add({
                targets: [car.sprite, car.chargeBar, car.chargeBarBg],
                x: exitX,
                y: exitY,
                duration: moveDuration,
                ease: 'Linear',
                onUpdate: () => {
                    // No need to update grid during exit - cells were already freed when movement started
                },
                onComplete: () => {
                    // Car has left parking area - no grid cells to update
                    
                    console.log('Car reached parking exit, transitioning to road...');
                    
                    // Phase 2: Smoothly curve onto road
                    this.curveOntoRoad(car);
                }
            });
        }

        // Smoothly curve from parking exit onto the road with a natural right turn
        curveOntoRoad(car) {
    if (!this.roadPath) {
        // No road path - just remove the car immediately
        this.removeCar(car);
        return;
    }

    const startX = car.sprite.x;
    const startY = car.sprite.y;
    const startRotation = car.sprite.rotation;

    const forwardDirX = Math.sin(startRotation);
    const forwardDirY = -Math.cos(startRotation);

    // Find closest road point in the forward direction
    let bestT = 0;
    let bestScore = -Infinity;

    for (let t = 0; t <= 1; t += 0.005) {
        const point = this.roadPath.getPoint(t);
        const toPointX = point.x - startX;
        const toPointY = point.y - startY;
        const dist = Math.sqrt(toPointX * toPointX + toPointY * toPointY);

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

    // Debug visualization
    const curveGraphics = this.add.graphics();
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

    const curveLength = turnCurve.getLength();
    const turnDuration = (curveLength / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;

    const follower = { t: 0 };

    this.tweens.add({
        targets: follower,
        t: 1.0,
        duration: turnDuration,
        ease: 'Linear',
        onUpdate: () => {
            const point = turnCurve.getPoint(follower.t);
            car.sprite.x = point.x;
            car.sprite.y = point.y;

            const tangent = turnCurve.getTangent(follower.t);
            car.sprite.rotation = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
        },
        onComplete: () => {
            curveGraphics.destroy();

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

            const remainingPoints = spacedPoints.length - startIndex;
            const remainingDistance = (remainingPoints / spacedPoints.length) * pathLength;
            const pathDuration = (remainingDistance / CONFIG.PARKING_CAR.MAX_SPEED) * 1000;

            const roadFollower = { index: startIndex };

            this.tweens.add({
                targets: roadFollower,
                index: spacedPoints.length - 1,
                duration: pathDuration,
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
                },
                onComplete: () => {
                    // Car has completed road traversal - remove it immediately
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
        
        // Remove car and cleanup
        removeCar(car) {
            // Clear grid occupancy
            if (car.occupiedCells) {
                for (let cell of car.occupiedCells) {
                    if (cell.row >= 0 && cell.row < this.gridConfig.rows &&
                        cell.col >= 0 && cell.col < this.gridConfig.cols) {
                        this.gridOccupancy[cell.row][cell.col] = null;
                    }
                }
            }
            
            car.sprite.destroy();
            if (car.chargeBar) car.chargeBar.destroy();
            if (car.chargeBarBg) car.chargeBarBg.destroy();
            
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

        winLevel() {
            console.log('Level complete!');
            
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
            
            console.log('Loading level', this.currentLevelIndex + 1);
            
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
            }
            this.cars = [];
            
            // Destroy parking lot graphics
            if (this.roadRope) this.roadRope.destroy();
            if (this.parkingRect) this.parkingRect.destroy();
            
            // Reset grid occupancy (will be recreated in loadLevel)
            this.gridOccupancy = null;
        }
        
        // ========== END PARKING JAM METHODS ==========
        
        handleBatteryDrop(gameObject, slotIndex) {
            // Handle battery drop from MergeScene (to be implemented)
            console.log('Battery dropped on slot', slotIndex);
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

        update() {
            // Update logic for merge scene only
            // Vehicle physics removed - now handled by ParkingJamScene
            
            // Check level-up timer
            this.checkLevelUpTimer();
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
            
            // Calculate position: top-right above grid
            const gridWidth = this.GRID_COLS * this.CELL_SIZE + (this.GRID_COLS - 1) * this.CELL_GAP;
            const gridRightX = this.gridStartX + gridWidth - this.CELL_SIZE / 2;
            
            // Position above the top edge of the grid (gridStartY is center of top row cells)
            const gridTopEdge = this.gridStartY - this.CELL_SIZE / 2;
            const coinY = gridTopEdge - CONFIG.COIN_COUNTER.PADDING_FROM_GRID_TOP;
            
            // Coin text (displayed first)
            this.coinText = this.add.text(gridRightX - CONFIG.COIN_COUNTER.OFFSET_FROM_RIGHT, coinY, `${this.coins}`, {
                fontSize: CONFIG.COIN_COUNTER.TEXT_SIZE,
                fontFamily: CONFIG.FONT_FAMILY,
                color: CONFIG.COIN_COUNTER.TEXT_COLOR,
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);  // Right-aligned
            
            // Coin icon (to the right of text)
            const coinIconX = this.coinText.x + CONFIG.COIN_COUNTER.TEXT_ICON_SPACING + CONFIG.COIN_COUNTER.COIN_ICON_WIDTH / 2;
            this.coinIcon = this.add.image(coinIconX, coinY, 'coin');
            this.coinIcon.setDisplaySize(CONFIG.COIN_COUNTER.COIN_ICON_WIDTH, CONFIG.COIN_COUNTER.COIN_ICON_HEIGHT);
        }

        createGrid() {
            const sceneWidth = this.cameras.main.width;
            const sceneHeight = this.cameras.main.height;
            
            // Calculate grid dimensions
            const gridWidth = this.GRID_COLS * this.CELL_SIZE + (this.GRID_COLS - 1) * this.CELL_GAP;
            const gridHeight = this.GRID_ROWS * this.CELL_SIZE + (this.GRID_ROWS - 1) * this.CELL_GAP;
            
            // Calculate grid position: above spawn button with padding
            const buttonY = sceneHeight - CONFIG.BUTTON.BOTTOM_PADDING;
            const gridBottomY = buttonY - CONFIG.BUTTON.SPAWN_HEIGHT / 2 - CONFIG.GRID.PADDING_FROM_BUTTON_TOP;
            const gridStartY = gridBottomY - gridHeight + this.CELL_SIZE / 2;
            
            // Store grid boundaries for coin display
            this.gridStartY = gridStartY;
            this.gridStartX = (sceneWidth - gridWidth) / 2 + this.CELL_SIZE / 2;
            
            for (let row = 0; row < this.GRID_ROWS; row++) {
                this.gridCells[row] = [];
                for (let col = 0; col < this.GRID_COLS; col++) {
                    const x = this.gridStartX + col * (this.CELL_SIZE + this.CELL_GAP);
                    const y = this.gridStartY + row * (this.CELL_SIZE + this.CELL_GAP);
                    
                    // Empty cell background (rounded rectangle)
                    const cell = this.add.graphics();
                    cell.lineStyle(CONFIG.CELL.BORDER_WIDTH, CONFIG.CELL.BORDER_COLOR, 1);
                    cell.strokeRoundedRect(
                        x - this.CELL_SIZE / 2,
                        y - this.CELL_SIZE / 2,
                        this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_RADIUS
                    );
                    
                    // Filled cell background (hidden initially)
                    const filledBg = this.add.graphics();
                    filledBg.fillStyle(CONFIG.CELL.FILLED_BG_COLOR, 1);
                    filledBg.fillRoundedRect(
                        x - this.CELL_SIZE / 2,
                        y - this.CELL_SIZE / 2,
                        this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_RADIUS
                    );
                    filledBg.setVisible(false);
                    
                    this.gridCells[row][col] = {
                        x: x,
                        y: y,
                        row: row,
                        col: col,
                        isEmpty: true,
                        cell: cell,
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
            
            spawnBg.on('pointerdown', () => {
                this.spawnBattery();
            });
            
            this.spawnButton = spawnButton;
            this.spawnButtonBg = spawnBg;
            this.spawnButtonIcon = spawnIcon;  // Store icon reference for updating
            
            // Level-up button (left of spawn button)
            const levelUpButton = this.add.container(sceneWidth / 2 - CONFIG.BUTTON.BUTTON_SPACING, buttonY);
            
            const levelUpBg = this.add.rectangle(0, 0, CONFIG.BUTTON.LEVELUP_WIDTH, CONFIG.BUTTON.LEVELUP_HEIGHT, CONFIG.BUTTON.LEVELUP_COLOR);
            levelUpBg.setStrokeStyle(CONFIG.BUTTON.LEVELUP_BORDER_WIDTH, CONFIG.BUTTON.LEVELUP_BORDER_COLOR);
            levelUpBg.setInteractive({ useHandCursor: true });
            
            const levelUpText = this.add.text(0, 0, '📺 Level Up\nAll', {
                fontSize: '18px',
                fontFamily: CONFIG.FONT_FAMILY,
                align: 'center',
                color: '#FFFFFF',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            levelUpButton.add([levelUpBg, levelUpText]);
            
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
            this.startOverlay = this.add.rectangle(
                sceneWidth / 2,
                sceneHeight / 2,
                sceneWidth,
                sceneHeight,
                0x000000,
                0.6
            );
            
            // Animated pointer (point.png) positioned below button center
            const pointerY = this.spawnButton.y + CONFIG.POINTER.OFFSET_Y;
            const pointer = this.add.image(
                this.spawnButton.x,
                pointerY,
                'point'
            );
            pointer.setScale(CONFIG.POINTER.SCALE);
            pointer.setTint(CONFIG.POINTER.TINT);
            pointer.setOrigin(0.5, 0);  // Origin at top center, so top appears at pointerY
            
            // Click animation: move up and scale down, then back
            this.tweens.add({
                targets: pointer,
                y: pointerY - CONFIG.POINTER.ANIMATION_MOVE_UP,
                scaleX: CONFIG.POINTER.SCALE * CONFIG.POINTER.ANIMATION_SCALE_DOWN,
                scaleY: CONFIG.POINTER.SCALE * CONFIG.POINTER.ANIMATION_SCALE_DOWN,
                duration: CONFIG.POINTER.ANIMATION_DURATION,
                yoyo: CONFIG.POINTER.ANIMATION_YOYO,
                repeat: CONFIG.POINTER.ANIMATION_REPEAT
            });
            
            // Set depths: overlay behind button, pointer on top of everything
            this.startOverlay.setDepth(100);
            this.spawnButton.setDepth(101);  // Button visible above overlay
            pointer.setDepth(102);            // Pointer on top
            
            this.startPointer = pointer;
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
            
            // Create pointer with tip at horizontal center of cells
            const mergePointer = this.add.image(
                cell1X,
                cell1Y,  // Center of cell, not below
                'point'
            );
            mergePointer.setScale(CONFIG.POINTER.SCALE);
            mergePointer.setTint(CONFIG.POINTER.TINT);
            mergePointer.setOrigin(0.5, 0);  // Origin at top center, so tip is at cell center
            mergePointer.setDepth(102); // Above everything else
            
            // Animate pointer from cell 1 to cell 2 horizontally
            // Left to right, then reset and repeat (no yoyo)
            this.tweens.add({
                targets: mergePointer,
                x: cell2X,
                duration: CONFIG.MERGE_TUTORIAL.ANIMATION_DURATION,
                ease: CONFIG.MERGE_TUTORIAL.ANIMATION_EASE,
                yoyo: false,  // Don't go back
                repeat: -1,   // Repeat infinitely
                repeatDelay: 200  // Small pause before repeating (appears, animates, disappears, reappears)
            });
            
            this.mergePointer = mergePointer;
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
                CONFIG.CELL.DRAGGABLE_BG_COLOR, 
                CONFIG.CELL.DRAGGABLE_BG_ALPHA
            );
            draggableBg.setInteractive({
                draggable: true,
                useHandCursor: true
            });
            
            // Create battery sprite (not directly draggable, dragged via draggableBg)
            const battery = this.add.image(cellData.x, cellData.y + CONFIG.CELL.BATTERY_Y_OFFSET, batteryIcon);
            battery.setScale(CONFIG.CELL.BATTERY_SCALE);
            
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
            const baseScale = CONFIG.CELL.BATTERY_SCALE;
            const anim = CONFIG.SPAWN_ANIMATION;
            
            // Start from squashed state (wide and short)
            sprite.setScale(baseScale * anim.INITIAL_SCALE_X, baseScale * anim.INITIAL_SCALE_Y);
            levelText.setScale(anim.INITIAL_SCALE_X, anim.INITIAL_SCALE_Y);
            
            // Animate sprite with squash & stretch using chained tweens
            // Phase 1: Overshoot stretch (tall and narrow)
            this.tweens.add({
                targets: sprite,
                scaleX: baseScale * anim.STRETCH_SCALE_X,
                scaleY: baseScale * anim.STRETCH_SCALE_Y,
                duration: anim.STRETCH_DURATION,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Phase 2: Slight opposite bounce (squash again but less)
                    this.tweens.add({
                        targets: sprite,
                        scaleX: baseScale * anim.BOUNCE_SCALE_X,
                        scaleY: baseScale * anim.BOUNCE_SCALE_Y,
                        duration: anim.BOUNCE_DURATION,
                        ease: 'Cubic.easeInOut',
                        onComplete: () => {
                            // Phase 3: Settle to normal scale
                            this.tweens.add({
                                targets: sprite,
                                scaleX: baseScale,
                                scaleY: baseScale,
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
                
                // Hide charge rate text and filled background
                slot.chargeText.setVisible(false);
                slot.slotFilledBg.setVisible(false);
                
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
                slot.slotFilledBg.setVisible(false);
                slot.chargeText.setVisible(false);
                slot.batterySprite = null;
                slot.batteryLevelText = null;
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
            // Clear old position
            if (batteryData.inGrid) {
                this.removeBattery(batteryData);
            } else if (batteryData.inChargingSlot) {
                // Remove from old charging slot
                this.chargingSlots[batteryData.slotIndex] = null;
                const oldSlot = this.chargingSlotsUI[batteryData.slotIndex];
                oldSlot.slotFilledBg.setVisible(false);
                oldSlot.chargeText.setVisible(false);
                oldSlot.batterySprite = null;
                oldSlot.batteryLevelText = null;
                
                // Destroy old sprites to prevent duplicates
                if (batteryData.sprite) {
                    batteryData.sprite.destroy();
                }
                if (batteryData.levelText) {
                    batteryData.levelText.destroy();
                }
            }
            
            // Add to new charging slot
            this.addBatteryToSlot(slotIndex, batteryData.level);
        }

        swapBatteryWithChargingSlot(battery1, battery2, slotIndex) {
            // battery1 is being dragged, battery2 is in charging slot at slotIndex
            
            if (battery1.inGrid) {
                // Swap grid battery with charging slot battery
                const row1 = battery1.row;
                const col1 = battery1.col;
                
                // Remove battery1 from grid
                this.removeBattery(battery1);
                
                // Remove battery2 from charging slot (destroy old sprites)
                this.chargingSlots[slotIndex] = null;
                const slot = this.chargingSlotsUI[slotIndex];
                slot.slotFilledBg.setVisible(false);
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
                
                // Add battery1 to charging slot
                this.addBatteryToSlot(slotIndex, battery1.level);
                
            } else if (battery1.inChargingSlot) {
                // Swap two charging slot batteries
                const slot1Index = battery1.slotIndex;
                const slot2Index = slotIndex;
                
                const slot1 = this.chargingSlotsUI[slot1Index];
                const slot2 = this.chargingSlotsUI[slot2Index];
                
                const level1 = battery1.level;
                const level2 = battery2.level;
                
                // Clear both slots
                this.chargingSlots[slot1Index] = null;
                this.chargingSlots[slot2Index] = null;
                
                slot1.batterySprite.destroy();
                slot1.batteryLevelText.destroy();
                slot1.slotFilledBg.setVisible(false);
                slot1.chargeText.setVisible(false);
                
                slot2.batterySprite.destroy();
                slot2.batteryLevelText.destroy();
                slot2.slotFilledBg.setVisible(false);
                slot2.chargeText.setVisible(false);
                
                // Add swapped batteries
                this.addBatteryToSlot(slot1Index, level2);
                this.addBatteryToSlot(slot2Index, level1);
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
                
                slot.slotFilledBg.setVisible(false);
                slot.chargeText.setVisible(false);
                slot.batterySprite = null;
                slot.batteryLevelText = null;
            }
            
            // Remove target battery from charging slot
            this.chargingSlots[targetSlotIndex] = null;
            const targetSlot = this.chargingSlotsUI[targetSlotIndex];
            
            // Destroy target sprites
            if (targetBattery.sprite) targetBattery.sprite.destroy();
            if (targetBattery.levelText) targetBattery.levelText.destroy();
            
            targetSlot.slotFilledBg.setVisible(false);
            targetSlot.chargeText.setVisible(false);
            targetSlot.batterySprite = null;
            targetSlot.batteryLevelText = null;
            
            // Create new battery at target slot with level + 1
            const newLevel = targetBattery.level + 1;
            this.addBatteryToSlot(targetSlotIndex, newLevel);
            
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
                slot.slotFilledBg.setVisible(false);
                slot.chargeText.setVisible(false);
                slot.batterySprite = null;
                slot.batteryLevelText = null;
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
            if (batteryData.draggableBg) {
                batteryData.draggableBg.setDepth(0);
            }
            batteryData.sprite.setDepth(1);
            batteryData.levelText.setDepth(2);
            
            // If battery is in grid, ensure background is visible
            if (batteryData.inGrid) {
                this.gridCells[batteryData.row][batteryData.col].filledBg.setVisible(true);
                this.gridCells[batteryData.row][batteryData.col].isEmpty = false;
            }
            
            // If battery is in charging slot, re-add to charging system
            if (batteryData.inChargingSlot) {
                const slotIndex = batteryData.slotIndex;
                const slot = this.chargingSlotsUI[slotIndex];
                const chargePerMinute = batteryData.level * 5;
                
                // Re-add to charging slots
                this.chargingSlots[slotIndex] = {
                    level: batteryData.level,
                    chargePerMinute: chargePerMinute,
                    batteryData: batteryData
                };
                
                // Show UI
                slot.chargeText.setText(`${chargePerMinute}`);
                slot.chargeText.setVisible(true);
                slot.slotFilledBg.setVisible(true);
                
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
            // Log ad loading to console
            console.log('loading ad');
            
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
                    slotData.chargePerMinute = newLevel * 5;
                    
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
                    slot.chargeText.setText(`${newLevel * 5}`);
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
            const coinIconX = this.coinText.x + CONFIG.COIN_COUNTER.TEXT_ICON_SPACING + CONFIG.COIN_COUNTER.COIN_ICON_WIDTH / 2;
            this.coinIcon.setX(coinIconX);
            
            this.updateSpawnButton();
        }
    }

    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        backgroundColor: '#EEF5F8',
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
        console.log('Checking battery image files...');
        initBatteryImagePaths().then(() => {
            console.log('Battery images detected:', BATTERY_IMAGE_PATHS);
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            const game = new Phaser.Game(config);
        });
    }
