// Level Editor Scene - Design parking jam levels
class LevelEditorScene extends Phaser.Scene {
    constructor() {
        super('LevelEditorScene');
    }

    init() {
        this.cars = [];               // Array of placed cars {sprite, type, gridRow, gridCol, orientation, width, length}
        this.selectedCar = null;      // Currently selected car
        this.selectedCarType = CONFIG.VEHICLES[0].key; // Current car type from dropdown (uses first vehicle from config)
        this.isDragging = false;
        this.editorBounds = null;     // Top half area bounds
        
        // Get screen dimensions for responsive sizing
        const screenWidth = 720; // From editor config scale.width
        
        // Grid configuration from CONFIG
        this.gridCols = CONFIG.EDITOR.GRID_COLS;
        this.gridRows = CONFIG.EDITOR.GRID_ROWS;
        
        // Calculate dimensions based on screen width and config percentages
        const gridWidthPercent = CONFIG.EDITOR.GRID_WIDTH_PERCENT;
        const zoomFactor = CONFIG.EDITOR.ZOOM_FACTOR;
        const roadWidthCellPercent = CONFIG.EDITOR.ROAD_WIDTH_CELL_PERCENT;
        
        // Calculate grid width from screen width percentage and zoom
        const baseGridWidth = screenWidth * gridWidthPercent;
        const gridWidth = baseGridWidth * zoomFactor;
        
        // Calculate cell size (square cells, determined by columns)
        this.cellSize = gridWidth / this.gridCols;
        
        // Car length in cells
        this.carLength = CONFIG.EDITOR.CAR_LENGTH; // Car occupies 2 cells
        
        // Calculate parking dimensions from grid
        this.parkingWidth = this.gridCols * this.cellSize;
        this.parkingHeight = this.gridRows * this.cellSize;
        
        // Calculate road width as percentage of cell size, with zoom applied
        this.roadWidth = this.cellSize * roadWidthCellPercent;
        
        // Road corner radii (with zoom applied)
        this.roadOuterRadius = CONFIG.EDITOR.ROAD_OUTER_RADIUS * zoomFactor;
        this.roadInnerRadius = CONFIG.EDITOR.ROAD_INNER_RADIUS * zoomFactor;
        this.roadSegmentsPerCorner = CONFIG.EDITOR.ROAD_SEGMENTS_PER_CORNER;
        
        // Grid to track occupied cells (true = occupied, false = empty)
        this.gridOccupied = Array(this.gridRows).fill(null).map(() => Array(this.gridCols).fill(false));
        
        // Colors and transparency
        this.parkingColor = CONFIG.EDITOR.PARKING_COLOR;
        this.parkingAlpha = CONFIG.EDITOR.PARKING_ALPHA;
        this.roadColor = CONFIG.EDITOR.ROAD_COLOR;
        this.roadFillColor = CONFIG.EDITOR.ROAD_FILL_COLOR;
        this.roadFillAlpha = CONFIG.EDITOR.ROAD_FILL_ALPHA;
        
        // Debug log
        console.log('=== EDITOR INIT ===');
        console.log('Screen width:', screenWidth);
        console.log('Grid width percent:', gridWidthPercent);
        console.log('Zoom factor:', zoomFactor);
        console.log('Calculated grid width:', gridWidth);
        console.log('Cell size:', this.cellSize);
        console.log('Road width cell percent:', roadWidthCellPercent);
        console.log('Calculated road width:', this.roadWidth);
        console.log('===================');
    }

    preload() {
        // Load all vehicle sprites dynamically from CONFIG.VEHICLES
        CONFIG.VEHICLES.forEach(vehicle => {
            this.load.image(vehicle.key, `graphics/vehicles/${vehicle.key}.png`);
        });
        
        // Load road sprite
        this.load.image('road', 'graphics/road_80.png');
    }

    create() {
        const sceneWidth = this.cameras.main.width;
        const sceneHeight = this.cameras.main.height;
        
        // Top half is the editor area (parking lot)
        const editorHeight = sceneHeight * 0.5;
        
        // Background for editor area
        this.add.rectangle(sceneWidth / 2, editorHeight / 2, sceneWidth, editorHeight, 0xCCCCCC);
        
        // Store editor bounds
        this.editorBounds = {
            x: 0,
            y: 0,
            width: sceneWidth,
            height: editorHeight
        };
        
        // Title
        this.add.text(sceneWidth / 2, 20, 'PARKING JAM LEVEL EDITOR', {
            fontSize: '28px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Draw parking area and road rectangles
        this.createParkingAndRoad();
        
        // Create UI controls at bottom
        this.createControls();
        
        // Create rotation input panel (hidden by default)
        this.createRotationPanel();
        
        // Setup click handler for deselection
        this.input.on('pointerdown', this.onPointerDown, this);
    }

    createParkingAndRoad() {
        const sceneWidth = this.cameras.main.width;
        const sceneHeight = this.cameras.main.height;
        const editorHeight = sceneHeight * 0.5;
        
        // Center position for parking area (in editor area)
        const centerX = sceneWidth / 2;
        const centerY = editorHeight / 2 + 30; // Slightly below center to account for title
        
        // Calculate road path center line (middle of road)
        const halfParkingW = this.parkingWidth / 2;
        const halfParkingH = this.parkingHeight / 2;
        const roadOffset = this.roadWidth / 2; // Distance from parking edge to road center
        
        // DEBUG
        console.log('=== CREATE PARKING AND ROAD ===');
        console.log('Scene dimensions:', sceneWidth, 'x', sceneHeight);
        console.log('Editor height:', editorHeight);
        console.log('Parking dimensions:', this.parkingWidth, 'x', this.parkingHeight);
        console.log('Road width:', this.roadWidth);
        console.log('Road offset from parking edge:', roadOffset);
        console.log('===============================');
        
        // Create curved path for road center line
        this.roadPath = this.createRoadPath(centerX, centerY, halfParkingW, halfParkingH, roadOffset);
        
        // Draw road using the path
        this.drawRoadWithTexture();
        
        // Draw parking area rectangle
        this.parkingRect = this.add.rectangle(
            centerX,
            centerY,
            this.parkingWidth,
            this.parkingHeight,
            this.parkingColor,
            this.parkingAlpha
        );
        this.parkingRect.setStrokeStyle(CONFIG.EDITOR.PARKING_BORDER_WIDTH, CONFIG.EDITOR.PARKING_BORDER_COLOR);
        this.parkingRect.setDepth(3);
        
        // Draw grid lines
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(CONFIG.EDITOR.GRID_LINE_WIDTH, CONFIG.EDITOR.GRID_LINE_COLOR, CONFIG.EDITOR.GRID_LINE_ALPHA);
        this.gridGraphics.setDepth(4);
        
        const gridStartX = centerX - this.parkingWidth / 2;
        const gridStartY = centerY - this.parkingHeight / 2;
        
        // Draw vertical lines
        for (let col = 0; col <= this.gridCols; col++) {
            const x = gridStartX + col * this.cellSize;
            this.gridGraphics.lineBetween(x, gridStartY, x, gridStartY + this.parkingHeight);
        }
        
        // Draw horizontal lines
        for (let row = 0; row <= this.gridRows; row++) {
            const y = gridStartY + row * this.cellSize;
            this.gridGraphics.lineBetween(gridStartX, y, gridStartX + this.parkingWidth, y);
        }
        
        this.gridGraphics.setDepth(4); // Above parking area
        this.parkingCenterX = centerX;
        this.parkingCenterY = centerY;
        this.gridStartX = gridStartX;
        this.gridStartY = gridStartY;
    }
    
    // Create a path with curved corners around the parking area
    createRoadPath(centerX, centerY, halfW, halfH, offset) {
        const path = new Phaser.Curves.Path();
        
        // Road center line position (distance from parking edge)
        const left = centerX - halfW - offset;
        const right = centerX + halfW + offset;
        const top = centerY - halfH - offset;
        const bottom = centerY + halfH + offset;
        
        // Corner radius should match the road offset to maintain consistent shape
        const radius = offset;
        
        // DEBUG: Show road path parameters
        console.log('=== ROAD PATH DEBUG ===');
        console.log('Parking center:', centerX, centerY);
        console.log('Parking half-size:', halfW, halfH);
        console.log('Road offset:', offset);
        console.log('Road bounds: left=', left, 'right=', right, 'top=', top, 'bottom=', bottom);
        console.log('Corner radius:', radius);
        console.log('=======================');
        
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
        
        // LEFT EDGE - straight line going UP past the top corner
        // Instead of stopping at top + radius, continue upward to create exit path
        // Exit should be 4x cell length beyond the screen boundary for safe exit
        const exitDistance = this.cellSize * 4;
        const exitY = top + radius - exitDistance; // Go up beyond the top
        
        path.lineTo(left, exitY);
        
        // No top-left corner - the path ends with an exit going upward
        
        return path;
    }
    
    // Draw road with texture using Rope game object
    drawRoadWithTexture() {
        // Sample points along the center path
        const numPoints = 150;
        const worldPoints = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const point = this.roadPath.getPoint(t);
            worldPoints.push(point);
        }
        
        // Calculate bounding box to find rope origin
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (let point of worldPoints) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        // Use center of bounding box as rope origin
        const ropeOriginX = (minX + maxX) / 2;
        const ropeOriginY = (minY + maxY) / 2;
        
        // Convert world points to relative points (relative to rope origin)
        const relativePoints = worldPoints.map(p => ({
            x: p.x - ropeOriginX,
            y: p.y - ropeOriginY
        }));
        
        // DEBUG: Show first 10 points and last 10 points
        console.log('=== ROAD ROPE DEBUG ===');
        console.log('Total points:', worldPoints.length);
        console.log('Rope origin (world):', ropeOriginX.toFixed(2), ropeOriginY.toFixed(2));
        console.log('First 10 world points:');
        for (let i = 0; i < Math.min(10, worldPoints.length); i++) {
            console.log(`  Point ${i}: world(${worldPoints[i].x.toFixed(2)}, ${worldPoints[i].y.toFixed(2)}) -> relative(${relativePoints[i].x.toFixed(2)}, ${relativePoints[i].y.toFixed(2)})`);
        }
        console.log('Last 10 world points:');
        for (let i = Math.max(0, worldPoints.length - 10); i < worldPoints.length; i++) {
            console.log(`  Point ${i}: world(${worldPoints[i].x.toFixed(2)}, ${worldPoints[i].y.toFixed(2)}) -> relative(${relativePoints[i].x.toFixed(2)}, ${relativePoints[i].y.toFixed(2)})`);
        }
        
        // Create rope with road texture at the rope origin with relative points
        // Rope points are relative to the rope's x,y position
        this.roadRope = this.add.rope(ropeOriginX, ropeOriginY, 'road', null, relativePoints);
        console.log('>>> Rope created: this.add.rope(' + ropeOriginX.toFixed(2) + ', ' + ropeOriginY.toFixed(2) + ', "road", null, relativePoints)');
        
        // Scale texture to match road width (road_80.png is 80x80 pixels)
        const roadTextureSize = 80; // Size of road_80.png texture
        const textureScale = this.roadWidth / roadTextureSize;
        this.roadRope.setScale(textureScale);
        console.log('Road texture scaled:', {
            textureSize: roadTextureSize,
            roadWidth: this.roadWidth.toFixed(2),
            scale: textureScale.toFixed(3)
        });
        
        // Apply alpha from config (Rope doesn't support tint)
        if (this.roadFillAlpha !== undefined) {
            this.roadRope.setAlpha(this.roadFillAlpha);
        }

        // Set depth above parking area so road is visible
        this.roadRope.setDepth(5);
        
        console.log('Road rope created with', relativePoints.length, 'points, width:', this.roadWidth);
        console.log('Rope position:', ropeOriginX, ropeOriginY);
        console.log('Rope object:', this.roadRope);
        console.log('======================');
        
        // Draw debug points to visualize the road curve (all 150+ points)
        this.drawRoadDebugPoints(worldPoints);
    }
    
    // Draw debug visualization points along the road path
    drawRoadDebugPoints(worldPoints) {
        // Create graphics for debug dots
        this.debugDots = this.add.graphics();
        this.debugDots.setDepth(100); // High depth to be visible above road rope (depth 5)
        
        console.log('Drawing debug points:', worldPoints.length, 'total points');
        
        // Draw all points to visualize the exact curve
        for (let i = 0; i < worldPoints.length; i++) {
            const point = worldPoints[i];
            
            // Every 15th point is larger and red for easy counting
            if (i % 15 === 0) {
                this.debugDots.fillStyle(0xFF0000, 1); // Red, fully opaque
                this.debugDots.fillCircle(point.x, point.y, 5);
            } else {
                // All other points are yellow and smaller
                this.debugDots.fillStyle(0xFFFF00, 0.9); // Yellow, mostly opaque
                this.debugDots.fillCircle(point.x, point.y, 2.5);
            }
        }
        
        console.log('Debug points drawn: all', worldPoints.length, 'points visible above road rope');
    }
    
    redrawParkingAndRoad() {
        // Destroy existing graphics
        if (this.roadRope) this.roadRope.destroy();
        if (this.debugDots) this.debugDots.destroy();
        if (this.parkingRect) this.parkingRect.destroy();
        if (this.gridGraphics) this.gridGraphics.destroy();
        
        // Redraw with updated dimensions
        this.createParkingAndRoad();
    }

    createControls() {
        const sceneWidth = this.cameras.main.width;
        const sceneHeight = this.cameras.main.height;
        const controlY = sceneHeight * 0.5 + 50; // Just below the editor area
        
        // Create HTML dropdown for vehicle selection
        const dropdown = document.createElement('select');
        dropdown.style.position = 'absolute';
        dropdown.style.width = '180px';
        dropdown.style.height = '50px';
        dropdown.style.fontSize = '16px';
        dropdown.style.fontFamily = CONFIG.FONT_FAMILY;
        dropdown.style.fontWeight = 'bold';
        dropdown.style.padding = '10px';
        dropdown.style.border = '3px solid #2E7D32';
        dropdown.style.borderRadius = '5px';
        dropdown.style.backgroundColor = '#4CAF50';
        dropdown.style.color = '#FFFFFF';
        dropdown.style.cursor = 'pointer';
        
        // Add vehicle options dynamically from CONFIG.VEHICLES
        CONFIG.VEHICLES.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.key;
            option.textContent = vehicle.label;
            dropdown.appendChild(option);
        });
        
        // Set default selection to first vehicle
        dropdown.value = CONFIG.VEHICLES[0].key;
        
        // Handle selection changes
        dropdown.addEventListener('change', (e) => {
            this.selectedCarType = e.target.value;
            console.log('Selected vehicle:', this.selectedCarType);
        });
        
        // Add to DOM
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(dropdown);
            
            // Position the dropdown
            const updateDropdownPosition = () => {
                const canvas = this.game.canvas;
                const rect = canvas.getBoundingClientRect();
                dropdown.style.left = (rect.left + 10 * rect.width / sceneWidth) + 'px';
                dropdown.style.top = (rect.top + controlY * rect.height / sceneHeight) + 'px';
            };
            updateDropdownPosition();
            window.addEventListener('resize', updateDropdownPosition);
            
            // Store reference for cleanup
            if (!this.inputElements) this.inputElements = [];
            this.inputElements.push(dropdown);
        }
        
        // Spawn Car button
        const spawnButton = this.add.rectangle(280, controlY, 150, 50, 0x2196F3);
        spawnButton.setStrokeStyle(3, 0x1565C0);
        spawnButton.setInteractive({ useHandCursor: true });
        
        const spawnButtonText = this.add.text(300, controlY, 'SPAWN CAR', {
            fontSize: '18px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        spawnButton.on('pointerdown', () => this.spawnCar());
        
        // Copy Level Data button
        const copyButton = this.add.rectangle(sceneWidth - 120, controlY, 200, 50, 0xFF9800);
        copyButton.setStrokeStyle(3, 0xE65100);
        copyButton.setInteractive({ useHandCursor: true });
        
        const copyButtonText = this.add.text(sceneWidth - 120, controlY, 'COPY LEVEL DATA', {
            fontSize: '18px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        copyButton.on('pointerdown', () => this.copyLevelData());
        
        // Delete Selected button
        const deleteButton = this.add.rectangle(sceneWidth - 120, controlY + 70, 200, 50, 0xF44336);
        deleteButton.setStrokeStyle(3, 0xC62828);
        deleteButton.setInteractive({ useHandCursor: true });
        
        const deleteButtonText = this.add.text(sceneWidth - 120, controlY + 70, 'DELETE SELECTED', {
            fontSize: '18px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        deleteButton.on('pointerdown', () => this.deleteSelectedCar());
        
        // Back to Game button
        const backButton = this.add.rectangle(sceneWidth / 2, sceneHeight - 40, 180, 50, 0x607D8B);
        backButton.setStrokeStyle(3, 0x37474F);
        backButton.setInteractive({ useHandCursor: true });
        
        const backButtonText = this.add.text(sceneWidth / 2, sceneHeight - 40, 'BACK TO GAME', {
            fontSize: '18px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        backButton.on('pointerdown', () => {
            this.scene.stop('LevelEditorScene');
            this.scene.start('GameScene');
        });
        
        // Parking Visibility Toggle button
        this.parkingVisible = true;
        const toggleButton = this.add.rectangle(sceneWidth - 120, controlY + 140, 200, 50, 0x9C27B0);
        toggleButton.setStrokeStyle(3, 0x6A1B9A);
        toggleButton.setInteractive({ useHandCursor: true });
        
        this.toggleButtonText = this.add.text(sceneWidth - 120, controlY + 140, 'HIDE PARKING', {
            fontSize: '18px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        toggleButton.on('pointerdown', () => {
            this.parkingVisible = !this.parkingVisible;
            if (this.parkingRect) {
                this.parkingRect.setVisible(this.parkingVisible);
            }
            if (this.gridGraphics) {
                this.gridGraphics.setVisible(this.parkingVisible);
            }
            this.toggleButtonText.setText(this.parkingVisible ? 'HIDE PARKING' : 'SHOW PARKING');
        });
        
        // Dimension controls (left side below editor area)
        this.createDimensionControls();
    }
    
    createDimensionControls() {
        const sceneWidth = this.cameras.main.width;
        const sceneHeight = this.cameras.main.height;
        const startY = sceneHeight * 0.5 + 280; // Moved down to avoid overlap with rotation panel (at +180)
        const labelX = 60;
        const inputX = 155;
        const lineHeight = 45;
        
        // Title
        this.add.text(labelX, startY - 30, 'GRID & ROAD:', {
            fontSize: '16px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#000000',
            fontStyle: 'bold'
        });
        
        // Grid Columns control
        this.add.text(labelX, startY, 'Grid Cols:', {
            fontSize: '14px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#000000'
        });
        
        const gridColsInput = this.createInput(inputX, startY, this.gridCols, (value) => {
            this.gridCols = Math.max(3, Math.min(100, value));
            
            // Recalculate all dimensions when columns change
            const screenWidth = 720;
            const gridWidthPercent = CONFIG.EDITOR.GRID_WIDTH_PERCENT;
            const zoomFactor = CONFIG.EDITOR.ZOOM_FACTOR;
            const roadWidthCellPercent = CONFIG.EDITOR.ROAD_WIDTH_CELL_PERCENT;
            
            const baseGridWidth = screenWidth * gridWidthPercent;
            const gridWidth = baseGridWidth * zoomFactor;
            this.cellSize = gridWidth / this.gridCols;
            
            this.parkingWidth = this.gridCols * this.cellSize;
            this.parkingHeight = this.gridRows * this.cellSize;
            this.roadWidth = this.cellSize * roadWidthCellPercent;
            
            this.gridOccupied = Array(this.gridRows).fill(null).map(() => Array(this.gridCols).fill(false));
            this.redrawParkingAndRoad();
        });
        
        // Grid Rows control
        this.add.text(labelX, startY + lineHeight, 'Grid Rows:', {
            fontSize: '14px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#000000'
        });
        
        const gridRowsInput = this.createInput(inputX, startY + lineHeight, this.gridRows, (value) => {
            this.gridRows = Math.max(3, Math.min(100, value));
            this.parkingHeight = this.gridRows * this.cellSize;
            this.gridOccupied = Array(this.gridRows).fill(null).map(() => Array(this.gridCols).fill(false));
            this.redrawParkingAndRoad();
        });
        
        // Cell Size is calculated dynamically from grid width and columns
        // Road Width is calculated as a percentage of cell size
        // No UI controls needed - they're automatically calculated
        
        // Road Outer Radius control
        this.add.text(labelX, startY + lineHeight * 2, 'Outer Radius:', {
            fontSize: '14px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#000000'
        });
        
        const outerRadiusInput = this.createInput(inputX, startY + lineHeight * 2, this.roadOuterRadius, (value) => {
            this.roadOuterRadius = Math.max(10, Math.min(200, value));
            this.redrawParkingAndRoad();
        });
        
        // Road Inner Radius control
        this.add.text(labelX, startY + lineHeight * 3, 'Inner Radius:', {
            fontSize: '14px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#000000'
        });
        
        const innerRadiusInput = this.createInput(inputX, startY + lineHeight * 4, this.roadInnerRadius, (value) => {
            this.roadInnerRadius = Math.max(5, Math.min(100, value));
            this.redrawParkingAndRoad();
        });
    }
    
    createInput(x, y, defaultValue, onChange) {
        // Create HTML input element
        const input = document.createElement('input');
        input.type = 'number';
        input.value = defaultValue;
        input.style.position = 'absolute';3
        input.style.left = '0px';
        input.style.top = '0px';
        input.style.width = '80px';
        input.style.height = '30px';
        input.style.fontSize = '14px';
        input.style.padding = '5px';
        input.style.border = '2px solid #333';
        input.style.borderRadius = '4px';
        
        // Add to game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(input);
            
            // Position relative to game
            const updatePosition = () => {
                const canvas = this.game.canvas;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / this.cameras.main.width;
                const scaleY = canvas.height / this.cameras.main.height;
                input.style.left = (rect.left + x * rect.width / this.cameras.main.width) + 'px';
                input.style.top = (rect.top + y * rect.height / this.cameras.main.height) + 'px';
            };
            updatePosition();
            
            // Update position on resize
            window.addEventListener('resize', updatePosition);
            
            // Handle value changes
            input.addEventListener('change', () => {
                const value = parseInt(input.value) || defaultValue;
                input.value = value;
                onChange(value);
            });
            
            // Store reference to destroy later
            if (!this.inputElements) this.inputElements = [];
            this.inputElements.push(input);
        }
        
        return input;
    }

    createRotationPanel() {
        const sceneWidth = this.cameras.main.width;
        const sceneHeight = this.cameras.main.height;
        
        // Panel background
        this.rotationPanel = this.add.container(sceneWidth / 2, sceneHeight * 0.5 + 180);
        this.rotationPanel.setVisible(false);
        this.rotationPanel.setDepth(20); // Above cars (depth 10)
        
        const panelBg = this.add.rectangle(0, 0, 220, 80, 0xFFFFFF);
        panelBg.setStrokeStyle(3, 0x333333);
        this.rotationPanel.add(panelBg);
        
        // Rotation label
        const rotationLabel = this.add.text(0, -15, 'Orientation:', {
            fontSize: '16px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.rotationPanel.add(rotationLabel);
        
        // Rotate 90° button
        const rotateBtn = this.add.rectangle(0, 20, 140, 35, 0x2196F3);
        rotateBtn.setStrokeStyle(2, 0x1565C0);
        rotateBtn.setInteractive({ useHandCursor: true });
        this.rotationPanel.add(rotateBtn);
        
        const rotateBtnText = this.add.text(0, 20, 'Rotate 90°', {
            fontSize: '16px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.rotationPanel.add(rotateBtnText);
        
        // Button handler
        rotateBtn.on('pointerdown', () => this.rotate90Degrees());
    }
    
    rotate90Degrees() {
        if (!this.selectedCar) return;
        
        // Clear old grid position
        this.markGridOccupied(
            this.selectedCar.gridRow, 
            this.selectedCar.gridCol, 
            this.selectedCar.orientation, 
            false, 
            this.selectedCar.width, 
            this.selectedCar.length
        );
        
        // Cycle through orientations: up -> right -> down -> left -> up
        const orientations = ['up', 'right', 'down', 'left'];
        const currentIndex = orientations.indexOf(this.selectedCar.orientation);
        const nextIndex = (currentIndex + 1) % 4;
        this.selectedCar.orientation = orientations[nextIndex];
        
        // Update sprite angle
        this.selectedCar.sprite.angle = this.getRotationAngle(this.selectedCar.orientation);
        
        // Check if car fits in new orientation (anchor stays same)
        if (!this.canPlaceCar(
            this.selectedCar.gridRow, 
            this.selectedCar.gridCol, 
            this.selectedCar.orientation, 
            this.selectedCar.width, 
            this.selectedCar.length
        )) {
            // Doesn't fit, revert orientation
            this.selectedCar.orientation = orientations[currentIndex];
            this.selectedCar.sprite.angle = this.getRotationAngle(this.selectedCar.orientation);
            console.log('Cannot rotate - no space');
        }
        
        // Mark new grid position
        this.markGridOccupied(
            this.selectedCar.gridRow, 
            this.selectedCar.gridCol, 
            this.selectedCar.orientation, 
            true, 
            this.selectedCar.width, 
            this.selectedCar.length
        );
        
        // Recalculate sprite position (center of occupied cells)
        const cells = this.getOccupiedCells(
            this.selectedCar.gridRow, 
            this.selectedCar.gridCol, 
            this.selectedCar.orientation, 
            this.selectedCar.width, 
            this.selectedCar.length
        );
        let sumRow = 0, sumCol = 0;
        for (let cell of cells) {
            sumRow += cell.row;
            sumCol += cell.col;
        }
        const centerRow = sumRow / cells.length;
        const centerCol = sumCol / cells.length;
        
        this.selectedCar.sprite.x = this.gridStartX + centerCol * this.cellSize + this.cellSize / 2;
        this.selectedCar.sprite.y = this.gridStartY + centerRow * this.cellSize + this.cellSize / 2;
        
        console.log('Car orientation:', this.selectedCar.orientation);
    }
    
    updateRotationInputPosition() {
        if (!this.rotationInput || !this.rotationPanel.visible) return;
        
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const sceneWidth = this.cameras.main.width;
        const sceneHeight = this.cameras.main.height;
        
        // Position input at panel center
        const panelX = sceneWidth / 2 + 60;
        const panelY = sceneHeight * 0.5 + 180;
        
        this.rotationInput.style.left = (rect.left + panelX * rect.width / sceneWidth) + 'px';
        // No longer needed - rotation button is part of the panel
    }

    // Parse vehicle dimensions from filename (e.g., "car_1x2" means 1 cell wide, 2 cells long)
    // Width = perpendicular width, Length = how many cells it extends in the direction it faces
    // Sprite is always provided in vertical (up) orientation
    getVehicleDimensions(vehicleType) {
        // First try to find vehicle in CONFIG.VEHICLES
        const vehicleConfig = CONFIG.VEHICLES.find(v => v.key === vehicleType);
        if (vehicleConfig) {
            return {
                width: vehicleConfig.width,
                length: vehicleConfig.length
            };
        }
        
        // Fallback: parse format vehicleName_WxL (e.g., car_1x2 means 1 wide, 2 long) for backward compatibility
        let width = 1;   // Perpendicular width
        let length = 2;  // Extends this many cells in facing direction
        
        const match = vehicleType.match(/_(\d+)x(\d+)$/);
        if (match) {
            width = parseInt(match[1]);   // Perpendicular width
            length = parseInt(match[2]);  // Length (extends in direction)
        }
        
        return { width, length };
    }

    // Get all cells occupied by a vehicle based on its anchor cell and orientation
    // Anchor cell is the rear/bottom of the vehicle
    getOccupiedCells(anchorRow, anchorCol, orientation, width, length) {
        const cells = [];
        
        switch(orientation) {
            case 'up':
                // Car faces up, extends upward from anchor
                for (let i = 0; i < length; i++) {
                    for (let j = 0; j < width; j++) {
                        cells.push({ row: anchorRow - i, col: anchorCol + j });
                    }
                }
                break;
            case 'down':
                // Car faces down, extends downward from anchor
                for (let i = 0; i < length; i++) {
                    for (let j = 0; j < width; j++) {
                        cells.push({ row: anchorRow + i, col: anchorCol + j });
                    }
                }
                break;
            case 'left':
                // Car faces left, extends leftward from anchor
                for (let i = 0; i < length; i++) {
                    for (let j = 0; j < width; j++) {
                        cells.push({ row: anchorRow + j, col: anchorCol - i });
                    }
                }
                break;
            case 'right':
                // Car faces right, extends rightward from anchor
                for (let i = 0; i < length; i++) {
                    for (let j = 0; j < width; j++) {
                        cells.push({ row: anchorRow + j, col: anchorCol + i });
                    }
                }
                break;
        }
        
        return cells;
    }

    // Get sprite rotation angle for each orientation
    getRotationAngle(orientation) {
        const angles = {
            'up': 0,
            'right': 90,
            'down': 180,
            'left': 270
        };
        return angles[orientation] || 0;
    }

    spawnCar() {
        // Get vehicle dimensions from the selected car type name
        const dimensions = this.getVehicleDimensions(this.selectedCarType);
        const { width, length } = dimensions;
        
        // Find center grid position for spawning
        const centerCol = Math.floor(this.gridCols / 2);
        const centerRow = Math.floor(this.gridRows / 2);
        
        // Try to spawn facing up first
        if (this.canPlaceCar(centerRow, centerCol, 'up', width, length)) {
            this.createCarAtGrid(centerRow, centerCol, 'up', width, length);
        } else if (this.canPlaceCar(centerRow, centerCol, 'right', width, length)) {
            // Try right if up doesn't fit
            this.createCarAtGrid(centerRow, centerCol, 'right', width, length);
        } else if (this.canPlaceCar(centerRow, centerCol, 'down', width, length)) {
            // Try down
            this.createCarAtGrid(centerRow, centerCol, 'down', width, length);
        } else if (this.canPlaceCar(centerRow, centerCol, 'left', width, length)) {
            // Try left
            this.createCarAtGrid(centerRow, centerCol, 'left', width, length);
        } else {
            console.log('Cannot spawn car - no space at center');
        }
    }
    
    canPlaceCar(anchorRow, anchorCol, orientation, width, length) {
        // Get all cells this car would occupy
        const cells = this.getOccupiedCells(anchorRow, anchorCol, orientation, width, length);
        
        // Check if all cells are valid and unoccupied
        for (let cell of cells) {
            // Check bounds
            if (cell.row < 0 || cell.row >= this.gridRows || 
                cell.col < 0 || cell.col >= this.gridCols) {
                return false;
            }
            // Check if occupied
            if (this.gridOccupied[cell.row][cell.col]) {
                return false;
            }
        }
        
        return true;
    }
    
    createCarAtGrid(anchorRow, anchorCol, orientation, width, length) {
        // Get all occupied cells
        const cells = this.getOccupiedCells(anchorRow, anchorCol, orientation, width, length);
        
        // Calculate center position as average of all occupied cells
        let sumRow = 0, sumCol = 0;
        for (let cell of cells) {
            sumRow += cell.row;
            sumCol += cell.col;
        }
        const centerRow = sumRow / cells.length;
        const centerCol = sumCol / cells.length;
        
        // Convert to pixel position (center of the averaged cell)
        const carX = this.gridStartX + centerCol * this.cellSize + this.cellSize / 2;
        const carY = this.gridStartY + centerRow * this.cellSize + this.cellSize / 2;
        
        // Create car sprite
        const carSprite = this.add.sprite(carX, carY, this.selectedCarType);
        carSprite.setOrigin(0.5);
        carSprite.setInteractive({ useHandCursor: true, draggable: true });
        
        // Calculate sprite scale to fit in grid cells
        // For a car_1x2 (width=1, length=2), it should fit in 64x128 pixels
        const targetWidth = width * this.cellSize;   // e.g., 1 * 64 = 64px
        const targetHeight = length * this.cellSize; // e.g., 2 * 64 = 128px
        const scaleX = targetWidth / carSprite.width;
        const scaleY = targetHeight / carSprite.height;
        const scale = Math.min(scaleX, scaleY); // Use the smaller scale to fit both dimensions
        carSprite.setScale(scale);
        
        carSprite.setDepth(10);
        carSprite.angle = this.getRotationAngle(orientation);
        
        // Store car data
        const carData = {
            sprite: carSprite,
            type: this.selectedCarType,
            gridRow: anchorRow,      // Anchor cell (rear of car)
            gridCol: anchorCol,
            orientation: orientation,  // 'up', 'down', 'left', 'right'
            width: width,              // Perpendicular width
            length: length             // Length in facing direction
        };
        
        this.cars.push(carData);
        
        // Mark grid cells as occupied
        this.markGridOccupied(anchorRow, anchorCol, orientation, true, width, length);
        
        // Track if car is actually being dragged (to avoid triggering snap on click)
        let wasDragged = false;
        let startX, startY;
        
        // Setup drag handlers
        carSprite.on('dragstart', (pointer) => {
            wasDragged = false;
            startX = carSprite.x;
            startY = carSprite.y;
        });
        
        carSprite.on('drag', (pointer, dragX, dragY) => {
            // Check if moved more than a few pixels (to distinguish from click)
            const distance = Phaser.Math.Distance.Between(startX, startY, dragX, dragY);
            if (distance > 5) {
                wasDragged = true;
            }
            
            // Just move sprite visually during drag
            carSprite.x = dragX;
            carSprite.y = dragY;
        });
        
        carSprite.on('dragend', (pointer) => {
            // Only snap to grid if car was actually dragged
            if (wasDragged) {
                this.snapCarToGrid(carData);
            } else {
                // Not dragged, just clicked - reset position
                carSprite.x = startX;
                carSprite.y = startY;
            }
        });
        
        carSprite.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) return;
            this.selectCar(carData);
        });
        
        // Auto-select the newly spawned car
        this.selectCar(carData);
        
        console.log('Spawned car at anchor:', anchorRow, anchorCol, 'orientation:', orientation, 'dimensions:', width + 'x' + length);
    }
    
    markGridOccupied(anchorRow, anchorCol, orientation, occupied, width, length) {
        const cells = this.getOccupiedCells(anchorRow, anchorCol, orientation, width, length);
        for (let cell of cells) {
            if (cell.row >= 0 && cell.row < this.gridRows && 
                cell.col >= 0 && cell.col < this.gridCols) {
                this.gridOccupied[cell.row][cell.col] = occupied;
            }
        }
    }
    
    snapCarToGrid(carData) {
        // Clear old grid position
        this.markGridOccupied(carData.gridRow, carData.gridCol, carData.orientation, false, carData.width, carData.length);
        
        // Find nearest grid cell to car center
        const relX = carData.sprite.x - this.gridStartX;
        const relY = carData.sprite.y - this.gridStartY;
        
        let nearestCol = Math.floor(relX / this.cellSize);
        let nearestRow = Math.floor(relY / this.cellSize);
        
        // Clamp to valid grid range
        nearestCol = Phaser.Math.Clamp(nearestCol, 0, this.gridCols - 1);
        nearestRow = Phaser.Math.Clamp(nearestRow, 0, this.gridRows - 1);
        
        // Check if car can fit at new anchor position
        if (this.canPlaceCar(nearestRow, nearestCol, carData.orientation, carData.width, carData.length)) {
            // Valid position - update car anchor
            carData.gridRow = nearestRow;
            carData.gridCol = nearestCol;
            this.markGridOccupied(nearestRow, nearestCol, carData.orientation, true, carData.width, carData.length);
        }
        
        // Recalculate pixel position from anchor and occupied cells
        const cells = this.getOccupiedCells(carData.gridRow, carData.gridCol, carData.orientation, carData.width, carData.length);
        let sumRow = 0, sumCol = 0;
        for (let cell of cells) {
            sumRow += cell.row;
            sumCol += cell.col;
        }
        const centerRow = sumRow / cells.length;
        const centerCol = sumCol / cells.length;
        
        carData.sprite.x = this.gridStartX + centerCol * this.cellSize + this.cellSize / 2;
        carData.sprite.y = this.gridStartY + centerRow * this.cellSize + this.cellSize / 2;
    }

    selectCar(carData) {
        // Deselect previous
        if (this.selectedCar) {
            this.selectedCar.sprite.clearTint();
        }
        
        // Select new car
        this.selectedCar = carData;
        this.selectedCar.sprite.setTint(0x88FF88); // Green tint for selected
        
        // Show rotation panel
        this.rotationPanel.setVisible(true);
        
        console.log('Selected car:', carData);
    }

    deselectCar() {
        if (this.selectedCar) {
            this.selectedCar.sprite.clearTint();
            this.selectedCar = null;
            this.rotationPanel.setVisible(false);
        }
    }

    deleteSelectedCar() {
        if (!this.selectedCar) return;
        
        // Clear grid occupation
        this.markGridOccupied(this.selectedCar.gridRow, this.selectedCar.gridCol, this.selectedCar.orientation, false, this.selectedCar.width, this.selectedCar.length);
        
        // Remove from array
        const index = this.cars.indexOf(this.selectedCar);
        if (index > -1) {
            this.cars.splice(index, 1);
        }
        
        // Destroy sprite
        this.selectedCar.sprite.destroy();
        
        // Deselect
        this.selectedCar = null;
        this.rotationPanel.setVisible(false);
        
        console.log('Deleted car. Remaining cars:', this.cars.length);
    }

    onPointerDown(pointer) {
        // Check if clicked outside of any car or UI element
        // This will deselect the current car
        if (!pointer.leftButtonDown()) return;
        
        // Don't deselect if clicking on a car (handled by car's own handler)
        let clickedOnCar = false;
        for (let carData of this.cars) {
            if (carData.sprite.getBounds().contains(pointer.x, pointer.y)) {
                clickedOnCar = true;
                break;
            }
        }
        
        // Deselect if clicked on empty space in editor area
        if (!clickedOnCar && pointer.y < this.editorBounds.height) {
            this.deselectCar();
        }
    }

    copyLevelData() {
        // Generate level data JSON
        const levelData = {
            grid: {
                cols: this.gridCols,
                rows: this.gridRows,
                size_factor: 1.0  // Default size factor (can be adjusted per level)
            },
            parking: {
                color: this.parkingColor,
                alpha: this.parkingAlpha,
                borderColor: CONFIG.EDITOR.PARKING_BORDER_COLOR,
                borderWidth: CONFIG.EDITOR.PARKING_BORDER_WIDTH
            },
            road: {
                // Road width is calculated dynamically based on cellSize and ROAD_WIDTH_FACTOR
                // No need to export it
                color: this.roadColor,
                fillColor: this.roadFillColor,
                fillAlpha: this.roadFillAlpha,
                outerRadius: this.roadOuterRadius,
                innerRadius: this.roadInnerRadius,
                segmentsPerCorner: this.roadSegmentsPerCorner
            },
            cars: this.cars.map(carData => ({
                type: carData.type,
                gridRow: carData.gridRow,
                gridCol: carData.gridCol,
                orientation: carData.orientation,
                width: carData.width,
                length: carData.length,
                chargeRequired: 100 // Default charge required
            }))
        };
        
        const jsonString = JSON.stringify(levelData, null, 2);
        
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(jsonString).then(() => {
                console.log('Level data copied to clipboard!');
                this.showCopyConfirmation();
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback: show data in console
                console.log('Level data:');
                console.log(jsonString);
                alert('Copy failed. Check console for level data.');
            });
        } else {
            // Fallback for browsers without clipboard API
            console.log('Level data:');
            console.log(jsonString);
            alert('Clipboard not available. Check console for level data.');
        }
    }

    showCopyConfirmation() {
        const sceneWidth = this.cameras.main.width;
        const sceneHeight = this.cameras.main.height;
        
        // Show temporary confirmation message
        const confirmText = this.add.text(sceneWidth / 2, sceneHeight * 0.5 - 100, 'COPIED!', {
            fontSize: '48px',
            fontFamily: CONFIG.FONT_FAMILY,
            color: '#4CAF50',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Fade out and destroy
        this.tweens.add({
            targets: confirmText,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                confirmText.destroy();
            }
        });
    }

    // Get a point on the road path at a given progress (0 to 1)
    getPointOnRoadPath(t) {
        if (!this.roadPath) return null;
        return this.roadPath.getPoint(t);
    }
    
    // Get tangent (direction) on the road path at a given progress
    getTangentOnRoadPath(t) {
        if (!this.roadPath) return null;
        return this.roadPath.getTangent(t);
    }
    
    // Get the road path for use in other scenes
    getRoadPathData() {
        if (!this.roadPath) return null;
        
        return {
            centerX: this.parkingCenterX,
            centerY: this.parkingCenterY,
            halfW: this.parkingWidth / 2,
            halfH: this.parkingHeight / 2,
            offset: this.roadWidth / 2,
            outerRadius: this.roadOuterRadius,
            innerRadius: this.roadInnerRadius
        };
    }

    update() {
        // Update logic if needed
    }
    
    shutdown() {
        // Clean up HTML input elements
        if (this.inputElements) {
            this.inputElements.forEach(input => {
                if (input && input.parentElement) {
                    input.parentElement.removeChild(input);
                }
            });
            this.inputElements = [];
        }
    }
}
