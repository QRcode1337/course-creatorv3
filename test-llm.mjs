import { config } from 'dotenv';
config();

const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

console.log('Forge API URL:', forgeApiUrl ? forgeApiUrl.substring(0, 30) + '...' : 'NOT SET');
console.log('Forge API Key:', forgeApiKey ? forgeApiKey.substring(0, 10) + '...' : 'NOT SET');

const apiUrl = forgeApiUrl && forgeApiUrl.trim().length > 0
  ? `${forgeApiUrl.replace(/\/$/, '')}/v1/chat/completions`
  : 'https://forge.manus.im/v1/chat/completions';

console.log('Full API URL:', apiUrl);

// Test 1: Simple LLM call
console.log('\n--- Test 1: Simple LLM call ---');
try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${forgeApiKey}`,
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Say hello in one word' }],
      max_tokens: 100,
      thinking: { budget_tokens: 128 },
    }),
  });

  console.log('Status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error body:', errorText);
  } else {
    const result = await response.json();
    console.log('Response:', result.choices?.[0]?.message?.content);
    console.log('Model:', result.model);
  }
} catch (e) {
  console.error('Fetch error:', e.message);
}

// Test 2: JSON schema response (like course generation)
console.log('\n--- Test 2: JSON schema response ---');
try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${forgeApiKey}`,
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a course creator. Respond with valid JSON.' },
        { role: 'user', content: 'Create a very short course outline on "Basic Math" with 1 chapter and 1 lesson. Respond with JSON: {"title":"...","description":"...","chapters":[{"title":"...","description":"...","lessons":[{"title":"...","content":"short content","keyTerms":[{"term":"...","definition":"..."}]}]}],"relatedTopics":[{"name":"...","relationship":"parent","description":"..."}]}' },
      ],
      max_tokens: 4096,
      thinking: { budget_tokens: 128 },
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'course_structure',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              chapters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    lessons: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          content: { type: 'string' },
                          keyTerms: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                term: { type: 'string' },
                                definition: { type: 'string' },
                              },
                              required: ['term', 'definition'],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ['title', 'content', 'keyTerms'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['title', 'description', 'lessons'],
                  additionalProperties: false,
                },
              },
              relatedTopics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    relationship: { type: 'string', enum: ['parent', 'child', 'sibling'] },
                    description: { type: 'string' },
                  },
                  required: ['name', 'relationship', 'description'],
                  additionalProperties: false,
                },
              },
            },
            required: ['title', 'description', 'chapters', 'relatedTopics'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  console.log('Status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error body:', errorText);
  } else {
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    console.log('Content type:', typeof content);
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        console.log('Parsed title:', parsed.title);
        console.log('Chapters:', parsed.chapters?.length);
        console.log('SUCCESS: JSON schema response works!');
      } catch (e) {
        console.error('JSON parse error:', e.message);
        console.log('Raw content:', content.substring(0, 500));
      }
    } else {
      console.log('Content is not a string:', JSON.stringify(content).substring(0, 500));
    }
  }
} catch (e) {
  console.error('Fetch error:', e.message);
}
