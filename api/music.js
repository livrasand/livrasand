import { readdirSync } from 'fs';
import { join } from 'path';

const DIRECTORY = 'music';
const EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'];

const NOTES = {
  'Cocula': 'Inspired by the traditional identity of Cocula, Jalisco, and that feeling of deep Mexico where music seems to be part of the landscape. The piece seeks to convey warmth, tradition, and a quiet afternoon through streets, countryside, and memories.',
  'Hanalei': 'Born from the image of Hanalei, on Kauai: green mountains covered in clouds, tropical rain, and the ocean in the background. It\'s a piece meant to evoke that humid, contemplative calm of Hawaii.',
  'Huangshan': 'Inspired by the Huangshan mountains of China, especially their peaks rising through the mist. The music tries to capture the feeling of standing before an ancient, silent, almost unreal landscape.',
  'Kauai': 'A musical interpretation of Kauai\'s tranquility: jungle, rain, ocean, and mountains. The intention is to create a sense of pleasant isolation, like getting lost for a whole day on an island with no rush.',
  'Shiraz': 'Inspired by Shiraz, Persia, and the sound of traditional Middle Eastern music. The piece seeks to evoke courtyards, gardens, ancient architecture, and a warm contemplative atmosphere.',
  'Xochimilco': 'I wanted to imagine an afternoon crossing Xochimilco, letting the music, the movement, and the colors of the city set the rhythm. A cheerful, dynamic piece made to accompany the journey, dance a little, and get carried away by the Mexican vibe.'
};

function prettyName(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
}

export default async function handler(req, res) {
  try {
    const dir = join(process.cwd(), DIRECTORY);
    const files = Array.isArray(readdirSync(dir)) ? readdirSync(dir) : [];

    const tracks = files
      .filter(name => EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext)))
      .map(name => ({
        name: prettyName(name),
        url: DIRECTORY + '/' + encodeURIComponent(name),
        cover: DIRECTORY + '/covers/' + encodeURIComponent(name.replace(/\.[^.]+$/, '') + '.jpg'),
        note: NOTES[prettyName(name)] || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).json(tracks);
  } catch (err) {
    res.status(502).json({ message: 'Failed to list tracks' });
  }
}
