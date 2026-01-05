import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';

const ADVANCED_MODEL = google('gemini-2.0-flash');
const BASIC_MODEL = google('gemini-2.0-flash-lite');

export type MyMessage = UIMessage<{
  model: 'advanced' | 'basic';
}>;

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  const messages: MyMessage[] = body.messages;

  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      console.time('Model Calculation Time');
      // TODO: Use generateText to call a model, passing in the modelMessages
      // and writing your own system prompt.
      const modelRouterResult = await generateText({
        model: google('gemini-2.0-flash-lite'),
        system: `
          You are a model router. Your job is to figure out whether to use an advanced model or a basic model.
          <rules>
            - If the question is about something trivial, use the basic model.
            - If the question involves any kind of counting or math, use the advanced model.
          </rules>
          <output-format>
            Return a single number: 0 or 1.
            Return 0 to choose the basic model.
            Return 1 to choose the advanced model.
          </output-format>
          `,
        messages: modelMessages,
      });

      console.timeEnd('Model Calculation Time');
      console.log(
        'modelRouterResult',
        modelRouterResult.text.trim(),
      );

      // TODO: Use the modelRouterResult to determine which model to use.
      // If we can't determine which model to use, use the basic model.
      const modelSelected: 'advanced' | 'basic' = modelRouterResult.text.trim() === '1' ? 'advanced' : 'basic';

      const streamTextResult = streamText({
        model:
          modelSelected === 'advanced'
            ? ADVANCED_MODEL
            : BASIC_MODEL,
        messages: modelMessages,
      });

      writer.merge(
        streamTextResult.toUIMessageStream({
          // TODO: Add the model to the message metadata, so that
          // the frontend can display it.
          messageMetadata: ({ part }) => {
            if (part.type === 'start') {
              return {
                model: modelSelected,
              };
            }
          },
        }),
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
