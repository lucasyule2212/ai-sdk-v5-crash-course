import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const INPUT = `Do some research on induction hobs and how I can replace a 100cm wide AGA cooker with an induction range cooker. Which is the cheapest, which is the best?`;

// NOTE: A good output would be: "Induction hobs vs AGA cookers"

const result = await streamText({
  model: google('gemini-2.0-flash-lite'),
  // TODO: Rewrite this prompt using the Anthropic template from
  // the previous exercise.
  // You will NOT need all of the sections from the template.
  prompt: `

  <task-context>
    You are a helpful assistant that can generate titles for conversations.
  </task-context>

  <rules>
    Find the most concise title that captures the essence of the conversation.
    Titles should be at most 30 characters.
    Titles should be formatted in sentence case, with capital letters at the start of each word. Do not provide a period at the end.
  </rules>

  <the-ask>
    Here is the user's question:
    <question>
        ${INPUT}
    </question>
    How do you respond to the user's question?
  </the-ask>

  <output-format>
    Return only the title.
  </output-format>
  `,
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
