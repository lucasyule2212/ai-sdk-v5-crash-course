import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { fileSystemTools } from './file-system-functionality.ts';
import z from 'zod';

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: convertToModelMessages(messages),
    system: `
      You are a helpful assistant that can use a sandboxed file system to create, edit and delete files.

      You have access to the following tools:
      - writeFile
      - readFile
      - deletePath
      - listDirectory
      - createDirectory
      - exists
      - searchFiles

      Use these tools to record notes, create todo lists, and edit documents for the user.

      Use markdown files to store information.
    `,
    // TODO: add the tools to the streamText call,
    tools: {
      writeFile: tool({
        name: 'writeFile',
        description: 'Write to a file',
        inputSchema: z.object({
          path: z.string().describe('The path to the file to create'),
          content: z.string().describe('The content of the file to create'),
        }),
        execute: async ({ path, content }) => {
          return fileSystemTools.writeFile(path, content);
        },
      }),
      readFile: tool({
        name: 'readFile',
        description: 'Read a file',
        inputSchema: z.object({
          path: z.string().describe('The path to the file to read'),
        }),
        execute: async ({ path }) => {
          return fileSystemTools.readFile(path);
        },
      }),
      deletePath: tool({
        name: 'deletePath',
        description: 'Delete a file or directory',
        inputSchema: z.object({
          path: z.string().describe('The path to the file or directory to delete'),
        }),
        execute: async ({ path }) => {
          return fileSystemTools.deletePath(path);
        },
      }),
      listDirectory: tool({
        name: 'listDirectory',
        description: 'List a directory',
        inputSchema: z.object({
          path: z.string().describe('The path to the directory to list'),
        }),
        execute: async ({ path }) => {
          return fileSystemTools.listDirectory(path);
        },
      }),
      createDirectory: tool({
        name: 'createDirectory',
        description: 'Create a directory',
        inputSchema: z.object({
          path: z.string().describe('The path to the directory to create'),
        }),
        execute: async ({ path }) => {
          return fileSystemTools.createDirectory(path);
        },
      }),
      exists: tool({
        name: 'exists',
        description: 'Check if a file or directory exists',
        inputSchema: z.object({
          path: z.string().describe('The path to the file or directory to check'),
        }),
        execute: async ({ path }) => {
          return fileSystemTools.exists(path);
        },
      }),
      searchFiles: tool({
        name: 'searchFiles',
        description: 'Search for files',
        inputSchema: z.object({
          pattern: z.string().describe('The pattern to search for'),
        }),
        execute: async ({ pattern }) => {
          return fileSystemTools.searchFiles(pattern);
        },
      }),
    },
    // TODO: add a custom stop condition to the streamText call
    // to force the agent to stop after 10 steps have been taken
    stopWhen: [stepCountIs(10)],
  });

  return result.toUIMessageStreamResponse();
};
