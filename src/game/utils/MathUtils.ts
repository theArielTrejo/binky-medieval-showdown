/**
 * Mathematical Utility Functions
 * Centralized math operations to eliminate code duplication
 */

/**
 * Calculates the Euclidean distance between two points
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns Distance between the two points
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks if a point is within a certain range of another point
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @param range - Maximum distance for the check
 * @returns True if points are within range
 */
export function isWithinRange(x1: number, y1: number, x2: number, y2: number, range: number): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy <= range * range;
}

/**
 * Calculates the angle between two points in radians
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns Angle in radians
 */
export function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Generates a random number between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random number between min and max
 */
export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Calculates multiple positions in a circle around a center point
 * @param centerX - X coordinate of center
 * @param centerY - Y coordinate of center
 * @param radius - Radius of the circle
 * @param count - Number of positions to generate
 * @param startAngle - Starting angle offset (default: 0)
 * @returns Array of position objects
 */
export function getCircularPositions(
  centerX: number, 
  centerY: number, 
  radius: number, 
  count: number, 
  startAngle: number = 0
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = (Math.PI * 2) / count;
  
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (angleStep * i);
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    positions.push({ x, y });
  }
  
  return positions;
}