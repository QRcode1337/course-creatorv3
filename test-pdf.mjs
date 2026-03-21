import puppeteer from 'puppeteer';

const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      padding: 40px;
      background: white;
    }
    h1 {
      color: #6366f1;
      margin-bottom: 20px;
    }
    p {
      color: #333;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <h1>Test PDF</h1>
  <p>This is a test PDF to verify Puppeteer is working correctly.</p>
  <p>If you can see this, the PDF generation is functioning.</p>
</body>
</html>
`;

async function testPdfGeneration() {
  console.log('Starting PDF generation test...');
  let browser;
  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    console.log('Browser launched successfully');

    const page = await browser.newPage();
    console.log('Page created');

    console.log('Setting page content with networkidle0...');
    await page.setContent(testHtml, { waitUntil: "networkidle0", timeout: 30000 });
    console.log('Page content set');

    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      displayHeaderFooter: false,
    });
    console.log(`PDF generated successfully! Size: ${pdfBuffer.length} bytes`);

    return pdfBuffer;
  } catch (error) {
    console.error('Error during PDF generation:', error);
    throw error;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
      console.log('Browser closed');
    }
  }
}

testPdfGeneration().then(() => {
  console.log('Test completed successfully!');
  process.exit(0);
}).catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
