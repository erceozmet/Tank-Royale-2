/**
 * Shared utility functions
 */

import { Vector2 } from './types';

/**
 * Calculate distance between two points
 */
export function distance(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize a vector
 */
export function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Vector interpolation
 */
export function lerpVector(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

/**
 * Check if two circles collide
 */
export function circleCollision(
  pos1: Vector2,
  radius1: number,
  pos2: Vector2,
  radius2: number
): boolean {
  return distance(pos1, pos2) < radius1 + radius2;
}

/**
 * Check if point is inside circle
 */
export function pointInCircle(point: Vector2, center: Vector2, radius: number): boolean {
  return distance(point, center) <= radius;
}

/**
 * Check if point is inside rectangle
 */
export function pointInRect(
  point: Vector2,
  rectPos: Vector2,
  width: number,
  height: number
): boolean {
  return (
    point.x >= rectPos.x &&
    point.x <= rectPos.x + width &&
    point.y >= rectPos.y &&
    point.y <= rectPos.y + height
  );
}

/**
 * Generate a random position within bounds
 */
export function randomPosition(width: number, height: number): Vector2 {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
