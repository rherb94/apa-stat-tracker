// GraphQL query to fetch detailed match data including individual player scores
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

// GraphQL query to fetch division schedule with all match IDs
export const DIVISION_SCHEDULE_QUERY = `
  query DivisionSchedule($divisionId: Int!) {
    division(id: $divisionId) {
      id
      name
      schedule {
        id
        date: startTime
        status
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
