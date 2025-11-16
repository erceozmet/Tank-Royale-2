import { describe, it, expect } from 'vitest';
import { Vector2D } from '@utils/Vector2D';

describe('Vector2D', () => {
  describe('constructor', () => {
    it('should create a vector with default values', () => {
      const v = new Vector2D();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create a vector with specified values', () => {
      const v = new Vector2D(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('add', () => {
    it('should add two vectors correctly', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(3, 4);
      const result = v1.add(v2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('should not modify the original vectors', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(3, 4);
      v1.add(v2);
      expect(v1.x).toBe(1);
      expect(v1.y).toBe(2);
    });
  });

  describe('subtract', () => {
    it('should subtract two vectors correctly', () => {
      const v1 = new Vector2D(5, 7);
      const v2 = new Vector2D(2, 3);
      const result = v1.subtract(v2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('should handle negative results', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(3, 4);
      const result = v1.subtract(v2);
      expect(result.x).toBe(-2);
      expect(result.y).toBe(-2);
    });
  });

  describe('multiply', () => {
    it('should multiply vector by a scalar', () => {
      const v = new Vector2D(2, 3);
      const result = v.multiply(3);
      expect(result.x).toBe(6);
      expect(result.y).toBe(9);
    });

    it('should handle negative scalar', () => {
      const v = new Vector2D(2, 3);
      const result = v.multiply(-2);
      expect(result.x).toBe(-4);
      expect(result.y).toBe(-6);
    });

    it('should handle zero scalar', () => {
      const v = new Vector2D(2, 3);
      const result = v.multiply(0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('magnitude', () => {
    it('should calculate magnitude correctly', () => {
      const v = new Vector2D(3, 4);
      expect(v.magnitude()).toBe(5); // 3-4-5 triangle
    });

    it('should return 0 for zero vector', () => {
      const v = new Vector2D(0, 0);
      expect(v.magnitude()).toBe(0);
    });

    it('should calculate magnitude for unit vector', () => {
      const v = new Vector2D(1, 0);
      expect(v.magnitude()).toBe(1);
    });
  });

  describe('normalize', () => {
    it('should normalize a vector to length 1', () => {
      const v = new Vector2D(3, 4);
      const normalized = v.normalize();
      expect(normalized.magnitude()).toBeCloseTo(1, 5);
    });

    it('should preserve direction after normalization', () => {
      const v = new Vector2D(3, 4);
      const normalized = v.normalize();
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.y).toBeCloseTo(0.8, 5);
    });

    it('should handle zero vector', () => {
      const v = new Vector2D(0, 0);
      const normalized = v.normalize();
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });
  });

  describe('distance', () => {
    it('should calculate distance between two vectors', () => {
      const v1 = new Vector2D(0, 0);
      const v2 = new Vector2D(3, 4);
      expect(v1.distance(v2)).toBe(5);
    });

    it('should return 0 for same position', () => {
      const v1 = new Vector2D(2, 3);
      const v2 = new Vector2D(2, 3);
      expect(v1.distance(v2)).toBe(0);
    });

    it('should be commutative', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(4, 6);
      expect(v1.distance(v2)).toBe(v2.distance(v1));
    });
  });

  describe('dot', () => {
    it('should calculate dot product correctly', () => {
      const v1 = new Vector2D(2, 3);
      const v2 = new Vector2D(4, 5);
      expect(v1.dot(v2)).toBe(23); // 2*4 + 3*5 = 8 + 15 = 23
    });

    it('should return 0 for perpendicular vectors', () => {
      const v1 = new Vector2D(1, 0);
      const v2 = new Vector2D(0, 1);
      expect(v1.dot(v2)).toBe(0);
    });

    it('should be commutative', () => {
      const v1 = new Vector2D(2, 3);
      const v2 = new Vector2D(4, 5);
      expect(v1.dot(v2)).toBe(v2.dot(v1));
    });
  });

  describe('fromAngle', () => {
    it('should create vector from angle 0', () => {
      const v = Vector2D.fromAngle(0);
      expect(v.x).toBeCloseTo(1, 5);
      expect(v.y).toBeCloseTo(0, 5);
    });

    it('should create vector from angle π/2', () => {
      const v = Vector2D.fromAngle(Math.PI / 2);
      expect(v.x).toBeCloseTo(0, 5);
      expect(v.y).toBeCloseTo(1, 5);
    });

    it('should respect magnitude parameter', () => {
      const v = Vector2D.fromAngle(0, 5);
      expect(v.x).toBeCloseTo(5, 5);
      expect(v.y).toBeCloseTo(0, 5);
      expect(v.magnitude()).toBeCloseTo(5, 5);
    });
  });

  describe('angle', () => {
    it('should return correct angle for horizontal vector', () => {
      const v = new Vector2D(1, 0);
      expect(v.angle()).toBeCloseTo(0, 5);
    });

    it('should return correct angle for vertical vector', () => {
      const v = new Vector2D(0, 1);
      expect(v.angle()).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should return correct angle for diagonal vector', () => {
      const v = new Vector2D(1, 1);
      expect(v.angle()).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('clone', () => {
    it('should create a copy of the vector', () => {
      const v1 = new Vector2D(3, 4);
      const v2 = v1.clone();
      expect(v2.x).toBe(v1.x);
      expect(v2.y).toBe(v1.y);
    });

    it('should create an independent copy', () => {
      const v1 = new Vector2D(3, 4);
      const v2 = v1.clone();
      v2.x = 10;
      expect(v1.x).toBe(3); // Original unchanged
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const v = new Vector2D(3.14159, 2.71828);
      const str = v.toString();
      expect(str).toContain('Vector2D');
      expect(str).toContain('3.14');
      expect(str).toContain('2.72');
    });
  });

  describe('game physics scenarios', () => {
    it('should handle player movement calculation', () => {
      const position = new Vector2D(100, 100);
      const velocity = Vector2D.fromAngle(Math.PI / 4, 5); // 45 degrees, speed 5
      const newPosition = position.add(velocity);
      
      expect(newPosition.x).toBeGreaterThan(100);
      expect(newPosition.y).toBeGreaterThan(100);
      expect(newPosition.distance(position)).toBeCloseTo(5, 5);
    });

    it('should handle collision detection', () => {
      const player1 = new Vector2D(100, 100);
      const player2 = new Vector2D(140, 100);
      const collisionRadius = 20;
      
      const distance = player1.distance(player2);
      const isColliding = distance < (collisionRadius * 2);
      
      expect(distance).toBe(40);
      expect(isColliding).toBe(false);
    });

    it('should calculate bullet trajectory', () => {
      const playerPos = new Vector2D(100, 100);
      const targetPos = new Vector2D(200, 200);
      
      const direction = targetPos.subtract(playerPos).normalize();
      const bulletSpeed = 10;
      const bulletVelocity = direction.multiply(bulletSpeed);
      
      expect(bulletVelocity.magnitude()).toBeCloseTo(bulletSpeed, 5);
    });
  });
});
