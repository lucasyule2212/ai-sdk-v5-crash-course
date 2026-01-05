import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse, streamObject,
  streamText,
  type ModelMessage,
  type UIMessage,
  type UIMessageStreamWriter
} from 'ai';
import { tavily } from '@tavily/core';
import z from 'zod';

export type MyMessage = UIMessage<
  unknown,
  {
    queries: string[];
    plan: string;
  }
>;

const generateQueriesForTavily = (
  modelMessages: ModelMessage[],
) => {
  // TODO: Use streamObject to generate a plan for the search,
  // AND the queries to search the web for information.
  // The plan should identify the groups of information required
  // to answer the question.
  // The plan should list pieces of information that are required
  // to answer the question, then consider how to break down the
  // information into queries.
  // Generate 3-5 queries that are relevant to the conversation history.
  // Reply as a JSON object with the following properties:
  // - plan: A string describing the plan for the queries.
  // - queries: An array of strings, each representing a query.
  const queriesResult = streamObject({
    model: google('gemini-2.0-flash-lite'),
    system: `
      You are a helpful assistant that generates queries to search the web for information.
      <rules>
        Make a plan before you generate the queries. The plan should identify the groups of information required to answer the question.
        The plan should list pieces of information that are required to answer the question, then consider how to break down the information into queries.
      </rules>
      Generate 3-5 queries that are relevant to the conversation history.
      <output-format>
        Reply as a JSON object with the following properties:
        - plan: A string describing the plan for the queries.
        - queries: An array of strings, each representing a query.
      </output-format>
    `,
    schema: z.object({
      plan: z.string(),
      queries: z.array(z.string()),
    }),
    messages: modelMessages,
  });

  return queriesResult;
};

const displayQueriesInFrontend = async (
  queriesResult: ReturnType<typeof generateQueriesForTavily>,
  writer: UIMessageStreamWriter<MyMessage>,
) => {
  const queriesPartId = crypto.randomUUID();
  const planPartId = crypto.randomUUID();

  for await (const part of queriesResult.partialObjectStream) {
    // TODO: Stream the queries and plan to the frontend
    if (part.plan) {
      writer.write({
        type: 'data-plan',
        data: part.plan,
        id: planPartId,
      });
    }
    
    if (part.queries) {
      writer.write({
        type: 'data-queries',
        data: part.queries.filter((query) => typeof query === 'string'),
        id: queriesPartId,
      });
    }
  }
};

const callTavilyToGetSearchResults = async (
  queries: string[],
) => {
  const tavilyClient = tavily({
    apiKey: process.env.TAVILY_API_KEY,
  });

  const searchResults = await Promise.all(
    queries.map(async (query) => {
      const response = await tavilyClient.search(query, {
        maxResults: 5,
      });

      return {
        query,
        response,
      };
    }),
  );

  return searchResults;
};

const streamFinalSummary = async (
  searchResults: Awaited<
    ReturnType<typeof callTavilyToGetSearchResults>
  >,
  messages: ModelMessage[],
  writer: UIMessageStreamWriter<MyMessage>,
) => {
  // TODO: Use streamText to generate a final response to the user.
  // The response should be a summary of the search results,
  // and the sources of the information.
  const answerResult =  streamText({
    model: google('gemini-2.0-flash-lite'),
    system: `
      You are a helpful assistant that generates a final response to the user.
      <rules>
        You should use the search results to answer the question.
        Use sources from the search results to answer the question.
        Sources should be cited as markdown links.
      </rules>
      <output-format>
        Use markdown formatting.
      </output-format>
    `,
    messages: messages,
  });

  writer.merge(
    // NOTE: We send sendStart: false because we've already
    // sent the 'start' message part to the frontend.
    answerResult.toUIMessageStream({ sendStart: false }),
  );
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const modelMessages = convertToModelMessages(messages);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const queriesResult =
        generateQueriesForTavily(modelMessages);

      await displayQueriesInFrontend(queriesResult, writer);

      const scrapedPages = await callTavilyToGetSearchResults(
        (await queriesResult.object).queries,
      );

      await streamFinalSummary(
        scrapedPages,
        modelMessages,
        writer,
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
