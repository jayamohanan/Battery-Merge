/**
 * BATTERY DATA FILE
 * 
 * This file contains all battery definitions for the game.
 * Each battery has:
 * - level: The battery level (1, 2, 3, etc.)
 * - fileName: The sprite file name (can be ANY name like lamp_1.png, suitcase_1.png, etc.)
 * - displayName: The name shown to players (optional, defaults to "Battery {level}")
 * - chargePerMinute: The charge value this battery produces per minute
 * 
 * All sprite files should be placed in: graphics/battery/
 * For example: graphics/battery/lamp_1.png, graphics/battery/suitcase_1.png
 * 
 * You have complete freedom to name your sprites however you want!
 * 
 * EXAMPLES:
 * 
 * Want to use a lamp for level 1?
 *   { level: 1, fileName: 'lamp_1.png', displayName: 'Desk Lamp', chargePerMinute: 5 }
 * 
 * Want to skip level 2 and use a flashlight for level 3?
 *   { level: 3, fileName: 'flashlight_blue.png', displayName: 'Blue Flashlight', chargePerMinute: 11 }
 * 
 * Want to use a suitcase for level 4?
 *   { level: 4, fileName: 'suitcase_1.png', displayName: 'Travel Battery', chargePerMinute: 16 }
 * 
 * The fileName can be ANYTHING - no need to follow Battery1.png, Battery2.png pattern!
 */

var BATTERY_DATA = [
    // Level 1-10: Small batteries
    { level: 1,  fileName: 'battery_1.png',  displayName: 'Battery 1',  chargePerMinute: 5 },
    { level: 2,  fileName: 'battery_2.png',  displayName: 'Battery 2',  chargePerMinute: 7 },
    { level: 3,  fileName: 'battery_3.png',  displayName: 'Battery 3',  chargePerMinute: 11 },
 
    { level: 4,  fileName: 'test_tube_1.png',  displayName: 'Test Tube',  chargePerMinute: 16 },
    { level: 5,  fileName: 'test_tube_2.png',  displayName: 'Test Tube',  chargePerMinute: 25 },
    { level: 6,  fileName: 'test_tube_3.png',  displayName: 'Test Tube',  chargePerMinute: 37 },
 
    { level: 7,  fileName: 'jar_1.png',  displayName: 'Jar',  chargePerMinute: 56 },
    { level: 8,  fileName: 'jar_2.png',  displayName: 'Jar',  chargePerMinute: 85 },
    { level: 9,  fileName: 'jar_3.png',  displayName: 'Jar',  chargePerMinute: 128 },
 
    { level: 10, fileName: 'jug_1.png', displayName: 'Jug', chargePerMinute: 192 },
    { level: 11, fileName: 'jug_2.png', displayName: 'Jug', chargePerMinute: 288 },
    { level: 12, fileName: 'jug_3.png', displayName: 'Jug', chargePerMinute: 432 },

    { level: 13, fileName: 'mango_1.png', displayName: 'Mango', chargePerMinute: 648 },
    { level: 14, fileName: 'mango_2.png', displayName: 'Mango', chargePerMinute: 973 },
    { level: 15, fileName: 'mango_3.png', displayName: 'Mango', chargePerMinute: 1459 },
    
    { level: 16, fileName: 'suitcase_1.png', displayName: 'Suitcase', chargePerMinute: 2189 },
    { level: 17, fileName: 'suitcase_2.png', displayName: 'Suitcase', chargePerMinute: 3284 },
    { level: 18, fileName: 'suitcase_3.png', displayName: 'Suitcase', chargePerMinute: 4926 },
    
    { level: 19, fileName: 'briefcase_1.png', displayName: 'Briefcase', chargePerMinute: 7389 },
    { level: 20, fileName: 'briefcase_2.png', displayName: 'Briefcase', chargePerMinute: 11084 },
    { level: 21, fileName: 'briefcase_3.png', displayName: 'Briefcase', chargePerMinute: 16626 },

    { level: 22, fileName: 'lamp_1.png', displayName: 'Lamp', chargePerMinute: 24939 },
    { level: 23, fileName: 'lamp_2.png', displayName: 'Lamp', chargePerMinute: 37409 },
    { level: 24, fileName: 'lamp_3.png', displayName: 'Lamp', chargePerMinute: 56113 },
    
    { level: 25, fileName: 'Battery25.png', displayName: 'Battery 25', chargePerMinute: 84170 },
    { level: 26, fileName: 'Battery26.png', displayName: 'Battery 26', chargePerMinute: 126000 },
    { level: 27, fileName: 'Battery27.png', displayName: 'Battery 27', chargePerMinute: 189000 },
    
    { level: 28, fileName: 'Battery28.png', displayName: 'Battery 28', chargePerMinute: 284000 },
    { level: 29, fileName: 'Battery29.png', displayName: 'Battery 29', chargePerMinute: 426000 },
    { level: 30, fileName: 'Battery30.png', displayName: 'Battery 30', chargePerMinute: 639000 },

    { level: 31, fileName: 'Battery31.png', displayName: 'Battery 31', chargePerMinute: 959000 },
    { level: 32, fileName: 'Battery32.png', displayName: 'Battery 32', chargePerMinute: 1000000 },     // 1.0M
    { level: 33, fileName: 'Battery33.png', displayName: 'Battery 33', chargePerMinute: 2000000 },     // 2.0M
   
    { level: 34, fileName: 'Battery34.png', displayName: 'Battery 34', chargePerMinute: 3000000 },     // 3.0M
    { level: 35, fileName: 'Battery35.png', displayName: 'Battery 35', chargePerMinute: 5000000 },     // 5.0M
    { level: 36, fileName: 'Battery36.png', displayName: 'Battery 36', chargePerMinute: 7000000 },     // 7.0M
   
    { level: 37, fileName: 'Battery37.png', displayName: 'Battery 37', chargePerMinute: 11000000 },    // 11.0M
    { level: 38, fileName: 'Battery38.png', displayName: 'Battery 38', chargePerMinute: 16000000 },    // 16.0M
    { level: 39, fileName: 'Battery39.png', displayName: 'Battery 39', chargePerMinute: 20000000 },    // 20.0M
  
    { level: 40, fileName: 'Battery40.png', displayName: 'Battery 40', chargePerMinute: 25000000 },    // 25.0M
    { level: 41, fileName: 'Battery41.png', displayName: 'Battery 41', chargePerMinute: 30000000 },    // 30.0M
    { level: 42, fileName: 'Battery42.png', displayName: 'Battery 42', chargePerMinute: 45000000 },    // 45.0M
    
    { level: 43, fileName: 'Battery43.png', displayName: 'Battery 43', chargePerMinute: 55000000 },    // 55.0M
    { level: 44, fileName: 'Battery44.png', displayName: 'Battery 44', chargePerMinute: 60000000 },    // 60.0M
    { level: 45, fileName: 'Battery45.png', displayName: 'Battery 45', chargePerMinute: 69000000 },    // 69.0M
    
    { level: 46, fileName: 'Battery46.png', displayName: 'Battery 46', chargePerMinute: 75000000 },    // 75.0M
    { level: 47, fileName: 'Battery47.png', displayName: 'Battery 47', chargePerMinute: 90000000 },    // 90.0M
    { level: 48, fileName: 'Battery48.png', displayName: 'Battery 48', chargePerMinute: 100000000 },   // 100.0M
    
    { level: 49, fileName: 'Battery49.png', displayName: 'Battery 49', chargePerMinute: 115000000 },   // 115.0M
    { level: 50, fileName: 'Battery50.png', displayName: 'Battery 50', chargePerMinute: 125000000 },   // 125.0M
    { level: 51, fileName: 'Battery51.png', displayName: 'Battery 51', chargePerMinute: 130000000 },   // 130.0M
    
    { level: 52, fileName: 'Battery52.png', displayName: 'Battery 52', chargePerMinute: 140000000 },   // 140.0M
    { level: 53, fileName: 'Battery53.png', displayName: 'Battery 53', chargePerMinute: 150000000 },   // 150.0M
    { level: 54, fileName: 'Battery54.png', displayName: 'Battery 54', chargePerMinute: 18000000 },    // 18.0M
    
    { level: 55, fileName: 'Battery55.png', displayName: 'Battery 55', chargePerMinute: 180000000 },   // 180.0M
    { level: 56, fileName: 'Battery56.png', displayName: 'Battery 56', chargePerMinute: 200000000 },   // 200.0M
    { level: 57, fileName: 'Battery57.png', displayName: 'Battery 57', chargePerMinute: 210000000 },   // 210.0M
    
    { level: 58, fileName: 'Battery58.png', displayName: 'Battery 58', chargePerMinute: 220000000 },   // 220.0M
    { level: 59, fileName: 'Battery59.png', displayName: 'Battery 59', chargePerMinute: 230000000 },   // 230.0M
    { level: 60, fileName: 'Battery60.png', displayName: 'Battery 60', chargePerMinute: 250000000 },   // 250.0M
    
    { level: 61, fileName: 'Battery61.png', displayName: 'Battery 61', chargePerMinute: 260000000 },   // 260.0M
    { level: 62, fileName: 'Battery62.png', displayName: 'Battery 62', chargePerMinute: 270000000 },   // 270.0M
    { level: 63, fileName: 'Battery63.png', displayName: 'Battery 63', chargePerMinute: 285000000 },   // 285.0M

    { level: 64, fileName: 'Battery64.png', displayName: 'Battery 64', chargePerMinute: 300000000 },   // 300.0M
    { level: 65, fileName: 'Battery65.png', displayName: 'Battery 65', chargePerMinute: 315000000 },   // 315.0M
    { level: 66, fileName: 'Battery66.png', displayName: 'Battery 66', chargePerMinute: 330000000 },   // 330.0M

    { level: 67, fileName: 'Battery67.png', displayName: 'Battery 67', chargePerMinute: 350000000 },   // 350.0M
    { level: 68, fileName: 'Battery68.png', displayName: 'Battery 68', chargePerMinute: 375000000 },   // 375.0M
    { level: 69, fileName: 'Battery69.png', displayName: 'Battery 69', chargePerMinute: 400000000 },   // 400.0M

    { level: 70, fileName: 'Battery70.png', displayName: 'Battery 70', chargePerMinute: 450000000 },   // 450.0M    
    { level: 71, fileName: 'Battery71.png', displayName: 'Battery 71', chargePerMinute: 490000000 },   // 490.0M
    { level: 72, fileName: 'Battery72.png', displayName: 'Battery 72', chargePerMinute: 515000000 },   // 515.0M

    { level: 73, fileName: 'Battery73.png', displayName: 'Battery 73', chargePerMinute: 560000000 },   // 560.0M
    { level: 74, fileName: 'Battery74.png', displayName: 'Battery 74', chargePerMinute: 600000000 },   // 600.0M
    { level: 75, fileName: 'Battery75.png', displayName: 'Battery 75', chargePerMinute: 650000000 },   // 650.0M

    { level: 76, fileName: 'Battery76.png', displayName: 'Battery 76', chargePerMinute: 700000000 },   // 700.0M
    { level: 77, fileName: 'Battery77.png', displayName: 'Battery 77', chargePerMinute: 750000000 },   // 750.0M
    { level: 78, fileName: 'Battery78.png', displayName: 'Battery 78', chargePerMinute: 800000000 },   // 800.0M

    { level: 79, fileName: 'Battery79.png', displayName: 'Battery 79', chargePerMinute: 900000000 },   // 900.0M    
    { level: 80, fileName: 'Battery80.png', displayName: 'Battery 80', chargePerMinute: 1000000000 },   // 1.0B
    { level: 81, fileName: 'Battery81.png', displayName: 'Battery 81', chargePerMinute: 2000000000 },   // 2.0B

    { level: 82, fileName: 'Battery82.png', displayName: 'Battery 82', chargePerMinute: 3000000000 },   // 3.0B
    { level: 83, fileName: 'Battery83.png', displayName: 'Battery 83', chargePerMinute: 4000000000 },   // 4.0B
    { level: 84, fileName: 'Battery84.png', displayName: 'Battery 84', chargePerMinute: 5000000000 },   // 5.0B

    { level: 85, fileName: 'Battery85.png', displayName: 'Battery 85', chargePerMinute: 6000000000 },   // 6.0B
    { level: 86, fileName: 'Battery86.png', displayName: 'Battery 86', chargePerMinute: 7000000000 },   // 7.0B
    { level: 87, fileName: 'Battery87.png', displayName: 'Battery 87', chargePerMinute: 8000000000 },   // 8.0B

    { level: 88, fileName: 'Battery88.png', displayName: 'Battery 88', chargePerMinute: 9000000000 },   // 9.0B
    { level: 89, fileName: 'Battery89.png', displayName: 'Battery 89', chargePerMinute: 10000000000 },  // 10.0B
    { level: 90, fileName: 'Battery90.png', displayName: 'Battery 90', chargePerMinute: 10000000000 },  // 10.0B

    { level: 91, fileName: 'Battery91.png', displayName: 'Battery 91', chargePerMinute: 12000000000 },  // 12.0B
    { level: 92, fileName: 'Battery92.png', displayName: 'Battery 92', chargePerMinute: 14000000000 },  // 14.0B
    { level: 93, fileName: 'Battery93.png', displayName: 'Battery 93', chargePerMinute: 16000000000 },  // 16.0B

    { level: 94, fileName: 'Battery94.png', displayName: 'Battery 94', chargePerMinute: 18000000000 },  // 18.0B
    { level: 95, fileName: 'Battery95.png', displayName: 'Battery 95', chargePerMinute: 20000000000 },  // 20.0B
    { level: 96, fileName: 'Battery96.png', displayName: 'Battery 96', chargePerMinute: 25000000000 },  // 25.0B

    { level: 97, fileName: 'Battery97.png', displayName: 'Battery 97', chargePerMinute: 30000000000 },  // 30.0B
    { level: 98, fileName: 'Battery98.png', displayName: 'Battery 98', chargePerMinute: 35000000000 },  // 35.0B
    { level: 99, fileName: 'Battery99.png', displayName: 'Battery 99', chargePerMinute: 40000000000 },  // 40.0B

    { level: 100, fileName: 'Battery100.png', displayName: 'Battery 100', chargePerMinute: 500000000000 }, // 500.0B
];

// ==================================================================================
// HELPER FUNCTIONS - Used by the game code
// ==================================================================================

// Create lookup tables for fast access
var BATTERY_DATA_BY_LEVEL = {};
var BATTERY_CHARGE_TABLE = {}; // Legacy compatibility

BATTERY_DATA.forEach(battery => {
    BATTERY_DATA_BY_LEVEL[battery.level] = battery;
    BATTERY_CHARGE_TABLE[battery.level] = battery.chargePerMinute; // Legacy compatibility
});

// Get battery data by level
function getBatteryData(level) {
    return BATTERY_DATA_BY_LEVEL[level] || null;
}

// Get battery file name by level
function getBatteryFileName(level) {
    const data = BATTERY_DATA_BY_LEVEL[level];
    return data ? data.fileName : null;
}

// Get battery display name by level
function getBatteryDisplayName(level) {
    const data = BATTERY_DATA_BY_LEVEL[level];
    return data ? data.displayName : `Battery ${level}`;
}

// Get charge value for a battery level (legacy compatibility)
function getBatteryChargeValue(level) {
    const data = BATTERY_DATA_BY_LEVEL[level];
    if (data) {
        return data.chargePerMinute;
    }
    // Fallback for levels not defined
    return level * 5;
}

// Get the highest available battery level
function getHighestBatteryLevel() {
    return BATTERY_DATA.length > 0 ? BATTERY_DATA[BATTERY_DATA.length - 1].level : 1;
}

// Get all battery levels that have data defined
function getAllBatteryLevels() {
    return BATTERY_DATA.map(battery => battery.level);
}
