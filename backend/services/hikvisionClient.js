import axios from 'axios';
import crypto from 'crypto';
import https from 'https';

class HikvisionClient {
  constructor(deviceConfig) {
    this.host = deviceConfig.ip_address.startsWith('http') ? deviceConfig.ip_address : `http://${deviceConfig.ip_address}`;
    if (deviceConfig.port && deviceConfig.port !== 80) {
      this.host += `:${deviceConfig.port}`;
    }
    this.username = deviceConfig.username;
    this.password = deviceConfig.password;
    this.timeout = 10000;
    this.simulate = process.env.HIKVISION_SIMULATE === 'true';

    // Axios client initialization
    this.client = axios.create({
      baseURL: this.host,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    // Authentication challenge cache
    this.realm = null;
    this.nonce = null;
    this.qop = null;
    this.opaque = null;
    this.nc = 0;
  }

  // Calculate md5 hash helper
  md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  // Parse WWW-Authenticate header
  parseChallenge(header) {
    const params = {};
    const cleanedHeader = header.replace(/^Digest\s+/, '');
    const regex = /([a-zA-Z0-9_-]+)=(?:(?:["']([^"']*)["'])|([^,]+))/g;
    let match;
    while ((match = regex.exec(cleanedHeader)) !== null) {
      const key = match[1];
      const val = match[2] !== undefined ? match[2] : (match[3] || '');
      params[key] = val.trim();
    }
    this.realm = params.realm || null;
    this.nonce = params.nonce || null;
    this.qop = params.qop || null;
    this.opaque = params.opaque || null;
  }

  // Generate Digest Authorization Header Value
  generateAuthorizationHeader(method, urlPath) {
    if (!this.nonce || !this.realm) {
      return null;
    }
    this.nc += 1;
    const ncStr = String(this.nc).padStart(8, '0');
    const cnonce = crypto.randomBytes(8).toString('hex');
    
    const ha1 = this.md5(`${this.username}:${this.realm}:${this.password}`);
    const ha2 = this.md5(`${method.toUpperCase()}:${urlPath}`);
    
    let response;
    if (this.qop === 'auth' || this.qop === 'auth-int') {
      response = this.md5(`${ha1}:${this.nonce}:${ncStr}:${cnonce}:${this.qop}:${ha2}`);
    } else {
      response = this.md5(`${ha1}:${this.nonce}:${ha2}`);
    }
    
    let header = `Digest username="${this.username}", realm="${this.realm}", nonce="${this.nonce}", uri="${urlPath}", response="${response}"`;
    if (this.qop) {
      header += `, qop=${this.qop}, nc=${ncStr}, cnonce="${cnonce}"`;
    }
    if (this.opaque) {
      header += `, opaque="${this.opaque}"`;
    }
    return header;
  }

  // Custom request method with Digest handshake interceptor
  async request(config) {
    if (this.simulate) {
      return this.handleSimulation(config);
    }

    const method = config.method || 'GET';
    const url = config.url;
    
    let pathAndSearch = url;
    try {
      const parsedUrl = new URL(url, this.host);
      pathAndSearch = parsedUrl.pathname + parsedUrl.search;
    } catch (e) {
      if (!url.startsWith('/')) {
        pathAndSearch = '/' + url;
      }
    }

    // Attempt request with existing cached Digest challenge if available
    const initialAuth = this.generateAuthorizationHeader(method, pathAndSearch);
    if (initialAuth) {
      config.headers = {
        ...config.headers,
        'Authorization': initialAuth
      };
    }

    try {
      return await this.client.request(config);
    } catch (error) {
      // Catch 401 response challenge
      if (error.response && error.response.status === 401) {
        const authHeader = error.response.headers['www-authenticate'] || error.response.headers['WWW-Authenticate'];
        if (authHeader) {
          this.parseChallenge(authHeader);
          
          const retryAuth = this.generateAuthorizationHeader(method, pathAndSearch);
          if (retryAuth) {
            config.headers = {
              ...config.headers,
              'Authorization': retryAuth
            };
            // Retry the request with new digest headers
            return await this.client.request(config);
          }
        }
      }
      throw error;
    }
  }

  // Simulation handler returning identical mock Hikvision JSON payloads
  // Simulation handler returning empty responses (no dummy data)
  handleSimulation(config) {
    const url = config.url || '';
    console.log(`[Simulation Client] Request Intercepted: ${config.method || 'GET'} ${url}`);

    // Return empty successful responses for known endpoints
    if (url.includes('/ISAPI/System/deviceInfo')) {
      return { status: 200, headers: { 'content-type': 'application/json' }, data: {} };
    }

    if (url.includes('/ISAPI/AccessControl/UserInfo/Search')) {
      return { status: 200, headers: { 'content-type': 'application/json' }, data: { UserInfoSearch: { UserInfo: [] } } };
    }

    if (url.includes('/ISAPI/AccessControl/AcsEvent')) {
      return { status: 200, headers: { 'content-type': 'application/json' }, data: { AcsEvent: { InfoList: [] } } };
    }

    throw new Error(`Endpoint simulator not implemented for URL: ${url}`);
  }

  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  async post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }
}

export default HikvisionClient;
