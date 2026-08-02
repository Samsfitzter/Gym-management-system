import UserService from '../services/userService.js';

export class AuthController {
  static async login(req, res) {
    const { username, password } = req.body;
    try {
      const data = await UserService.authenticateUser(username, password);
      return res.json({
        success: true,
        data,
        message: 'Login successful'
      });
    } catch (err) {
      console.error('Login controller error:', err.message);
      return res.status(401).json({
        success: false,
        data: null,
        message: err.message || 'Invalid credentials'
      });
    }
  }

  static async register(req, res) {
    const { username, password, role, name } = req.body;
    try {
      const newUser = await UserService.registerUser(username, password, role, name);
      return res.status(201).json({
        success: true,
        data: newUser,
        message: 'User registered successfully'
      });
    } catch (err) {
      console.error('Register controller error:', err.message);
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }

  static async me(req, res) {
    try {
      const user = await UserService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'User not found'
        });
      }
      return res.json({
        success: true,
        data: { user },
        message: 'Current user session retrieved'
      });
    } catch (err) {
      console.error('Me controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }
}

export default AuthController;
