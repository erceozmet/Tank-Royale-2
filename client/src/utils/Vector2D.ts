/**
 * 2D Vector class matching Go server implementation
 * Used for player positions, velocities, and physics calculations
 */
export class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}

  /**
   * Add another vector to this vector
   */
  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another vector from this vector
   */
  subtract(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiply vector by a scalar
   */
  multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  /**
   * Get the magnitude (length) of the vector
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Normalize the vector (make it length 1)
   */
  normalize(): Vector2D {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector2D(0, 0);
    }
    return new Vector2D(this.x / mag, this.y / mag);
  }

  /**
   * Calculate distance to another vector
   */
  distance(other: Vector2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate dot product with another vector
   */
  dot(other: Vector2D): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Create a vector from an angle (in radians)
   */
  static fromAngle(angle: number, magnitude: number = 1): Vector2D {
    return new Vector2D(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    );
  }

  /**
   * Get the angle of this vector (in radians)
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Create a copy of this vector
   */
  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Convert to string for debugging
   */
  toString(): string {
    return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}
