import app from "./src/index.js";
import { PRODUCT_NAME } from './src/config/branding.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'src', '.env') });


const PORT = process.env.PORT || 5000;



app.listen(PORT, () => {
  console.log(`🚀 ${PRODUCT_NAME} server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
