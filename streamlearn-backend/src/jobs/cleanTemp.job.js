const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');

// Run every midnight
cron.schedule('0 0 * * *', () => {
  const tempDir = process.env.TEMP_UPLOAD_PATH || './uploads/temp';
  if (!fs.existsSync(tempDir)) return;

  const files = fs.readdirSync(tempDir);
  let cleaned = 0;
  files.forEach(file => {
    if (file === '.gitkeep') return;
    const fp    = path.join(tempDir, file);
    const stats = fs.statSync(fp);
    const ageHours = (Date.now() - stats.mtimeMs) / 3600000;
    if (ageHours > 24) {
      fs.unlinkSync(fp);
      cleaned++;
    }
  });
  if (cleaned) console.log(`🧹 Cleaned ${cleaned} temp files`);
});

console.log('✅ Temp cleanup cron registered');
