const User = require('../../models/User');
const dbManager = require('../../config/database');
const bcrypt = require('bcrypt');

// Mock database for testing
jest.mock('../../config/database');

describe('User Model', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      prepare: jest.fn(),
      transaction: jest.fn()
    };
    dbManager.getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await User.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(typeof hashedPassword).toBe('string');
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await User.hashPassword(password);
      const hash2 = await User.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await User.hashPassword(password);
      const user = new User({ password_hash: hashedPassword });
      
      const isValid = await user.verifyPassword(password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hashedPassword = await User.hashPassword(password);
      const user = new User({ password_hash: hashedPassword });
      
      const isValid = await user.verifyPassword(wrongPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('create', () => {
    it('should create user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const mockRun = jest.fn().mockReturnValue({ lastInsertRowid: 1 });
      const mockGet = jest.fn().mockReturnValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      });

      mockDb.prepare.mockReturnValueOnce({ run: mockRun });
      mockDb.prepare.mockReturnValueOnce({ get: mockGet });

      const user = await User.create(userData);

      expect(user).toBeInstanceOf(User);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(mockRun).toHaveBeenCalled();
    });

    it('should throw error for missing required fields', async () => {
      const userData = {
        username: 'testuser'
        // missing email and password
      };

      await expect(User.create(userData)).rejects.toThrow('Username, email, and password are required');
    });

    it('should handle unique constraint violation', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const mockRun = jest.fn().mockImplementation(() => {
        const error = new Error('UNIQUE constraint failed');
        error.code = 'SQLITE_CONSTRAINT_UNIQUE';
        throw error;
      });

      mockDb.prepare.mockReturnValue({ run: mockRun });

      await expect(User.create(userData)).rejects.toThrow('Username or email already exists');
    });
  });

  describe('findById', () => {
    it('should return user when found', () => {
      const mockUserData = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      };

      const mockGet = jest.fn().mockReturnValue(mockUserData);
      mockDb.prepare.mockReturnValue({ get: mockGet });

      const user = User.findById(1);

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
      expect(mockGet).toHaveBeenCalledWith(1);
    });

    it('should return null when user not found', () => {
      const mockGet = jest.fn().mockReturnValue(undefined);
      mockDb.prepare.mockReturnValue({ get: mockGet });

      const user = User.findById(999);

      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', () => {
      const mockUserData = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      };

      const mockGet = jest.fn().mockReturnValue(mockUserData);
      mockDb.prepare.mockReturnValue({ get: mockGet });

      const user = User.findByUsername('testuser');

      expect(user).toBeInstanceOf(User);
      expect(user.username).toBe('testuser');
      expect(mockGet).toHaveBeenCalledWith('testuser');
    });

    it('should return null when user not found', () => {
      const mockGet = jest.fn().mockReturnValue(undefined);
      mockDb.prepare.mockReturnValue({ get: mockGet });

      const user = User.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('validateUserData', () => {
    it('should return empty array for valid data', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const errors = User.validateUserData(userData);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid username', () => {
      const userData = {
        username: 'ab', // too short
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const errors = User.validateUserData(userData);
      expect(errors).toContain('Username must be at least 3 characters long');
    });

    it('should return errors for invalid email', () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPassword123'
      };

      const errors = User.validateUserData(userData);
      expect(errors).toContain('Invalid email format');
    });

    it('should return errors for weak password', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak'
      };

      const errors = User.validateUserData(userData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Password must be at least 8 characters'))).toBe(true);
    });

    it('should return errors for password without required characters', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'onlylowercase'
      };

      const errors = User.validateUserData(userData);
      expect(errors.some(error => error.includes('Password must contain at least one lowercase letter, one uppercase letter, and one number'))).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should exclude password_hash from JSON output', () => {
      const user = new User({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      });

      const json = user.toJSON();

      expect(json.password_hash).toBeUndefined();
      expect(json.id).toBe(1);
      expect(json.username).toBe('testuser');
      expect(json.email).toBe('test@example.com');
      expect(json.role).toBe('admin');
    });
  });
});