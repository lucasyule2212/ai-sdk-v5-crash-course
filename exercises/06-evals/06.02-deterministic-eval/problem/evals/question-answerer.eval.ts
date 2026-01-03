import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { evalite } from 'evalite';

const links = [
  {
    title: 'TypeScript 5.8',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html',
  },
  {
    title: 'TypeScript 5.7',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html',
  },
  {
    title: 'TypeScript 5.6',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html',
  },
  {
    title: 'TypeScript 5.5',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html',
  },
  {
    title: 'TypeScript 5.4',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html',
  },
  {
    title: 'TypeScript 5.3',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html',
  },
  {
    title: 'TypeScript 5.2',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html',
  },
  {
    title: 'TypeScript 5.1',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html',
  },
  {
    title: 'TypeScript 5.0',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html',
  },
];

evalite('TS Release Notes', {
  data: () => [
    {
      input: 'Tell me about the TypeScript 5.8 release',
    },
    {
      input: 'Tell me about the TypeScript 5.2 release',
    },
  ],
  task: async (input) => {
    const capitalResult = await generateText({
      model: google('gemini-2.0-flash-lite'),
      prompt: `
        <task-context>
        You are a helpful assistant that can answer questions about TypeScript releases.
        </task-context>

        <question>
        ${input}
        </question>

        <links>
        ${links.map((link) => `<link>${link.title}: ${link.url}</link>`).join('\n')}
        </links> 

        <output-format>
        Answer the question, with markdown links relevant to the question.
        Format markdown links inline:
          <markdown-link-example>
          I really like [this website about cakes](https://www.cakes.com).
          </markdown-link-example>
          <markdown-link-example>
          For more information, check out [this piece of reference material](https://www.cakes.com).
          </markdown-link-example>

        Reply only with the answer, with at most 500 characters.
        </output-format>
      `,
    });

    return capitalResult.text;
  },
  scorers: [
    {
      name: 'Includes Markdown Links',
      scorer: ({ input, output, expected }) => {
        // TODO: check if the output includes markdown links
        const markdownLinksFound = output.match(/\[.*?\]\((.*?)\)/g) ?? [];

        return markdownLinksFound.length > 0 ? 1 : 0;
      },
    },
    {
      name: 'Output length',
      scorer: ({ input, output, expected }) => {
        // TODO: check if the output is less than 500 characters
        return output.length < 500 ? 1 : 0;
      },
    },
  ],
});
