// routes/audio.js (hoặc thêm vào file router hiện có)
import express from 'express';
import axios from 'axios';
import { Readable } from 'stream';

const router = express.Router();

router.get('/proxy', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
    return res.status(400).json({ message: 'Thiếu hoặc URL không hợp lệ' });
  }

  try {
    const range = req.headers.range;

    const axiosConfig = {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://archive.org/',
      },
    };

    // Nếu client gửi range (ví dụ: bytes=0-), forward range cho nguồn
    if (range) {
      axiosConfig.headers.Range = range;
    }

    const response = await axios.get(url, axiosConfig);

    // Forward các header quan trọng
    const contentType = response.headers['content-type'] || 'audio/mp4';
    const contentLength = response.headers['content-length'];
    const acceptRanges = response.headers['accept-ranges'] || 'bytes';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Nếu có range request → status 206 Partial Content
    if (range && response.status === 206) {
      res.status(206);
    }

    // Pipe stream từ nguồn sang client
    response.data.pipe(res);

    // Xử lý lỗi stream
    response.data.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Lỗi stream audio' });
      }
    });
  } catch (err) {
    console.error('Proxy audio error:', err.message, err.response?.status);

    if (err.response) {
      res.status(err.response.status || 500).json({
        message: 'Không tải được audio từ nguồn',
        status: err.response.status,
      });
    } else {
      res.status(500).json({ message: 'Lỗi proxy audio' });
    }
  }
});

export default router;