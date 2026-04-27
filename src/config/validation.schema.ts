import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Node environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),

  // Application
  PORT: Joi.number().default(3000),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL database connection string'),

  // JWT Configuration
  JWT_SECRET: Joi.string()
    .required()
    .min(32)
    .description('JWT secret key (min 32 characters)'),
  JWT_ACCESS_TOKEN_EXPIRATION: Joi.string()
    .default('15m')
    .description('Access token expiration time'),
  JWT_REFRESH_TOKEN_EXPIRATION: Joi.string()
    .default('7d')
    .description('Refresh token expiration time'),

  // Email Verification
  EMAIL_VERIFICATION_TOKEN_EXPIRATION: Joi.string()
    .default('24h')
    .description('Email verification token expiration'),

  // Email Service (Optional - for email verification)
  EMAIL_SERVICE: Joi.string()
    .valid('sendgrid', 'aws-ses', 'smtp')
    .optional()
    .description('Email service provider'),
  EMAIL_API_KEY: Joi.string().optional().description('Email service API key'),
  EMAIL_FROM: Joi.string()
    .email()
    .optional()
    .description('Sender email address'),

  // Stellar Network
  STELLAR_NETWORK: Joi.string()
    .valid('testnet', 'public', 'futurenet')
    .default('testnet')
    .description('Stellar network to connect to'),
  STELLAR_HORIZON_URL: Joi.string()
    .optional()
    .description('Stellar Horizon API URL'),
  STELLAR_PLATFORM_PUBLIC_KEY: Joi.string()
    .optional()
    .description('Platform Stellar public key for payouts'),
  STELLAR_PLATFORM_SECRET: Joi.string()
    .optional()
    .description('Platform Stellar secret key for payouts'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .description('Application log level'),
});
