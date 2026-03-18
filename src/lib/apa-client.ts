import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

const GRAPHQL_ENDPOINT = "https://gql.poolplayers.com/graphql";

async function getToken(): Promise<string> {
  // Check DB first (set via admin UI)
  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, "apa_token"),
    });
    if (row?.value) return row.value;
  } catch {
    // DB might not be available, fall through
  }

  // Fall back to env var
  const envToken = process.env.APA_TOKEN;
  if (envToken) return envToken;

  throw new Error("No APA token found. Set it on the Admin page or in APA_TOKEN env var.");
}

export async function apaGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const token = await getToken();

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`APA API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    const messages = result.errors.map((e: { message: string }) => e.message).join(", ");
    // If token is invalid, give a clearer message
    if (messages.toLowerCase().includes("token") || messages.toLowerCase().includes("auth") || messages.toLowerCase().includes("valid")) {
      throw new Error(`APA GraphQL error: ${messages}. Token may be expired — grab a fresh one from poolplayers.com and save it on the Admin page.`);
    }
    throw new Error(`APA GraphQL error: ${messages}`);
  }

  return result.data;
}
