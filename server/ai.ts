import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { UserSettings } from "../drizzle/schema";

// Types for course generation
export interface CourseStructure {
  title: string;
  description: string;
  chapters: {
    title: string;
    description: string;
    lessons: {
      title: string;
      content: string;
      keyTerms: { term: string; definition: string }[];
    }[];
  }[];
  relatedTopics: {
    name: string;
    relationship: "parent" | "child" | "sibling";
    description: string;
  }[];
}

export interface QuizQuestion {
  type: "multiple_choice" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

// Approach descriptions for AI prompts
const approachDescriptions = {
  balanced: "Create a comprehensive course that balances theoretical concepts with practical applications. Include real-world examples and hands-on exercises.",
  rigorous: "Create an academically rigorous course with deep theoretical foundations. Include scholarly references, historical context, and critical analysis of concepts.",
  easy: "Create an easily explained course at a high school level. Use simple language, relatable analogies, and visual explanations. Avoid jargon and complex terminology."
};

// Course length configurations
const courseLengthConfig = {
  short: { minChapters: 3, maxChapters: 5 },
  medium: { minChapters: 6, maxChapters: 10 },
  comprehensive: { minChapters: 11, maxChapters: 15 }
};

// Lessons per chapter configurations
const lessonsPerChapterConfig = {
  few: { min: 2, max: 3 },
  moderate: { min: 4, max: 6 },
  many: { min: 7, max: 10 }
};

// Content depth descriptions
const contentDepthDescriptions = {
  introductory: "Focus on basic concepts, definitions, and foundational understanding. Suitable for beginners with no prior knowledge.",
  intermediate: "Cover applications, connections between concepts, and practical skills. Assume some foundational knowledge.",
  advanced: "Include critical analysis, synthesis of complex ideas, and expert-level insights. Assume solid foundational knowledge."
};

// Generate course structure using AI
export async function generateCourseStructure(
  topic: string,
  approach: "balanced" | "rigorous" | "easy",
  courseLength: "short" | "medium" | "comprehensive",
  lessonsPerChapter: "few" | "moderate" | "many",
  contentDepth: "introductory" | "intermediate" | "advanced",
  userSettings?: UserSettings
): Promise<CourseStructure> {
  const lengthConfig = courseLengthConfig[courseLength];
  const lessonsConfig = lessonsPerChapterConfig[lessonsPerChapter];
  
  const systemPrompt = `You are an expert educational content creator and curriculum designer. You create comprehensive, well-structured course outlines that transform learners.

Your educational philosophy:
- Write detailed educational content in markdown format
- NEVER write dense walls of text - break content into clear sections
- Use headers (## and ###) to organize major topics and subtopics
- Use bullet points and numbered lists liberally for clarity
- Keep paragraphs short (2-4 sentences max)
- Provide clear explanations appropriate for the specified depth level
- Include key concepts with thorough explanations
- Add examples and practical applications to reinforce learning
- Conclude with important takeaways that summarize key points

CRITICAL FORMATTING RULES:
1. Every lesson MUST have multiple ## headers to organize content
2. Use ### for subtopics within sections
3. Use bullet points (-) for lists of related items
4. Use numbered lists (1. 2. 3.) for sequential steps or ranked items
5. Use > blockquotes for important definitions or key insights
6. Add blank lines between sections for readability

CRITICAL GUIDELINES for key terms:
1. When introducing key technical terms, concepts, or important vocabulary for the first time, make them **bold** using markdown
2. These bold terms will become interactive glossary items with definitions
3. Choose exactly 5-8 of the most important terms to bold per lesson
4. Bold terms should be significant concepts worth studying separately
5. Only bold a term the FIRST time it appears in a lesson

Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Create a complete course on "${topic}".

Approach: ${approachDescriptions[approach]}

Content Depth: ${contentDepthDescriptions[contentDepth]}

Structure Requirements:
- Number of chapters: ${lengthConfig.minChapters} to ${lengthConfig.maxChapters}
- Lessons per chapter: ${lessonsConfig.min} to ${lessonsConfig.max}

For each lesson, write detailed educational content with this EXACT structure:

## Introduction
- Start with 1-2 sentences that hook the reader
- Briefly preview what the lesson covers

## [Main Topic 1]
### [Subtopic if needed]
- Use bullet points to list key points
- Keep explanations concise and clear
- Include a real-world example

## [Main Topic 2]
- Continue with organized sections
- Use numbered lists for steps or processes:
  1. First step
  2. Second step
  3. Third step

## Practical Applications
- How this applies in the real world
- Exercises or thought experiments
- Connections to other concepts

## Key Takeaways
- Bullet point summary of main ideas
- Most important things to remember
- Connection to next lesson or broader themes

FORMATTING REQUIREMENTS:
1. MUST use ## headers to organize every lesson into 4-6 sections
2. MUST use bullet points (-) for lists of related items
3. MUST use numbered lists for sequential steps
4. Keep paragraphs SHORT (2-4 sentences maximum)
5. Use > blockquotes for important definitions
6. Use **bold** for 5-8 key terms (first occurrence only)
7. Use *italics* for emphasis
8. Add blank lines between sections
9. NEVER write long paragraphs - break them up with lists and headers

Also generate related topics:
- 2-3 parent topics (foundational prerequisites)
- 2-3 child topics (advanced specializations)  
- 2-3 sibling topics (parallel domains)

Respond with a JSON object matching this exact structure:
{
  "title": "Course Title",
  "description": "Course description",
  "chapters": [
    {
      "title": "Chapter Title",
      "description": "Chapter description",
      "lessons": [
        {
          "title": "Lesson Title",
          "content": "Full lesson content (500-1000 words) with **bold key terms**, examples, and takeaways...",
          "keyTerms": [
            { "term": "Key Term", "definition": "Clear, concise definition of the term" }
          ]
        }
      ]
    }
  ],
  "relatedTopics": [
    { "name": "Topic Name", "relationship": "parent|child|sibling", "description": "Brief description" }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "course_structure",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Course title" },
            description: { type: "string", description: "Course description" },
            chapters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  lessons: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                        keyTerms: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              term: { type: "string" },
                              definition: { type: "string" }
                            },
                            required: ["term", "definition"],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ["title", "content", "keyTerms"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["title", "description", "lessons"],
                additionalProperties: false
              }
            },
            relatedTopics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  relationship: { type: "string", enum: ["parent", "child", "sibling"] },
                  description: { type: "string" }
                },
                required: ["name", "relationship", "description"],
                additionalProperties: false
              }
            }
          },
          required: ["title", "description", "chapters", "relatedTopics"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to generate course structure");
  }

  return JSON.parse(content) as CourseStructure;
}

// Generate quiz for a lesson
export async function generateQuiz(
  lessonTitle: string,
  lessonContent: string,
  keyTerms: { term: string; definition: string }[]
): Promise<Quiz> {
  const systemPrompt = `You are an expert educator creating assessment questions. 
Create challenging but fair questions that test understanding, not just memorization.
Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Create a quiz for the following lesson:

Title: ${lessonTitle}

Content: ${lessonContent}

Key Terms: ${keyTerms.map(t => `${t.term}: ${t.definition}`).join('\n')}

Create exactly:
- 5 multiple-choice questions (4 options each, one correct answer)
- 2 short-answer questions

Each question should:
- Test understanding of key concepts
- Include a detailed explanation for the correct answer
- Be clear and unambiguous

Respond with JSON matching this structure:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "The correct option text",
      "explanation": "Why this is correct"
    },
    {
      "type": "short_answer",
      "question": "Question text",
      "correctAnswer": "Expected answer or key points",
      "explanation": "What a good answer should include"
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quiz",
        strict: true,
        schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["multiple_choice", "short_answer"] },
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correctAnswer: { type: "string" },
                  explanation: { type: "string" }
                },
                required: ["type", "question", "correctAnswer", "explanation"],
                additionalProperties: false
              }
            }
          },
          required: ["questions"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to generate quiz");
  }

  return JSON.parse(content) as Quiz;
}

// Evaluate short answer response
export async function evaluateShortAnswer(
  question: string,
  expectedAnswer: string,
  userAnswer: string
): Promise<{ score: number; feedback: string }> {
  const systemPrompt = `You are an expert educator evaluating student responses.
Provide fair, constructive feedback. Score from 0-100.
Always respond with valid JSON.`;

  const userPrompt = `Evaluate this short answer response:

Question: ${question}

Expected Answer/Key Points: ${expectedAnswer}

Student's Answer: ${userAnswer}

Evaluate based on:
- Accuracy of key concepts
- Completeness of the answer
- Understanding demonstrated

Respond with JSON:
{
  "score": 0-100,
  "feedback": "Detailed feedback explaining the score and what could be improved"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "evaluation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            feedback: { type: "string" }
          },
          required: ["score", "feedback"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to evaluate answer");
  }

  return JSON.parse(content);
}

// Generate glossary definition
export async function generateDefinition(term: string, context: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert educator. Provide clear, concise definitions." },
      { role: "user", content: `Define "${term}" in the context of: ${context}\n\nProvide a clear, educational definition in 1-3 sentences.` }
    ]
  });

  const messageContent = response.choices[0]?.message?.content;
  return typeof messageContent === 'string' ? messageContent : `A key concept related to ${context}.`;
}

// Regenerate lesson content
export async function regenerateLesson(
  topic: string,
  chapterTitle: string,
  lessonTitle: string,
  approach: "balanced" | "rigorous" | "easy",
  contentDepth: "introductory" | "intermediate" | "advanced"
): Promise<{ content: string; keyTerms: { term: string; definition: string }[] }> {
  const systemPrompt = `You are an expert curriculum designer. Create comprehensive, well-structured lesson content.

FORMATTING RULES:
- NEVER write dense walls of text
- Use ## headers to organize content into 4-6 sections
- Use ### for subtopics
- Use bullet points (-) for lists of related items
- Use numbered lists for sequential steps
- Keep paragraphs SHORT (2-4 sentences max)
- Use > blockquotes for important definitions
- Add blank lines between sections

Always respond with valid JSON.`;

  const userPrompt = `Create lesson content for:
Course Topic: ${topic}
Chapter: ${chapterTitle}
Lesson: ${lessonTitle}

Approach: ${approachDescriptions[approach]}
Content Depth: ${contentDepthDescriptions[contentDepth]}

STRUCTURE YOUR CONTENT LIKE THIS:

## Introduction
- Hook the reader with 1-2 engaging sentences
- Preview what the lesson covers

## [Main Topic]
- Use bullet points for key points
- Keep explanations clear and concise
- Include real-world examples

## [Another Topic]
- Continue with organized sections
- Use numbered lists for steps:
  1. First step
  2. Second step

## Practical Applications
- Real-world uses
- Exercises or examples

## Key Takeaways
- Summary bullet points
- Most important concepts

REQUIREMENTS:
- Write 500-1000 words
- MUST use ## headers for 4-6 sections
- MUST use bullet points and numbered lists
- Keep paragraphs SHORT (2-4 sentences)
- Include exactly 5-8 key terms in **bold** (first occurrence only)
- Extract those key terms with definitions

Respond with JSON:
{
  "content": "## Introduction\n- Hook...\n\n## Topic...\n\n## Key Takeaways\n- ...",
  "keyTerms": [
    { "term": "Key Term", "definition": "Definition" }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "lesson",
        strict: true,
        schema: {
          type: "object",
          properties: {
            content: { type: "string" },
            keyTerms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" }
                },
                required: ["term", "definition"],
                additionalProperties: false
              }
            }
          },
          required: ["content", "keyTerms"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to regenerate lesson");
  }

  return JSON.parse(content);
}

// Media type prompts
const mediaTypePrompts = {
  illustration: "Create an educational illustration that visually represents",
  infographic: "Create an informative infographic that synthesizes and presents",
  data_visualization: "Create a data visualization or chart that represents",
  diagram: "Create a clear diagram that shows the process, structure, or relationships of"
};

// Visual style prompts
const visualStylePrompts = {
  minimalist: "minimalist style with clean lines, simple shapes, and limited color palette",
  detailed: "detailed and comprehensive style with rich textures and intricate elements",
  colorful: "vibrant and colorful style with engaging colors and dynamic composition",
  technical: "technical and precise style with accurate representations and annotations",
  modern: "modern and contemporary style with sleek design and professional aesthetics"
};

// Generate lesson media
export async function generateLessonMedia(
  lessonTitle: string,
  lessonContent: string,
  mediaType: "illustration" | "infographic" | "data_visualization" | "diagram",
  visualStyle: "minimalist" | "detailed" | "colorful" | "technical" | "modern",
  customPrompt?: string
): Promise<{ url: string }> {
  const basePrompt = customPrompt || `${mediaTypePrompts[mediaType]} the key concepts from the lesson "${lessonTitle}". The content covers: ${lessonContent.substring(0, 500)}...`;
  
  const fullPrompt = `${basePrompt}. Style: ${visualStylePrompts[visualStyle]}. Educational, clear, and professional.`;

  const result = await generateImage({
    prompt: fullPrompt
  });

  return { url: result.url || '' };
}

// Generate related topics analysis
export async function analyzeRelatedTopics(
  topic: string,
  existingTopics: string[]
): Promise<{ name: string; relationship: "parent" | "child" | "sibling"; description: string }[]> {
  const systemPrompt = `You are an expert in knowledge organization and curriculum design.
Analyze topics and identify meaningful relationships.
Always respond with valid JSON.`;

  const userPrompt = `Analyze the topic "${topic}" and suggest related topics.

Existing related topics to avoid duplicating: ${existingTopics.join(', ')}

Suggest:
- 2-3 parent topics (foundational prerequisites)
- 2-3 child topics (advanced specializations)
- 2-3 sibling topics (parallel domains)

Respond with JSON:
{
  "topics": [
    { "name": "Topic Name", "relationship": "parent|child|sibling", "description": "Brief description" }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "related_topics",
        strict: true,
        schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  relationship: { type: "string", enum: ["parent", "child", "sibling"] },
                  description: { type: "string" }
                },
                required: ["name", "relationship", "description"],
                additionalProperties: false
              }
            }
          },
          required: ["topics"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    return [];
  }

  const parsed = JSON.parse(content);
  return parsed.topics;
}


// Generate course from imported document content
export async function generateCourseFromDocument(
  documentContent: string,
  approach: "balanced" | "rigorous" | "easy",
  courseLength: "short" | "medium" | "comprehensive",
  lessonsPerChapter: "few" | "moderate" | "many",
  contentDepth: "introductory" | "intermediate" | "advanced",
  userSettings?: UserSettings
): Promise<CourseStructure> {
  const lengthConfig = courseLengthConfig[courseLength];
  const lessonsConfig = lessonsPerChapterConfig[lessonsPerChapter];
  
  // Truncate content if too long (keep first 50000 chars)
  const truncatedContent = documentContent.length > 50000 
    ? documentContent.substring(0, 50000) + "\n\n[Content truncated...]"
    : documentContent;
  
  const systemPrompt = `You are an expert educational content creator and curriculum designer. You transform source documents into comprehensive, well-structured courses that enable deep learning.

Your educational philosophy:
- Write detailed educational content in markdown format
- NEVER write dense walls of text - break content into clear sections
- Use headers (## and ###) to organize major topics and subtopics
- Use bullet points and numbered lists liberally for clarity
- Keep paragraphs short (2-4 sentences max)
- Provide clear explanations appropriate for the specified depth level
- Include key concepts with thorough explanations
- Add examples and practical applications to reinforce learning
- Conclude with important takeaways that summarize key points

CRITICAL FORMATTING RULES:
1. Every lesson MUST have multiple ## headers to organize content
2. Use ### for subtopics within sections
3. Use bullet points (-) for lists of related items
4. Use numbered lists (1. 2. 3.) for sequential steps or ranked items
5. Use > blockquotes for important definitions or key insights
6. Add blank lines between sections for readability

CRITICAL GUIDELINES for key terms:
1. When introducing key technical terms, concepts, or important vocabulary for the first time, make them **bold** using markdown
2. These bold terms will become interactive glossary items with definitions
3. Choose exactly 5-8 of the most important terms to bold per lesson
4. Bold terms should be significant concepts worth studying separately
5. Only bold a term the FIRST time it appears in a lesson

Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Transform the following document content into a comprehensive educational course.

DOCUMENT CONTENT:
${truncatedContent}

---

Create a course based on this content with the following specifications:

Approach: ${approachDescriptions[approach]}

Content Depth: ${contentDepthDescriptions[contentDepth]}

Structure Requirements:
- Number of chapters: ${lengthConfig.minChapters} to ${lengthConfig.maxChapters}
- Lessons per chapter: ${lessonsConfig.min} to ${lessonsConfig.max}

For each lesson, write detailed educational content with this EXACT structure:

## Introduction
- Start with 1-2 sentences that hook the reader
- Briefly preview what the lesson covers

## [Main Topic 1]
### [Subtopic if needed]
- Use bullet points to list key points
- Keep explanations concise and clear
- Include a real-world example

## [Main Topic 2]
- Continue with organized sections
- Use numbered lists for steps or processes:
  1. First step
  2. Second step
  3. Third step

## Practical Applications
- How this applies in the real world
- Exercises or thought experiments
- Connections to other concepts

## Key Takeaways
- Bullet point summary of main ideas
- Most important things to remember
- Connection to next lesson or broader themes

FORMATTING REQUIREMENTS:
1. MUST use ## headers to organize every lesson into 4-6 sections
2. MUST use bullet points (-) for lists of related items
3. MUST use numbered lists for sequential steps
4. Keep paragraphs SHORT (2-4 sentences maximum)
5. Use > blockquotes for important definitions
6. Use **bold** for 5-8 key terms (first occurrence only)
7. Use *italics* for emphasis
8. Add blank lines between sections
9. NEVER write long paragraphs - break them up with lists and headers

Also generate related topics:
- 2-3 parent topics (foundational prerequisites)
- 2-3 child topics (advanced specializations)
- 2-3 sibling topics (parallel domains)

Respond with a JSON object matching this exact structure:
{
  "title": "Course Title (derived from document)",
  "description": "Course description",
  "chapters": [
    {
      "title": "Chapter Title",
      "description": "Chapter description",
      "lessons": [
        {
          "title": "Lesson Title",
          "content": "Full lesson content with **bold key terms**...",
          "keyTerms": [
            { "term": "Key Term", "definition": "Definition of the term" }
          ]
        }
      ]
    }
  ],
  "relatedTopics": [
    { "name": "Topic Name", "relationship": "parent|child|sibling", "description": "Brief description" }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "course_structure",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Course title" },
            description: { type: "string", description: "Course description" },
            chapters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  lessons: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                        keyTerms: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              term: { type: "string" },
                              definition: { type: "string" }
                            },
                            required: ["term", "definition"],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ["title", "content", "keyTerms"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["title", "description", "lessons"],
                additionalProperties: false
              }
            },
            relatedTopics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  relationship: { type: "string", enum: ["parent", "child", "sibling"] },
                  description: { type: "string" }
                },
                required: ["name", "relationship", "description"],
                additionalProperties: false
              }
            }
          },
          required: ["title", "description", "chapters", "relatedTopics"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to generate course from document");
  }

  return JSON.parse(content) as CourseStructure;
}

// Analyze document content to extract summary and suggested course structure
export async function analyzeDocumentContent(
  documentContent: string
): Promise<{
  suggestedTitle: string;
  summary: string;
  mainTopics: string[];
  estimatedChapters: number;
  recommendedApproach: "balanced" | "rigorous" | "easy";
  recommendedDepth: "introductory" | "intermediate" | "advanced";
}> {
  // Truncate content if too long
  const truncatedContent = documentContent.length > 30000 
    ? documentContent.substring(0, 30000) + "\n\n[Content truncated...]"
    : documentContent;

  const systemPrompt = `You are an expert content analyst and curriculum designer.
Analyze document content and provide insights for course creation.
Always respond with valid JSON.`;

  const userPrompt = `Analyze the following document content and provide recommendations for creating an educational course:

DOCUMENT CONTENT:
${truncatedContent}

---

Provide:
1. A suggested course title
2. A brief summary of the content (2-3 sentences)
3. Main topics covered (list of 5-10 key topics)
4. Estimated number of chapters needed
5. Recommended pedagogical approach (balanced, rigorous, or easy)
6. Recommended content depth (introductory, intermediate, or advanced)

Respond with JSON:
{
  "suggestedTitle": "Course Title",
  "summary": "Brief summary of the document content",
  "mainTopics": ["Topic 1", "Topic 2", ...],
  "estimatedChapters": 5,
  "recommendedApproach": "balanced|rigorous|easy",
  "recommendedDepth": "introductory|intermediate|advanced"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            suggestedTitle: { type: "string" },
            summary: { type: "string" },
            mainTopics: { type: "array", items: { type: "string" } },
            estimatedChapters: { type: "integer" },
            recommendedApproach: { type: "string", enum: ["balanced", "rigorous", "easy"] },
            recommendedDepth: { type: "string", enum: ["introductory", "intermediate", "advanced"] }
          },
          required: ["suggestedTitle", "summary", "mainTopics", "estimatedChapters", "recommendedApproach", "recommendedDepth"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to analyze document");
  }

  return JSON.parse(content);
}


// AI Chat for lesson explanations
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatAboutLesson(
  lessonTitle: string,
  lessonContent: string,
  messages: ChatMessage[],
  userSettings?: UserSettings
): Promise<string> {
  const systemPrompt = `You are an expert educational tutor helping a student understand the lesson "${lessonTitle}".

LESSON CONTENT:
${lessonContent.substring(0, 8000)}

---

Your role is to:
1. Answer questions about the lesson content clearly and accurately
2. Provide additional examples and explanations when asked
3. Help clarify confusing concepts
4. Connect ideas to real-world applications
5. Encourage deeper understanding through Socratic questioning when appropriate

Keep your responses:
- Focused on the lesson content
- Clear and easy to understand
- Supportive and encouraging
- Well-formatted with markdown when helpful

If the student asks about something not covered in the lesson, acknowledge it and try to relate it back to the lesson content or suggest they explore it further.`;

  // Build messages array with system prompt
  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.filter(m => m.role !== "system")
  ];

  const response = await invokeLLM({
    messages: fullMessages.map(m => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content
    }))
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to get AI response");
  }

  return content;
}


// Chat about a course (overview level)
export async function chatAboutCourse(
  courseTitle: string,
  courseDescription: string,
  chapters: { title: string; lessons: string[] }[],
  messages: ChatMessage[],
  userSettings?: UserSettings
): Promise<string> {
  const chapterOutline = chapters.map((ch, i) => 
    `Chapter ${i + 1}: ${ch.title}\n  Lessons: ${ch.lessons.join(", ")}`
  ).join("\n");

  const systemPrompt = `You are an expert educational advisor helping a student understand the course "${courseTitle}".

COURSE DESCRIPTION:
${courseDescription}

COURSE STRUCTURE:
${chapterOutline}

---

Your role is to:
1. Provide an overview of what the course covers
2. Explain prerequisites and what students should know beforehand
3. Suggest study strategies and learning paths
4. Answer questions about the course structure and content
5. Help students understand how different chapters and lessons connect
6. Recommend which lessons to focus on based on student goals

Keep your responses:
- Helpful and encouraging
- Focused on the course as a whole
- Clear about what each section covers
- Well-formatted with markdown when helpful

If asked about specific lesson content, suggest they open that lesson for detailed information.`;

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.filter(m => m.role !== "system")
  ];

  const response = await invokeLLM({
    messages: fullMessages.map(m => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content
    }))
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to get AI response");
  }

  return content;
}
