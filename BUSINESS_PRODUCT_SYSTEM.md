# Business and Product System Documentation

## Overview
Each level can now have its own business building sprite (e.g., pizza shop, library) and collectible product items (e.g., pizza, books).

## What Was Fixed
1. **Parking Area Cleanup**: Fixed issue where parking areas from previous levels were not removed when spawning new levels. Old parking elements, business sprites, and product sprites are now properly destroyed when loading a new level.

## Implementation Details

### 1. Configuration (config.js)
Two new configuration arrays were added:

```javascript
BUSINESSES: [
    {
        label: "pizza_shop",
        spriteKey: "pizza_shop",
        fileName: "pizza_shop.png"
    },
    {
        label: "library",
        spriteKey: "library",
        fileName: "library.png"
    }
],

PRODUCTS: [
    {
        label: "pizza",
        spriteKey: "pizza",
        fileName: "pizza.png"
    },
    {
        label: "book",
        spriteKey: "book",
        fileName: "book.png"
    }
]
```

### 2. Level Data (levels.json)
Each level now has two new properties:
- `business`: Label of the business to display (e.g., "pizza_shop", "library")
- `product`: Label of the collectible product (e.g., "pizza", "book")

All current levels default to:
```json
{
  "business": "pizza_shop",
  "product": "pizza"
}
```

### 3. Game Code Changes
- **Scene Properties**: Added tracking properties for business and product sprites
- **Preload**: Business and product images are loaded dynamically from CONFIG
- **Load Level**: Calls `spawnBusinessAndProducts()` to create level-specific sprites
- **Clear Parking Area**: Destroys business and product sprites when loading new levels
- **Create Products**: Uses the current level's product sprite instead of always using pizza

## How to Add New Businesses and Products

### Adding a New Business:
1. Add business sprite image to `graphics/businesses/` folder
2. Add entry to `CONFIG.BUSINESSES` in config.js:
```javascript
{
    label: "bookstore",
    spriteKey: "bookstore",
    fileName: "bookstore.png"
}
```

### Adding a New Product:
1. Add product sprite image to `graphics/products/` folder
2. Add entry to `CONFIG.PRODUCTS` in config.js:
```javascript
{
    label: "newspaper",
    spriteKey: "newspaper",
    fileName: "newspaper.png"
}
```

### Using in Levels:
In `levels.json`, set the business and product for any level:
```json
{
  "grid": { ... },
  "parking": { ... },
  "road": { ... },
  "cars": [ ... ],
  "business": "library",
  "product": "book"
}
```

## Current Assets
- **Business Sprites**: `pizza_shop.png`, `library.png` (in graphics/businesses/)
- **Product Sprites**: `pizza.png`, `book.png` (in graphics/products/)

Note: `book.png` is currently a placeholder (copy of pizza.png). Replace it with an actual book sprite when available.

## Testing
1. Start the game and complete level 1 with pizza shop
2. Progress to level 2 - verify the pizza shop from level 1 is removed
3. Verify products (pizzas) display correctly on the counter
4. To test different businesses/products, edit a level in levels.json to use "library" and "book"

## Future Enhancements
- Add more business types (cafe, gas station, etc.)
- Add more product types (coffee, fuel, etc.)
- Different product positioning based on business type
- Animated business sprites
- Sound effects per business/product type
