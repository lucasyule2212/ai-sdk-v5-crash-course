import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamObject,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';
import { z } from 'zod';

export type MyMessage = UIMessage<
  never,
  {
    // TODO: Change the type to 'suggestions' and
    // make it an array of strings
    suggestions: string[];
  }
>;

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  const messages: UIMessage[] = body.messages;

  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const streamTextResult = streamText({
        model: google('gemini-2.0-flash'),
        messages: modelMessages,
      });

      writer.merge(streamTextResult.toUIMessageStream());

      await streamTextResult.consumeStream();

      // TODO: Change the streamText call to streamObject,
      // since we'll need to use structured outputs to reliably
      // generate multiple suggestions
      const followupSuggestionsResult = streamObject({
        model: google('gemini-2.0-flash'),
        // TODO: Define the schema for the suggestions
        // using zod
        schema: z.object({
          suggestions: z.array(z.string()),
        }),
        messages: [
          ...modelMessages,
          {
            role: 'assistant',
            content: await streamTextResult.text,
          },
          {
            role: 'user',
            content:
              // TODO: Change the prompt to tell the LLM
              // to return an array of suggestions
              'What question should I ask next? Return an array of suggested questions.',
          },
        ],
      });

      const dataPartId = crypto.randomUUID();

      let fullSuggestions = [];

      // TODO: Update this to iterate over the partialObjectStream
      for await (const chunk of followupSuggestionsResult.partialObjectStream) {
        fullSuggestions.push(...chunk.suggestions ?? []);

        // TODO: Update this to write the data part
        // with the suggestions array. You might need
        // to filter out undefined suggestions.
        writer.write({
          id: dataPartId,
          type: 'data-suggestions',
          data: fullSuggestions.filter((suggestion) => suggestion !== undefined),
        });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
