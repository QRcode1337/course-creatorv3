import puppeteer from "puppeteer";

interface LessonPdfData {
  courseTitle: string;
  chapterTitle: string;
  lessonTitle: string;
  lessonContent: string;
  illustrations: { url: string; caption?: string }[];
  glossaryTerms: { term: string; definition: string }[];
  userNotes?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = escapeHtml(markdown);
  
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  
  // Code blocks
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```\w*\n?/g, "").replace(/```/g, "");
    return `<pre><code>${code}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  
  // Paragraphs (lines that aren't already wrapped)
  html = html.replace(/^(?!<[hluop]|<li)(.+)$/gm, "<p>$1</p>");
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");
  
  return html;
}

export async function generateLessonPdf(data: LessonPdfData): Promise<Buffer> {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .course-title {
      font-size: 12pt;
      color: #6366f1;
      font-weight: 500;
      margin-bottom: 5px;
    }
    
    .chapter-title {
      font-size: 11pt;
      color: #64748b;
      margin-bottom: 10px;
    }
    
    .lesson-title {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 10px;
    }
    
    .content {
      margin-bottom: 30px;
    }
    
    .content h1 {
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a2e;
      margin: 25px 0 15px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    
    .content h2 {
      font-size: 15pt;
      font-weight: 600;
      color: #334155;
      margin: 20px 0 12px 0;
    }
    
    .content h3 {
      font-size: 13pt;
      font-weight: 600;
      color: #475569;
      margin: 18px 0 10px 0;
    }
    
    .content p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    .content ul, .content ol {
      margin: 12px 0;
      padding-left: 25px;
    }
    
    .content li {
      margin-bottom: 6px;
    }
    
    .content strong {
      color: #6366f1;
      font-weight: 600;
    }
    
    .content code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 10pt;
    }
    
    .content pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 15px 0;
    }
    
    .content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    
    .section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #6366f1;
    }
    
    .illustrations {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 15px;
    }
    
    .illustration {
      flex: 1;
      min-width: 250px;
      max-width: 100%;
    }
    
    .illustration img {
      width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    
    .illustration-caption {
      font-size: 10pt;
      color: #64748b;
      text-align: center;
      margin-top: 8px;
      font-style: italic;
    }
    
    .glossary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .glossary-item {
      background: #f8fafc;
      padding: 12px 15px;
      border-radius: 8px;
      border-left: 3px solid #6366f1;
    }
    
    .glossary-term {
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 5px;
    }
    
    .glossary-definition {
      font-size: 10pt;
      color: #475569;
    }
    
    .notes {
      background: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      margin-top: 15px;
    }
    
    .notes-content {
      white-space: pre-wrap;
      font-size: 10pt;
      color: #92400e;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9pt;
      color: #94a3b8;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="course-title">${escapeHtml(data.courseTitle)}</div>
    <div class="chapter-title">${escapeHtml(data.chapterTitle)}</div>
    <h1 class="lesson-title">${escapeHtml(data.lessonTitle)}</h1>
  </div>
  
  <div class="content">
    ${markdownToHtml(data.lessonContent)}
  </div>
  
  ${data.illustrations.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Illustrations</h2>
    <div class="illustrations">
      ${data.illustrations.map((ill, index) => `
        <div class="illustration">
          <img src="${ill.url}" alt="Illustration ${index + 1}" />
          ${ill.caption ? `<div class="illustration-caption">${escapeHtml(ill.caption)}</div>` : ""}
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}
  
  ${data.glossaryTerms.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Key Terms</h2>
    <div class="glossary-grid">
      ${data.glossaryTerms.map(term => `
        <div class="glossary-item">
          <div class="glossary-term">${escapeHtml(term.term)}</div>
          <div class="glossary-definition">${escapeHtml(term.definition)}</div>
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}
  
  ${data.userNotes ? `
  <div class="section">
    <h2 class="section-title">My Notes</h2>
    <div class="notes">
      <div class="notes-content">${escapeHtml(data.userNotes)}</div>
    </div>
  </div>
  ` : ""}
  
  <div class="footer">
    Generated by AI Course Creator • ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
