export const ERROR_CODES = {
  INVALID_REGION: {
    code: 'ERR_VAL_001',
    message: 'Invalid Region Format',
    description: 'Address/Bank schema mismatch.',
  },
  UNAUTHORIZED: {
    code: 'ERR_AUTH_002',
    message: 'Unauthorized Access',
    description: 'Missing or invalid JWT.',
  },
  DECRYPTION_FAILED: {
    code: 'ERR_SEC_003',
    message: 'Payload Decryption Failed',
    description: 'Backend unable to decrypt sensitive data.',
  },
  DUPLICATE_OWNER_EMAIL: {
    code: 'ERR_BUS_004',
    message: 'Duplicate Owner Email',
    description: 'Director email already exists in system.',
  },
};
