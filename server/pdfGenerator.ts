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
    }
    
    .content {
      margin-bottom: 30px;
      line-height: 1.8;
    }
    
    .content h1 {
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a2e;
      margin: 25px 0 15px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
    }
    
    .content h2 {
      font-size: 16pt;
      font-weight: 600;
      color: #334155;
      margin: 20px 0 12px 0;
    }
    
    .content h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #475569;
      margin: 15px 0 10px 0;
    }
    
    .content p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    .content ul, .content ol {
      margin: 12px 0 12px 30px;
      padding: 0;
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
      font-size: 9pt;
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
      border-bottom: 2px solid #6366f1;
      padding-bottom: 8px;
    }
    
    .illustrations {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
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

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000,
    });

    const page = await browser.newPage();
    // Set longer timeout for large courses with many images
    await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 60000 });
    
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
  } catch (error) {
    console.error("Error generating lesson PDF:", error);
    throw new Error(`Failed to generate lesson PDF: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


interface ChapterData {
  title: string;
  description: string;
  lessons: {
    title: string;
    content: string;
    illustrations: { url: string; caption?: string }[];
  }[];
}

interface CoursePdfData {
  title: string;
  description: string;
  topic: string;
  approach: string;
  chapters: ChapterData[];
  glossaryTerms: { term: string; definition: string }[];
  createdAt: Date;
}

export async function generateCoursePdf(data: CoursePdfData): Promise<Buffer> {
  // Calculate total lessons for TOC
  let lessonCounter = 0;
  const tocItems: { type: 'chapter' | 'lesson'; title: string; chapterNum?: number; lessonNum?: number }[] = [];
  
  data.chapters.forEach((chapter, chapterIndex) => {
    tocItems.push({ type: 'chapter', title: chapter.title, chapterNum: chapterIndex + 1 });
    chapter.lessons.forEach((lesson) => {
      lessonCounter++;
      tocItems.push({ type: 'lesson', title: lesson.title, chapterNum: chapterIndex + 1, lessonNum: lessonCounter });
    });
  });

  const totalLessons = lessonCounter;
  const totalChapters = data.chapters.length;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
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
    }
    
    /* Cover Page */
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
      color: white;
      padding: 60px;
      page-break-after: always;
    }
    
    .cover-badge {
      background: rgba(255,255,255,0.2);
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: 500;
      margin-bottom: 30px;
      backdrop-filter: blur(10px);
    }
    
    .cover-title {
      font-size: 36pt;
      font-weight: 800;
      margin-bottom: 20px;
      line-height: 1.2;
      max-width: 600px;
    }
    
    .cover-description {
      font-size: 14pt;
      opacity: 0.9;
      max-width: 500px;
      margin-bottom: 40px;
      line-height: 1.5;
    }
    
    .cover-stats {
      display: flex;
      gap: 40px;
      margin-top: 30px;
    }
    
    .cover-stat {
      text-align: center;
    }
    
    .cover-stat-value {
      font-size: 28pt;
      font-weight: 700;
    }
    
    .cover-stat-label {
      font-size: 10pt;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .cover-meta {
      margin-top: 60px;
      font-size: 10pt;
      opacity: 0.7;
    }
    
    /* Table of Contents */
    .toc-page {
      padding: 60px 50px;
      page-break-after: always;
    }
    
    .toc-title {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 40px;
      padding-bottom: 15px;
      border-bottom: 3px solid #6366f1;
    }
    
    .toc-list {
      list-style: none;
    }
    
    .toc-chapter {
      font-size: 13pt;
      font-weight: 600;
      color: #1a1a2e;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
    }
    
    .toc-chapter-num {
      background: #6366f1;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11pt;
      margin-right: 15px;
      flex-shrink: 0;
    }
    
    .toc-lesson {
      font-size: 11pt;
      color: #475569;
      padding: 8px 0 8px 43px;
      display: flex;
      align-items: center;
    }
    
    .toc-lesson-num {
      color: #6366f1;
      font-weight: 500;
      margin-right: 10px;
      min-width: 25px;
    }
    
    /* Content Pages */
    .content-page {
      padding: 50px;
    }
    
    .chapter-header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 40px;
      margin: -50px -50px 40px -50px;
      page-break-after: avoid;
    }
    
    .chapter-number {
      font-size: 12pt;
      opacity: 0.8;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .chapter-title {
      font-size: 28pt;
      font-weight: 700;
      margin-bottom: 15px;
    }
    
    .chapter-description {
      font-size: 12pt;
      opacity: 0.9;
      max-width: 600px;
    }
    
    .lesson-container {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }
    
    .lesson-header {
      border-left: 4px solid #6366f1;
      padding-left: 20px;
      margin-bottom: 25px;
    }
    
    .lesson-number {
      font-size: 10pt;
      color: #6366f1;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    
    .lesson-title {
      font-size: 20pt;
      font-weight: 700;
      color: #1a1a2e;
    }
    
    .lesson-content {
      margin-bottom: 25px;
    }
    
    .lesson-content h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #1a1a2e;
      margin: 25px 0 15px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    
    .lesson-content h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #334155;
      margin: 20px 0 12px 0;
    }
    
    .lesson-content h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #475569;
      margin: 18px 0 10px 0;
    }
    
    .lesson-content p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    .lesson-content ul, .lesson-content ol {
      margin: 12px 0;
      padding-left: 25px;
    }
    
    .lesson-content li {
      margin-bottom: 6px;
    }
    
    .lesson-content strong {
      color: #6366f1;
      font-weight: 600;
    }
    
    .lesson-content code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 10pt;
    }
    
    .lesson-content pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 15px 0;
    }
    
    .lesson-content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    
    .lesson-illustrations {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 20px;
    }
    
    .lesson-illustration {
      flex: 1;
      min-width: 200px;
      max-width: 350px;
    }
    
    .lesson-illustration img {
      width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    
    .lesson-illustration-caption {
      font-size: 9pt;
      color: #64748b;
      text-align: center;
      margin-top: 6px;
      font-style: italic;
    }
    
    /* Glossary Page */
    .glossary-page {
      padding: 50px;
      page-break-before: always;
    }
    
    .glossary-title {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid #6366f1;
    }
    
    .glossary-intro {
      font-size: 11pt;
      color: #475569;
      margin-bottom: 30px;
    }
    
    .glossary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .glossary-item {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border-left: 3px solid #6366f1;
      page-break-inside: avoid;
    }
    
    .glossary-term {
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 5px;
      font-size: 11pt;
    }
    
    .glossary-definition {
      font-size: 10pt;
      color: #475569;
      line-height: 1.5;
    }
    
    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 20px;
      left: 50px;
      right: 50px;
      text-align: center;
      font-size: 9pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }
    
    @media print {
      .cover-page {
        height: 100vh;
      }
      
      .chapter-header {
        page-break-after: avoid;
      }
      
      .lesson-container {
        page-break-inside: avoid;
      }
      
      .glossary-item {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-badge">AI-Generated Course</div>
    <h1 class="cover-title">${escapeHtml(data.title)}</h1>
    <p class="cover-description">${escapeHtml(data.description)}</p>
    <div class="cover-stats">
      <div class="cover-stat">
        <div class="cover-stat-value">${totalChapters}</div>
        <div class="cover-stat-label">Chapters</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-value">${totalLessons}</div>
        <div class="cover-stat-label">Lessons</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-value">${data.glossaryTerms.length}</div>
        <div class="cover-stat-label">Key Terms</div>
      </div>
    </div>
    <div class="cover-meta">
      Topic: ${escapeHtml(data.topic)} • Approach: ${escapeHtml(data.approach)}<br>
      Generated on ${data.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>
  
  <!-- Table of Contents -->
  <div class="toc-page">
    <h2 class="toc-title">Table of Contents</h2>
    <ul class="toc-list">
      ${data.chapters.map((chapter, chapterIndex) => `
        <li class="toc-chapter">
          <span class="toc-chapter-num">${chapterIndex + 1}</span>
          ${escapeHtml(chapter.title)}
        </li>
        ${chapter.lessons.map((lesson, lessonIndex) => `
          <li class="toc-lesson">
            <span class="toc-lesson-num">${chapterIndex + 1}.${lessonIndex + 1}</span>
            ${escapeHtml(lesson.title)}
          </li>
        `).join('')}
      `).join('')}
      ${data.glossaryTerms.length > 0 ? `
        <li class="toc-chapter" style="margin-top: 20px;">
          <span class="toc-chapter-num" style="background: #8b5cf6;">G</span>
          Glossary (${data.glossaryTerms.length} terms)
        </li>
      ` : ''}
    </ul>
  </div>
  
  <!-- Course Content -->
  ${data.chapters.map((chapter, chapterIndex) => `
    <div class="content-page">
      <div class="chapter-header">
        <div class="chapter-number">Chapter ${chapterIndex + 1}</div>
        <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
        <p class="chapter-description">${escapeHtml(chapter.description)}</p>
      </div>
      
      ${chapter.lessons.map((lesson, lessonIndex) => `
        <div class="lesson-container">
          <div class="lesson-header">
            <div class="lesson-number">Lesson ${chapterIndex + 1}.${lessonIndex + 1}</div>
            <h3 class="lesson-title">${escapeHtml(lesson.title)}</h3>
          </div>
          <div class="lesson-content">
            ${markdownToHtml(lesson.content)}
          </div>
          ${lesson.illustrations.length > 0 ? `
            <div class="lesson-illustrations">
              ${lesson.illustrations.map((ill, illIndex) => `
                <div class="lesson-illustration">
                  <img src="${ill.url}" alt="Illustration ${illIndex + 1}" />
                  ${ill.caption ? `<div class="lesson-illustration-caption">${escapeHtml(ill.caption)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}
  
  <!-- Glossary -->
  ${data.glossaryTerms.length > 0 ? `
    <div class="glossary-page">
      <h2 class="glossary-title">Glossary</h2>
      <p class="glossary-intro">
        Key terms and concepts from this course, organized alphabetically for quick reference.
      </p>
      <div class="glossary-grid">
        ${data.glossaryTerms
          .sort((a, b) => a.term.localeCompare(b.term))
          .map(term => `
            <div class="glossary-item">
              <div class="glossary-term">${escapeHtml(term.term)}</div>
              <div class="glossary-definition">${escapeHtml(term.definition)}</div>
            </div>
          `).join('')}
      </div>
    </div>
  ` : ''}
  
  <div class="page-footer">
    ${escapeHtml(data.title)} • Generated by AI Course Creator
  </div>
</body>
</html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000,
    });

    const page = await browser.newPage();
    // Set longer timeout for large courses with many images
    await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 60000 });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Error generating course PDF:", error);
    throw new Error(`Failed to generate course PDF: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
