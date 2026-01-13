import * as pdfParse from "pdf-parse";
const pdf = (pdfParse as any).default || pdfParse;
import mammoth from "mammoth";
import axios from "axios";

export interface ProcessedDocument {
  content: string;
  pageCount?: number;
  wordCount: number;
  title?: string;
}

/**
 * Extract text content from a PDF file
 */
async function extractPdfContent(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const data = await pdf(buffer);
    const content = data.text.trim();
    return {
      content,
      pageCount: data.numpages,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      title: data.info?.Title || undefined,
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract content from PDF");
  }
}

/**
 * Extract text content from a Word document (.docx)
 */
async function extractDocxContent(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value.trim();
    return {
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract content from Word document");
  }
}

/**
 * Process plain text or markdown content
 */
function extractTextContent(buffer: Buffer): ProcessedDocument {
  const content = buffer.toString("utf-8").trim();
  return {
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Download file from URL and return as buffer
 */
async function downloadFile(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000, // 60 second timeout
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error("File download error:", error);
    throw new Error("Failed to download file");
  }
}

/**
 * Main function to process a document from URL
 */
export async function processDocument(
  fileUrl: string,
  fileType: "pdf" | "docx" | "txt" | "md"
): Promise<ProcessedDocument> {
  // Download the file
  const buffer = await downloadFile(fileUrl);

  // Process based on file type
  switch (fileType) {
    case "pdf":
      return extractPdfContent(buffer);
    case "docx":
      return extractDocxContent(buffer);
    case "txt":
    case "md":
      return extractTextContent(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Validate file type from filename
 */
export function getFileType(fileName: string): "pdf" | "docx" | "txt" | "md" | null {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "txt":
      return "txt";
    case "md":
    case "markdown":
      return "md";
    default:
      return null;
  }
}

/**
 * Get MIME type for file type
 */
export function getMimeType(fileType: "pdf" | "docx" | "txt" | "md"): string {
  switch (fileType) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
  }
}

/**
 * Chunk content into smaller pieces for AI processing
 */
export function chunkContent(content: string, maxChunkSize = 8000): string[] {
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Summarize content for preview
 */
export function summarizeContent(content: string, maxLength = 500): string {
  if (content.length <= maxLength) return content;
  
  // Try to cut at a sentence boundary
  const truncated = content.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf(".");
  
  if (lastSentence > maxLength * 0.7) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  return truncated + "...";
}
