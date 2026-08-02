import pool from '../db/database.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

export class UserService {
  static async authenticateUser(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userRes.rows[0];
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user);
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    };
  }

  static async registerUser(username, password, role, name) {
    if (!username || !password || !role || !name) {
      throw new Error('All fields are required');
    }

    if (role !== 'admin' && role !== 'receptionist' && role !== 'trainer') {
      throw new Error('Invalid role specified');
    }

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, name) 
       VALUES ($1, $2, $3, $4) RETURNING id, username, role, name`,
      [username, passwordHash, role, name]
    );

    return result.rows[0];
  }

  static async getUserById(id) {
    const userRes = await pool.query(
      'SELECT id, username, role, name FROM users WHERE id = $1',
      [id]
    );
    return userRes.rows[0] || null;
  }
}

export default UserService;
