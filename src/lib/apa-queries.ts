// GraphQL query to fetch detailed match data including individual player scores
// This query is proven to work from the existing scraper
export const MATCH_QUERY = `
  query MatchPage($id: Int!) {
    match(id: $id) {
      id
      isScored
      date: startTime
      home {
        id
        name
        number
        roster {
          id
          displayName
          skillLevel
        }
      }
      away {
        id
        name
        number
        roster {
          id
          displayName
          skillLevel
        }
      }
      results {
        scores {
          id
          player {
            id
            displayName
          }
          matchPositionNumber
          skillLevel
          innings
          defensiveShots
          nineBallPoints
          winLoss
        }
      }
    }
  }
`;

// GraphQL query to get all teams in a division (from the APA standings page)
export const DIVISION_STANDINGS_QUERY = `
  query divsionStandings($id: Int!) {
    division(id: $id) {
      id
      teams {
        id
        name
        number
        standing
        sessionTotalPoints
        totalTeamMatchesPlayed
        isBye
        __typename
      }
      __typename
    }
  }
`;

// GraphQL query to fetch a team's matches for a session
export const TEAM_MATCHES_QUERY = `
  query TeamMatches($teamId: Int!) {
    team(id: $teamId) {
      id
      name
      number
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
      }
    }
  }
`;
