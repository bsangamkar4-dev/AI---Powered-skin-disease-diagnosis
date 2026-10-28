import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MLService {
  constructor() {
    this.apiUrl = process.env.ML_API_URL || 'https://rudra0410hf-dermxai.hf.space/predict';
    this.apiBaseUrl = this.apiUrl.replace(/\/predict\/?$/, '');
    this.timeoutMs = Number(process.env.ML_API_TIMEOUT_MS || 240000);
    this.pythonExecutable = process.env.PYTHON_EXE || 'python';
    this.modelPath = process.env.SKIN_MODEL_PATH || path.join(__dirname, '../../ai model/skin_disease_resnet50_model.h5');
    this.classInfoPath = process.env.SKIN_CLASS_INFO_PATH || path.join(__dirname, '../../ai model/class_info_resnet50.json');
    this.scriptPath = path.join(__dirname, '../ai/predict.py');
    // Remote warm-up is optional. Keep it off by default so an unavailable
    // Hugging Face Space does not emit startup warnings for every server run.
    this.warmupEnabled = process.env.ML_WARMUP === 'true';
    this.warmupIntervalMs = Number(process.env.ML_WARMUP_INTERVAL_MS || 4 * 60 * 1000);
    this.warmupTimer = null;
    this.warmupInFlight = false;

    // A Hugging Face Space may sleep when idle. A lightweight GET keeps the
    // Space warm while this backend is running, reducing cold-start delays.
    if (this.warmupEnabled && this.isRemoteApi()) {
      setTimeout(() => this.warmUpRemoteModel(), 1500);
      this.warmupTimer = setInterval(() => this.warmUpRemoteModel(), this.warmupIntervalMs);
      this.warmupTimer.unref?.();
    }
  }

  isRemoteApi() {
    return /^https?:\/\//i.test(this.apiUrl);
  }

  async warmUpRemoteModel() {
    if (!this.isRemoteApi()) return;

    if (this.warmupInFlight) return;
    this.warmupInFlight = true;
    const startedAt = Date.now();
    try {
      await axios.get(this.apiBaseUrl, { timeout: 30000, validateStatus: () => true });
      console.log(`[ML] Remote model warm-up completed in ${Date.now() - startedAt} ms`);
    } catch (error) {
      // Warm-up is best-effort; never block diagnosis because of it.
      const reason = error.code || error.response?.status || error.message;
      console.warn(`[ML] Remote warm-up skipped (${reason}); prediction requests will still try the model.`);
    } finally {
      this.warmupInFlight = false;
    }
  }

  async predictImage(imagePath) {
    // If the trained model is actually present locally and Python/TensorFlow is
    // configured, use it directly. This avoids network/cold-start latency.
    if (process.env.USE_LOCAL_ML === 'true' && fs.existsSync(this.modelPath) && fs.existsSync(this.scriptPath)) {
      return this.predictLocal(imagePath);
    }

    return this.predictRemote(imagePath);
  }

  predictLocal(imagePath) {
    return new Promise((resolve, reject) => {
      const args = [
        this.scriptPath,
        '--image', imagePath,
        '--model', this.modelPath,
        '--classes', this.classInfoPath
      ];

      console.log(`[ML] Executing local predictor: ${this.pythonExecutable}`);
      const proc = spawn(this.pythonExecutable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => { stdout += data.toString(); });
      proc.stderr.on('data', data => { stderr += data.toString(); });
      proc.on('error', err => reject(new Error(`Failed to start local predictor: ${err.message}`)));
      proc.on('close', code => {
        if (code !== 0) return reject(new Error(stderr || `Python exited with code ${code}`));
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`Failed to parse local model output: ${error.message}`));
        }
      });
    });
  }

  async predictRemote(imagePath) {
    const startedAt = Date.now();
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));

    console.log(`[ML] Sending image to ${this.apiUrl}`);

    try {
      const response = await axios.post(this.apiUrl, formData, {
        headers: formData.getHeaders(),
        timeout: this.timeoutMs,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: status => status >= 200 && status < 300
      });

      const elapsed = Date.now() - startedAt;
      console.log(`[ML] Prediction completed in ${elapsed} ms`);

      if (!response.data || !response.data.predictedClass) {
        throw new Error('ML service returned an invalid prediction response');
      }

      return response.data;
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      console.error(`[ML] Prediction failed after ${elapsed} ms:`, error.message);

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('ML prediction timed out. The AI model may be waking up; please try again.');
      }

      if (error.response?.data?.detail) {
        throw new Error(`ML service error: ${error.response.data.detail}`);
      }

      throw error;
    }
  }
}

export default new MLService();
