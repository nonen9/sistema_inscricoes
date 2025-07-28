const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  environment: process.env.NODE_ENV || 'development',
  
  // Configurações de dados
  dataPath: process.env.DATA_PATH || './data',
  configPath: process.env.CONFIG_PATH || './config',
  
  // Configurações de segurança
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  
  // Configurações de admin
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  
  // Health check
  healthCheck: {
    enabled: true,
    endpoint: '/api/health'
  }
};

module.exports = config;
