# AI Course Creator - Project TODO

## Core Infrastructure
- [x] Database schema for courses, chapters, lessons
- [x] Database schema for glossary terms and definitions
- [x] Database schema for flashcard reviews with SM-2 algorithm data
- [x] Database schema for quiz results
- [x] Database schema for user notes
- [x] Database schema for related topics (parent/child/sibling)
- [x] Database schema for user settings (API keys, preferences)
- [x] Database schema for illustrations

## Course Generation Engine
- [x] Accept topic input from users
- [x] Three pedagogical approaches: balanced, rigorous academic, easily explained
- [x] Customization options: course length (short/medium/comprehensive)
- [x] Customization options: lessons per chapter (few/moderate/many)
- [x] Customization options: content depth (introductory/intermediate/advanced)
- [x] Generate hierarchical course structure: courses → chapters → lessons
- [x] Generate lesson content with 5-8 bold key terms for glossary

## AI Integration
- [x] Built-in Manus LLM API as default
- [x] Support for Anthropic API with model selection
- [x] Support for OpenAI API with model selection
- [x] Support for OpenRouter API with model selection
- [x] Support for Grok API with model selection
- [x] AI provider router to check settings and route requests
- [x] Structured JSON schema responses for course generation

## Lesson Media Generation
- [x] Generate Media button on lesson pages
- [x] Four media types: Illustration, Infographic, Data Visualization, Diagram
- [x] Five visual style presets: minimalist, detailed, colorful, technical, modern
- [x] Context-aware image generation using lesson content
- [x] Optional custom prompts for precise control
- [x] Built-in Manus image generation API integration

## Illustration Management
- [x] Display generated illustrations in lesson pages
- [ ] Drag-and-drop reordering using @dnd-kit library
- [x] Delete and regenerate buttons with hover overlays
- [x] Maintain order indices in database
- [x] Batch operations with optimistic UI updates

## Glossary & Flashcards
- [x] Automatically extract bold terms from lesson content
- [x] Generate AI definitions for each term
- [x] Interactive glossary with clickable terms showing tooltips
- [x] Generate Flashcards button to create study cards
- [x] SM-2 spaced repetition algorithm implementation
- [x] Track flashcard reviews: ease factor, interval, repetition count
- [x] Show due flashcards, learning cards, and mastered cards
- [x] Display flashcard count badges on lesson cards

## Quizzes
- [x] Generate AI-powered quizzes at end of each lesson
- [x] 5 multiple-choice questions per quiz
- [x] 2 short-answer questions per quiz
- [x] Immediate feedback with explanations
- [x] AI-powered short-answer evaluation
- [x] Track scores and allow retakes
- [x] Show quiz completion status on lesson pages

## Knowledge Graph & Learning Paths
- [x] Analyze course content to generate related topics
- [x] Parent, sibling, child topic relationships
- [x] Wikipedia-style related topics suggestions in sidebar
- [x] Interactive knowledge graph using React Flow
- [x] Color-coded nodes: green=100%, blue=in progress, gray=not started
- [x] Directional edges: purple=parent, blue=children, gray=siblings
- [x] Foundational learning path recommendation
- [x] Momentum learning path recommendation
- [x] Breadth learning path recommendation
- [x] Depth learning path recommendation
- [x] Knowledge Graph button in main navigation

## PDF Export
- [x] Professional PDF with cover page
- [x] Table of contents
- [x] All course content with proper formatting
- [x] Embedded lesson illustrations with captions
- [x] Comprehensive alphabetically-sorted glossary section
- [x] Professional color scheme (blue primary, amber accents, slate secondary)
- [x] Markdown formatting: headings, lists, code blocks
- [x] Page numbers and footer with course title
- [x] Generation date on title page

## Progress Tracking
- [x] Completion percentage on course cards with progress bars
- [x] Track lesson completion status
- [x] Flashcard statistics: total, due, learning, mastered
- [x] Study calendar with flashcard due dates
- [x] Lesson completion history
- [x] Display learning streaks

## Note-Taking
- [x] Note-taking functionality via tabs on lesson pages
- [x] Auto-save for user notes
- [x] Store notes in database linked to lessons

## User Interface
- [x] Modern home page with gradient background
- [x] Glassmorphism effects
- [x] Sticky navigation header
- [x] Links: Knowledge Graph, Flashcards, Calendar, Library, Settings
- [x] Responsive mobile-first design with hamburger menu
- [x] Suggested topics section on home page
- [x] Theme cards by category: Technology, Science, History, Arts
- [x] Professional typography and spacing
- [x] Dialog backdrop overlays (80% opacity) with blur effects

## Settings & Configuration
- [x] Settings page accessible from main navigation
- [x] Configure preferred AI provider
- [x] Secure API key input fields with show/hide toggle
- [x] Links to provider documentation
- [x] Model selection dropdowns for each provider
- [x] Auto-save settings to database

## SEO & Discoverability
- [x] Comprehensive meta tags on home page
- [x] Semantic HTML with proper heading hierarchy
- [ ] Dynamic sitemap.xml including all courses
- [ ] Auto-update sitemap as courses are created

## Additional Features
- [x] Lesson regeneration without recreating entire course
- [x] Study All button on course pages
- [x] Clickable glossary terms with tooltip definitions
- [x] Related topics sidebar with quick course creation
- [x] Mobile-optimized touch targets (44px minimum)


## Document Import Feature
- [x] File upload endpoint for documents (PDF, DOCX, TXT, MD)
- [x] Document content extraction using appropriate parsers
- [x] Store uploaded documents in S3 with metadata in database
- [x] AI-powered content analysis to generate course structure
- [x] Import UI with drag-and-drop file upload
- [x] Progress indicator for document processing
- [x] Preview extracted content before course generation
- [x] Support for multiple document upload to create comprehensive courses
- [x] Document management (view, delete uploaded documents)


## AI Prompt Enhancements
- [x] Update course generation prompts with detailed content guidelines
- [x] Add clear instructions for bold key terms (5-8 per lesson)
- [x] Include examples and practical applications in prompts
- [x] Add important takeaways section guidance
- [x] Improve markdown formatting instructions


## Media Generation Improvements
- [x] Automatic image generation for each lesson during course creation
- [x] Display generated images in lesson view
- [x] Add "Generate More" button to add additional images
- [x] MediaGenerationDialog component for image generation options


## AI Lesson Chat Feature
- [x] AI chat box in lesson view to explain content
- [x] Context-aware responses based on lesson content
- [x] Save AI responses to notes functionality
- [x] Chat history within lesson session


## Lesson Content Formatting
- [x] Update AI prompts to generate well-structured content
- [x] Use headers (##, ###) to organize sections
- [x] Include bulleted and numbered lists where appropriate
- [x] Add clear section breaks between topics
- [x] Avoid dense paragraphs - break into digestible chunks

## AI Chatbox Enhancements
- [x] Move AI chatbox to right side of lesson content
- [x] Add suggestion buttons (explain simply, give examples, quiz me, etc.)
- [x] Improve chat layout and styling
- [x] Make suggestions contextual to lesson content


## Bug Fixes
- [x] Fix DialogTitle accessibility error on course page
- [x] Add AI chatbox to course page (CourseView)


## Lesson PDF Export Feature
- [x] Create PDF generation service on backend
- [x] Include lesson title and content with proper formatting
- [x] Embed AI-generated illustrations in PDF
- [x] Include user notes section
- [x] Include glossary terms for the lesson
- [x] Add export button to LessonView page
- [x] Show loading state during PDF generation
- [x] Trigger download when PDF is ready


## API Bug Fixes
- [x] Fix quiz.get returning undefined instead of null
- [x] Fix notes.get returning undefined instead of null
