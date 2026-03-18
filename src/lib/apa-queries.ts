// GraphQL query matching APA's exact website query structure
// Using the full query with fragments to ensure innings data is returned
export const MATCH_QUERY = `
  query MatchPage($id: Int!) {
    match(id: $id) {
      id
      isScored
      isFinalized
      division {
        id
        electronicScoringEnabled
        __typename
      }
      league {
        id
        esEnabled
        __typename
      }
      __typename
      type
      startTime
      week
      isBye
      isMine
      home {
        id
        name
        number
        isMine
        league { id slug __typename }
        division { id type __typename }
        roster {
          id
          memberNumber
          displayName
          matchesWon
          matchesPlayed
          ... on NineBallPlayer {
            pa
            ppm
            skillLevel
            __typename
          }
          member { id __typename }
          __typename
        }
        __typename
      }
      away {
        id
        name
        number
        isMine
        league { id slug __typename }
        division { id type __typename }
        roster {
          id
          memberNumber
          displayName
          matchesWon
          matchesPlayed
          ... on NineBallPlayer {
            pa
            ppm
            skillLevel
            __typename
          }
          member { id __typename }
          __typename
        }
        __typename
      }
      results {
        homeAway
        overUnder
        forfeits
        matchesWon
        matchesPlayed
        points {
          bonus
          penalty
          won
          adjustment
          sportsmanship
          total
          skillLevelViolationAdjustment
          __typename
        }
        scores {
          id
          player {
            id
            displayName
            __typename
          }
          matchPositionNumber
          playerPosition
          skillLevel
          innings
          defensiveShots
          eightBallWins
          eightOnBreak
          eightBallBreakAndRun
          nineBallPoints
          nineOnSnap
          nineBallBreakAndRun
          nineBallMatchPointsEarned
          winLoss
          matchForfeited
          doublesMatch
          dateTimeStamp
          teamSlot
          eightBallMatchPointsEarned
          incompleteMatch
          __typename
        }
        __typename
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
