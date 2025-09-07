// Basic post-build info to aid cache busting/security reviews
try {
  const { createHash } = require('crypto');
  const fs = require('fs');
  const path = require('path');
  const buildDir = path.join(__dirname, '..', 'build');
  const files = fs.existsSync(buildDir) ? fs.readdirSync(buildDir) : [];
  const hash = createHash('sha256');
  for (const f of files) {
    const full = path.join(buildDir, f);
    if (fs.statSync(full).isFile()) {
      hash.update(fs.readFileSync(full));
    }
  }
  console.log('Build digest (sha256):', hash.digest('hex').slice(0, 32));
} catch (e) {
  // ignore
}

