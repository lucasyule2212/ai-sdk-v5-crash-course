import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { evalite } from 'evalite';

evalite('Capitals', {
  data: () => [
    {
      input: 'What is the capital of France?',
      expected: 'Paris',
    },
    {
      input: 'What is the capital of Germany?',
      expected: 'Berlin',
    },
    {
      input: 'What is the capital of Italy?',
      expected: 'Rome',
    },
  ],
  task: async (input) => {
    const capitalResult = await generateText({
      model: google('gemini-2.0-flash-lite'),
      prompt: `
        <task-context>
        You are a helpful assistant that answers questions about the capitals of countries.
        </task-context>

        <the-ask>
        ${input}
        </the-ask>

        <rules>
        - Answer only with the capital city.
        - Do not include any explanation or extra information.
        </rules>

        <output-format>
        Return only the name of the capital city.
        </output-format>
      `,
    })

    return capitalResult.text;
  },
  scorers: [
    {
      name: 'includes',
      scorer: ({ input, output, expected }) => {
        return output.includes(expected!) ? 1 : 0;
      },
    },
  ],
});
