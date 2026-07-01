import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CHANNELS = [
  'data_secrets',
  'gonzo_ML',
  'seeallochnaya',
  'denissexy',
  'NeuralShit',
  'cryptoEssay',
  'sergiobulaev',
  'blognot',
  'addmeto',
];

const CHANNELS_FILE = path.join(__dirname, '../../data/channels.json');

export function getTelegramChannels(): string[] {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf-8'));
      return data.telegram ?? DEFAULT_CHANNELS;
    }
  } catch (error) {
    console.error('Error reading channels config:', error);
  }
  return DEFAULT_CHANNELS;
}

export function setTelegramChannels(channels: string[]): void {
  try {
    const dataDir = path.dirname(CHANNELS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const cleanedChannels = channels
      .map((ch) => ch.replace(/^@/, '').trim())
      .filter(Boolean);

    fs.writeFileSync(
      CHANNELS_FILE,
      JSON.stringify({ telegram: cleanedChannels }, null, 2)
    );
  } catch (error) {
    console.error('Error writing channels config:', error);
    throw error;
  }
}
