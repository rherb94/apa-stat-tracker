import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  apaId: integer("apa_id").notNull().unique(),
  name: text("name").notNull(),
  leagueId: integer("league_id").notNull(),
  sessionName: text("session_name").notNull(),
  format: text("format").notNull(), // "NINE" or "EIGHT"
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  apaId: integer("apa_id").notNull().unique(),
  name: text("name").notNull(),
  number: text("number"),
  divisionId: integer("division_id").references(() => divisions.id),
  isMine: boolean("is_mine").notNull().default(false),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  apaId: integer("apa_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  currentSkillLevel: integer("current_skill_level"),
});

export const matchResults = pgTable(
  "match_results",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").notNull(),
    matchDate: timestamp("match_date"),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    teamId: integer("team_id").references(() => teams.id),
    opponentId: integer("opponent_id").references(() => players.id),
    opponentTeamId: integer("opponent_team_id").references(() => teams.id),
    skillLevel: integer("skill_level").notNull(),
    opponentSkillLevel: integer("opponent_skill_level"),
    innings: integer("innings").notNull(),
    defensiveShots: integer("defensive_shots").notNull(),
    points: integer("points").notNull(),
    opponentPoints: integer("opponent_points"),
    winLoss: text("win_loss").notNull(), // "W" or "L"
    matchPositionNumber: integer("match_position_number"),
    format: text("format").notNull().default("NINE"),
  },
  (table) => [unique("match_player_unique").on(table.matchId, table.playerId)]
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Relations
export const divisionsRelations = relations(divisions, ({ many }) => ({
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  division: one(divisions, {
    fields: [teams.divisionId],
    references: [divisions.id],
  }),
  matchResults: many(matchResults, { relationName: "teamResults" }),
}));

export const playersRelations = relations(players, ({ many }) => ({
  matchResults: many(matchResults, { relationName: "playerResults" }),
}));

export const matchResultsRelations = relations(matchResults, ({ one }) => ({
  player: one(players, {
    fields: [matchResults.playerId],
    references: [players.id],
    relationName: "playerResults",
  }),
  team: one(teams, {
    fields: [matchResults.teamId],
    references: [teams.id],
    relationName: "teamResults",
  }),
  opponent: one(players, {
    fields: [matchResults.opponentId],
    references: [players.id],
  }),
  opponentTeam: one(teams, {
    fields: [matchResults.opponentTeamId],
    references: [teams.id],
  }),
}));
