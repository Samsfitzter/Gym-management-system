import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production!');
  }
  console.warn('WARNING: JWT_SECRET environment variable is missing. Using default fallback key in development.');
}

const secretKey = JWT_SECRET || 'supersecretgymkey123!';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    secretKey,
    { expiresIn: '24h' }
  );
}

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      data: null, 
      message: 'No authorization token provided' 
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      data: null, 
      message: 'Authorization token format is invalid' 
    });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        data: null, 
        message: 'Invalid or expired token' 
      });
    }
    req.user = decoded;
    next();
  });
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        data: null, 
        message: 'Not authenticated' 
      });
    }
    const hasRole = Array.isArray(roles) ? roles.includes(req.user.role) : req.user.role === roles;
    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        data: null, 
        message: 'Access denied: Insufficient privileges' 
      });
    }
    next();
  };
}
