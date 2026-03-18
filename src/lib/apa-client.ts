const GRAPHQL_ENDPOINT = "https://gql.poolplayers.com/graphql";

export async function apaGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const token = process.env.APA_TOKEN;
  if (!token) {
    throw new Error("APA_TOKEN environment variable is not set");
  }

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
    throw new Error(
      `APA GraphQL error: ${result.errors.map((e: { message: string }) => e.message).join(", ")}`
    );
  }

  return result.data;
}
