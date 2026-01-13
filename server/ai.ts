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
  
  const systemPrompt = `You are an expert curriculum designer and educator. Create comprehensive, well-structured educational courses.
Your courses should be engaging, informative, and pedagogically sound.
Always respond with valid JSON matching the exact schema provided.`;

  const userPrompt = `Create a complete course on "${topic}".

Approach: ${approachDescriptions[approach]}

Content Depth: ${contentDepthDescriptions[contentDepth]}

Structure Requirements:
- Number of chapters: ${lengthConfig.minChapters} to ${lengthConfig.maxChapters}
- Lessons per chapter: ${lessonsConfig.min} to ${lessonsConfig.max}

For each lesson:
- Write comprehensive content (500-1000 words)
- Include exactly 5-8 key terms in **bold** format within the content
- Extract those key terms with their definitions

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
  const systemPrompt = `You are an expert curriculum designer. Create comprehensive lesson content.
Always respond with valid JSON.`;

  const userPrompt = `Create lesson content for:
Course Topic: ${topic}
Chapter: ${chapterTitle}
Lesson: ${lessonTitle}

Approach: ${approachDescriptions[approach]}
Content Depth: ${contentDepthDescriptions[contentDepth]}

Requirements:
- Write comprehensive content (500-1000 words)
- Include exactly 5-8 key terms in **bold** format
- Extract those key terms with definitions

Respond with JSON:
{
  "content": "Full lesson content with **bold key terms**...",
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
