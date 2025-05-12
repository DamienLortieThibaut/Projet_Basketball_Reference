import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

interface Player {
  points?: string
  field_goals?: string
  field_goal_attempts?: string
  free_throws?: string
  free_throw_attempts?: string
  three_point_field_goals?: string
  three_point_field_goal_attempts?: string
  rebounds?: string
  assists?: string
  steals?: string
  blocks?: string
  turnovers?: string
  personal_fouls?: string
  minutes?: string
  [key: string]: any
}

interface PlayerStats {
  player_name: string
  team: string
  matches: number
  total_points: number
  total_field_goals: number
  total_field_goal_attempts: number
  total_free_throws: number
  total_free_throw_attempts: number
  total_three_point_field_goals: number
  total_three_point_field_goal_attempts: number
  total_rebounds: number
  total_assists: number
  total_steals: number
  total_blocks: number
  total_turnovers: number
  total_personal_fouls: number
  total_minutes: number
  clutchScore: number
  points: number
  field_goals: number
  field_goal_attempts: number
  free_throws: number
  free_throw_attempts: number
  three_point_field_goals: number
  three_point_field_goal_attempts: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  personal_fouls: number
  minutes: number
  [key: string]: any
}

/**
 * Calculate a "clutch score" for a player based on their 4th quarter/overtime performance
 * This is a custom formula that weights different aspects of clutch performance
 */
// export function calculateClutchScore(player: Player): number {
//   // Convert string values to numbers, defaulting to 0 if missing
//   const points = Number.parseInt(player.points || "0")
//   const fieldGoals = Number.parseInt(player.field_goals || "0")
//   const fieldGoalAttempts = Number.parseInt(player.field_goal_attempts || "0")
//   const freeThrows = Number.parseInt(player.free_throws || "0")
//   const freeThrowAttempts = Number.parseInt(player.free_throw_attempts || "0")
//   const threePointers = Number.parseInt(player.three_point_field_goals || "0")
//   const threePointerAttempts = Number.parseInt(player.three_point_field_goal_attempts || "0")
//   const rebounds = Number.parseInt(player.rebounds || "0")
//   const assists = Number.parseInt(player.assists || "0")
//   const steals = Number.parseInt(player.steals || "0")
//   const blocks = Number.parseInt(player.blocks || "0")
//   const turnovers = Number.parseInt(player.turnovers || "0")

//   // Calculate shooting percentages (avoid division by zero)
//   const fieldGoalPercentage = fieldGoalAttempts > 0 ? fieldGoals / fieldGoalAttempts : 0
//   const freeThrowPercentage = freeThrowAttempts > 0 ? freeThrows / freeThrowAttempts : 0
//   const threePointPercentage = threePointerAttempts > 0 ? threePointers / threePointerAttempts : 0

//   // Calculate minutes played (if available)
//   let minutesPlayed = 0
//   if (player.minutes) {
//     const minutesParts = player.minutes.split(":")
//     if (minutesParts.length === 2) {
//       minutesPlayed = Number.parseInt(minutesParts[0]) + Number.parseInt(minutesParts[1]) / 60
//     }
//   }

//   // Calculate efficiency per minute (if minutes data is available)
//   const minutesFactor = minutesPlayed > 0 ? 5 / minutesPlayed : 1

//   // Clutch score formula components with weights
//   const scoringComponent = points * 1.0
//   const efficiencyComponent = fieldGoalPercentage * 10 + freeThrowPercentage * 5 + threePointPercentage * 15
//   const impactComponent = rebounds * 0.5 + assists * 0.7 + steals * 1.2 + blocks * 1.2 - turnovers * 1.0

//   // Calculate final clutch score
//   // If we have minutes data, we normalize by minutes played
//   let clutchScore = scoringComponent + efficiencyComponent + impactComponent

//   if (minutesPlayed > 0) {
//     // Adjust score based on minutes played (reward efficiency in limited minutes)
//     clutchScore = clutchScore * minutesFactor
//   }

//   // Ensure score is positive and has a reasonable scale
//   return Math.max(0, clutchScore)
// }

/**
 * Calculate a "clutch score" for a player based only on raw performance metrics,
 * ignoring minutes played (no normalization).
 */
export function calculateClutchScore(player: Player): number {
  // Convert string values to numbers, defaulting to 0 if missing
  const points = Number.parseInt(player.points || "0");
  const fieldGoals = Number.parseInt(player.field_goals || "0");
  const fieldGoalAttempts = Number.parseInt(player.field_goal_attempts || "0");
  const freeThrows = Number.parseInt(player.free_throws || "0");
  const freeThrowAttempts = Number.parseInt(player.free_throw_attempts || "0");
  const threePointers = Number.parseInt(player.three_point_field_goals || "0");
  const threePointerAttempts = Number.parseInt(player.three_point_field_goal_attempts || "0");
  const rebounds = Number.parseInt(player.rebounds || "0");
  const assists = Number.parseInt(player.assists || "0");
  const steals = Number.parseInt(player.steals || "0");
  const blocks = Number.parseInt(player.blocks || "0");
  const turnovers = Number.parseInt(player.turnovers || "0");

  // Shooting percentages
  const fieldGoalPercentage = fieldGoalAttempts > 0 ? fieldGoals / fieldGoalAttempts : 0;
  const freeThrowPercentage = freeThrowAttempts > 0 ? freeThrows / freeThrowAttempts : 0;
  const threePointPercentage = threePointerAttempts > 0 ? threePointers / threePointerAttempts : 0;

  // Scoring, efficiency and impact components
  const scoringComponent = points * 1.0;
  const efficiencyComponent = fieldGoalPercentage * 10 + freeThrowPercentage * 5 + threePointPercentage * 15;
  const impactComponent = rebounds * 0.5 + assists * 0.7 + steals * 1.2 + blocks * 1.2 - turnovers * 1.0;

  // Final clutch score without minutes normalization
  const clutchScore = scoringComponent + efficiencyComponent + impactComponent;

  return Math.max(0, clutchScore);
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculatePlayerAverages(players: Player[]): PlayerStats[] {
  const playerMap = new Map<string, PlayerStats>()

  // Initialize player stats
  players.forEach((player) => {
    if (!playerMap.has(player.player_name)) {
      playerMap.set(player.player_name, {
        player_name: player.player_name,
        team: player.team,
        matches: 0,
        total_points: 0,
        total_field_goals: 0,
        total_field_goal_attempts: 0,
        total_free_throws: 0,
        total_free_throw_attempts: 0,
        total_three_point_field_goals: 0,
        total_three_point_field_goal_attempts: 0,
        total_rebounds: 0,
        total_assists: 0,
        total_steals: 0,
        total_blocks: 0,
        total_turnovers: 0,
        total_personal_fouls: 0,
        total_minutes: 0,
        clutchScore: 0,
        points: 0,
        field_goals: 0,
        field_goal_attempts: 0,
        free_throws: 0,
        free_throw_attempts: 0,
        three_point_field_goals: 0,
        three_point_field_goal_attempts: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        personal_fouls: 0,
        minutes: 0
      })
    }

    const stats = playerMap.get(player.player_name)!
    stats.matches++

    // Add stats to totals
    stats.total_points += Number.parseInt(player.points || "0")
    stats.total_field_goals += Number.parseInt(player.field_goals || "0")
    stats.total_field_goal_attempts += Number.parseInt(player.field_goal_attempts || "0")
    stats.total_free_throws += Number.parseInt(player.free_throws || "0")
    stats.total_free_throw_attempts += Number.parseInt(player.free_throw_attempts || "0")
    stats.total_three_point_field_goals += Number.parseInt(player.three_point_field_goals || "0")
    stats.total_three_point_field_goal_attempts += Number.parseInt(player.three_point_field_goal_attempts || "0")
    stats.total_rebounds += Number.parseInt(player.rebounds || "0")
    stats.total_assists += Number.parseInt(player.assists || "0")
    stats.total_steals += Number.parseInt(player.steals || "0")
    stats.total_blocks += Number.parseInt(player.blocks || "0")
    stats.total_turnovers += Number.parseInt(player.turnovers || "0")
    stats.total_personal_fouls += Number.parseInt(player.personal_fouls || "0")

    // Calculate minutes
    if (player.minutes) {
      const minutesParts = player.minutes.split(":")
      if (minutesParts.length === 2) {
        stats.total_minutes += Number.parseInt(minutesParts[0]) + Number.parseInt(minutesParts[1]) / 60
      }
    }

    // Calculate clutch score for this match
    const matchClutchScore = calculateClutchScore(player)
    stats.clutchScore += matchClutchScore
  })

  // Calculate averages and convert to numbers
  return Array.from(playerMap.values()).map(stats => ({
    ...stats,
    points: stats.total_points / stats.matches,
    field_goals: stats.total_field_goals / stats.matches,
    field_goal_attempts: stats.total_field_goal_attempts / stats.matches,
    free_throws: stats.total_free_throws / stats.matches,
    free_throw_attempts: stats.total_free_throw_attempts / stats.matches,
    three_point_field_goals: stats.total_three_point_field_goals / stats.matches,
    three_point_field_goal_attempts: stats.total_three_point_field_goal_attempts / stats.matches,
    rebounds: stats.total_rebounds / stats.matches,
    assists: stats.total_assists / stats.matches,
    steals: stats.total_steals / stats.matches,
    blocks: stats.total_blocks / stats.matches,
    turnovers: stats.total_turnovers / stats.matches,
    personal_fouls: stats.total_personal_fouls / stats.matches,
    minutes: stats.total_minutes / stats.matches,
    clutchScore: stats.clutchScore / stats.matches
  }))
}
