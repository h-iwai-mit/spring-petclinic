const crypto = require('node:crypto');

const fixedUuid = () => '00000000-0000-4000-8000-000000000001';
crypto.randomUUID = fixedUuid;
crypto.webcrypto.randomUUID = fixedUuid;
