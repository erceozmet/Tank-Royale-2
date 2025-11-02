import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  isValidEmail,
  isValidUsername,
  isValidPassword,
} from '../../../src/auth/utils';
import jwt from 'jsonwebtoken';

describe('Auth Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'MyPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'MyPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'MyPassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'MyPassword123';
      const wrongPassword = 'WrongPassword456';
      const hash = await hashPassword(password);

      const result = await comparePassword(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'MyPassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword('', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user-123';
      const username = 'testuser';

      const token = generateToken(userId, username);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include userId and username in token payload', () => {
      const userId = 'user-123';
      const username = 'testuser';

      const token = generateToken(userId, username);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(userId);
      expect(decoded.username).toBe(username);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user-1', 'user1');
      const token2 = generateToken('user-2', 'user2');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const userId = 'user-123';
      const username = 'testuser';
      const token = generateToken(userId, username);

      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(userId);
      expect(decoded.username).toBe(username);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => verifyToken(malformedToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow('Invalid or expired token');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('user123@test-domain.com')).toBe(true);
      expect(isValidEmail('a@b.co')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('user@example')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('user@exam ple.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should return true for valid usernames', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test_user')).toBe(true);
      expect(isValidUsername('Player_123')).toBe(true);
      expect(isValidUsername('abc')).toBe(true); // minimum 3 chars
      expect(isValidUsername('a'.repeat(50))).toBe(true); // maximum 50 chars
    });

    it('should return false for invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false); // too short
      expect(isValidUsername('a'.repeat(51))).toBe(false); // too long
      expect(isValidUsername('user-name')).toBe(false); // dash not allowed
      expect(isValidUsername('user.name')).toBe(false); // dot not allowed
      expect(isValidUsername('user name')).toBe(false); // space not allowed
      expect(isValidUsername('user@name')).toBe(false); // special char
      expect(isValidUsername('user#123')).toBe(false); // special char
      expect(isValidUsername('')).toBe(false); // empty
    });
  });

  describe('isValidPassword', () => {
    it('should return true for valid passwords', () => {
      expect(isValidPassword('Password123')).toBe(true);
      expect(isValidPassword('Abcd1234')).toBe(true);
      expect(isValidPassword('MyP@ssw0rd')).toBe(true);
      expect(isValidPassword('Test1234')).toBe(true);
    });

    it('should return false for passwords without uppercase', () => {
      expect(isValidPassword('password123')).toBe(false);
      expect(isValidPassword('test1234')).toBe(false);
    });

    it('should return false for passwords without lowercase', () => {
      expect(isValidPassword('PASSWORD123')).toBe(false);
      expect(isValidPassword('TEST1234')).toBe(false);
    });

    it('should return false for passwords without numbers', () => {
      expect(isValidPassword('Password')).toBe(false);
      expect(isValidPassword('TestPass')).toBe(false);
    });

    it('should return false for passwords shorter than 8 characters', () => {
      expect(isValidPassword('Pass1')).toBe(false);
      expect(isValidPassword('Ab1')).toBe(false);
      expect(isValidPassword('')).toBe(false);
    });

    it('should accept passwords with special characters', () => {
      expect(isValidPassword('Pass@123')).toBe(true);
      expect(isValidPassword('Test!234')).toBe(true);
      expect(isValidPassword('My#Pass1')).toBe(true);
    });
  });
});
