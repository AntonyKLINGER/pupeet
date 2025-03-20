import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

export const config = {
  api: {
    bodyParser: false, // Désactiver l'analyse automatique de Next.js pour les requêtes POST
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

  // On récupère le body brut de la requête et on le parse en JSON
  const rawBody = await buffer(req);
  const { htmlContent } = JSON.parse(rawBody.toString());

  if (!htmlContent) {
    return res.status(400).json({ message: 'Le contenu HTML est requis' });
  }

  try {
    // Lancement de Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath || '/usr/bin/google-chrome-stable',
      headless: true,
    });

    const page = await browser.newPage();

    // Définir les dimensions de la page
    await page.setViewport({ width: 800, height: 600 });

    // Charger le contenu HTML
    await page.setContent(htmlContent, { waitUntil: 'load' });

    // Prendre une capture d'écran
    const imageBuffer = await page.screenshot({ type: 'png' });

    await browser.close();

    // Retourner l'image
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(imageBuffer);

  } catch (error) {
    console.error('Erreur lors de la génération de l\'image :', error.message);
    res.status(500).json({ message: 'Erreur lors de la génération de l\'image', error: error.message });
  }
}
