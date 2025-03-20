import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

export const config = {
  api: {
    bodyParser: false,
  }
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const rawBody = await buffer(req);
  const { htmlContent } = JSON.parse(rawBody.toString());

  if (!htmlContent) {
    return res.status(400).json({ message: 'Le contenu HTML est requis' });
  }

  try {
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: await chromium.executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 800, height: 600 });

    await page.setContent(htmlContent, { waitUntil: 'load' });

    const imageBuffer = await page.screenshot({ type: 'png' });

    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(imageBuffer);

  } catch (error) {
    console.error('Erreur lors de la génération de l\'image :', error.message);

    return res.status(500).json({ message: 'Erreur lors de la génération de l\'image', error: error.message });
  }
}
