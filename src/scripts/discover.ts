// Run with: APA_TOKEN="Bearer eyJ..." npx tsx src/scripts/discover.ts
// This queries the APA API to find your current team, division, and match IDs

const GRAPHQL_ENDPOINT = "https://gql.poolplayers.com/graphql";
const token = process.env.APA_TOKEN;

if (!token) {
  console.error("Set APA_TOKEN env var first");
  process.exit(1);
}

async function query(gql: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token!,
    },
    body: JSON.stringify({ query: gql, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

async function main() {
  // Step 1: Get viewer info (your teams, leagues)
  console.log("=== Fetching your profile ===\n");

  const viewerQuery = `
    query {
      viewer {
        id
        teams {
          id
          name
          number
          session {
            id
            name
          }
          matches {
            id
            type
            status
            isBye
            startTime
            home {
              id
              name
              number
            }
            away {
              id
              name
              number
            }
            division {
              id
              name
            }
          }
        }
        leagues {
          id
          name
          slug
        }
      }
    }
  `;

  const data = await query(viewerQuery);

  if (!data?.viewer) {
    console.error("Could not fetch viewer data. Token may be expired.");
    process.exit(1);
  }

  const viewer = data.viewer;
  console.log(`Member ID: ${viewer.id}`);
  console.log(`Leagues: ${JSON.stringify(viewer.leagues, null, 2)}`);
  console.log(`\n=== Your Teams ===\n`);

  for (const team of viewer.teams || []) {
    console.log(`Team: ${team.name} (ID: ${team.id}, #${team.number})`);
    console.log(`Session: ${team.session?.name || "unknown"}`);

    const completedMatches = (team.matches || []).filter(
      (m: any) => m.status === "COMPLETED" && !m.isBye
    );
    const upcomingMatches = (team.matches || []).filter(
      (m: any) => m.status !== "COMPLETED" && !m.isBye
    );

    console.log(`Completed matches: ${completedMatches.length}`);
    console.log(`Upcoming matches: ${upcomingMatches.length}`);

    if (completedMatches.length > 0) {
      console.log(`\nMatch IDs (completed):`);
      for (const m of completedMatches) {
        const div = m.division ? ` [Div ${m.division.id}: ${m.division.name}]` : "";
        console.log(
          `  ${m.id} - ${m.type} - ${m.startTime} - ${m.home.name} vs ${m.away.name}${div}`
        );
      }
    }

    // Collect unique opponent teams
    const opponents = new Map();
    for (const m of completedMatches) {
      if (m.home.id !== team.id) opponents.set(m.home.id, m.home);
      if (m.away.id !== team.id) opponents.set(m.away.id, m.away);
    }

    console.log(`\nOpponent teams in division:`);
    for (const [id, opp] of opponents) {
      console.log(`  ${opp.name} (ID: ${id}, #${opp.number})`);
    }

    console.log("\n---\n");
  }

  console.log("\n=== Summary for .env / sync config ===\n");
  const currentTeam = viewer.teams?.[0];
  if (currentTeam) {
    const firstMatch = currentTeam.matches?.find((m: any) => m.division);
    console.log(`MY_TEAM_APA_ID = ${currentTeam.id}`);
    console.log(`Session = ${currentTeam.session?.name}`);
    if (firstMatch?.division) {
      console.log(`APA_DIVISION_ID = ${firstMatch.division.id}`);
    }
  }
}

main().catch(console.error);
