import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const teamColors: { [key: string]: { bg: string, text: string } } = {
  'PHI': { bg: '#006BB6', text: 'white' }, // Philadelphia 76ers - Bleu
  'MEM': { bg: '#5D76A9', text: 'white' }, // Memphis Grizzlies - Bleu clair
  'HOU': { bg: '#CE1141', text: 'white' }, // Houston Rockets - Rouge
  'BOS': { bg: '#007A33', text: 'white' }, // Boston Celtics - Vert
  'LAL': { bg: '#552583', text: 'white' }, // Los Angeles Lakers - Violet
  'MIA': { bg: '#98002E', text: 'white' }, // Miami Heat - Rouge foncé
  'GSW': { bg: '#1D428A', text: 'white' }, // Golden State Warriors - Bleu
  'NYK': { bg: '#006BB6', text: 'white' }, // New York Knicks - Bleu
  'CHI': { bg: '#CE1141', text: 'white' }, // Chicago Bulls - Rouge
  'DAL': { bg: '#00538C', text: 'white' }, // Dallas Mavericks - Bleu
  'DEN': { bg: '#0E2240', text: 'white' }, // Denver Nuggets - Bleu foncé
  'LAC': { bg: '#C8102E', text: 'white' }, // Los Angeles Clippers - Rouge
  'MIL': { bg: '#00471B', text: 'white' }, // Milwaukee Bucks - Vert
  'PHX': { bg: '#1D1160', text: 'white' }, // Phoenix Suns - Violet
  'POR': { bg: '#E03A3E', text: 'white' }, // Portland Trail Blazers - Rouge
  'SAC': { bg: '#5A2D81', text: 'white' }, // Sacramento Kings - Violet
  'SAS': { bg: '#C4CED4', text: 'black' }, // San Antonio Spurs - Gris
  'TOR': { bg: '#CE1141', text: 'white' }, // Toronto Raptors - Rouge
  'UTA': { bg: '#002B5C', text: 'white' }, // Utah Jazz - Bleu foncé
  'WAS': { bg: '#002B5C', text: 'white' }, // Washington Wizards - Bleu
  'ATL': { bg: '#E03A3E', text: 'white' }, // Atlanta Hawks - Rouge
  'BKN': { bg: '#000000', text: 'white' }, // Brooklyn Nets - Noir
  'CHA': { bg: '#1D1160', text: 'white' }, // Charlotte Hornets - Violet
  'CLE': { bg: '#6F263D', text: 'white' }, // Cleveland Cavaliers - Rouge foncé
  'DET': { bg: '#C8102E', text: 'white' }, // Detroit Pistons - Rouge
  'IND': { bg: '#002D62', text: 'white' }, // Indiana Pacers - Bleu
  'MIN': { bg: '#0C2340', text: 'white' }, // Minnesota Timberwolves - Bleu foncé
  'NOP': { bg: '#0C2340', text: 'white' }, // New Orleans Pelicans - Bleu foncé
  'OKC': { bg: '#007AC1', text: 'white' }, // Oklahoma City Thunder - Bleu
  'ORL': { bg: '#0077C0', text: 'white' }, // Orlando Magic - Bleu
}

interface PlayerCardProps {
  player: {
    player_name: string
    team: string
    clutchScore: number
    points: number
    field_goals: number
    field_goal_attempts: number
    free_throws: number
    free_throw_attempts: number
    three_point_field_goals: number
    three_point_field_goal_attempts: number
    total_field_goals: number
    total_field_goal_attempts: number
    total_three_point_field_goals: number
    total_three_point_field_goal_attempts: number
    total_free_throws: number
    total_free_throw_attempts: number
    rebounds: number
    assists: number
    steals: number
    blocks: number
    turnovers: number
    personal_fouls: number
    minutes: number
    match_date?: string
  }
}

export default function PlayerCard({ player }: PlayerCardProps) {
  // Calculate percentages
  const fgPercentage =
    player.field_goal_attempts > 0
      ? (player.field_goals / player.field_goal_attempts) * 100
      : 0

  const ftPercentage =
    player.free_throw_attempts > 0
      ? (player.free_throws / player.free_throw_attempts) * 100
      : 0

  const tpPercentage =
    player.three_point_field_goal_attempts > 0
      ? (player.three_point_field_goals / player.three_point_field_goal_attempts) * 100
      : 0

  // Format date if available
  const formattedDate = player.match_date
    ? `${player.match_date.substring(6, 8)}/${player.match_date.substring(4, 6)}/${player.match_date.substring(0, 4)}`
    : "N/A"

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        style={{ 
          background: `linear-gradient(to right, ${teamColors[player.team]?.bg || '#006BB6'}, ${teamColors[player.team]?.bg || '#006BB6'}dd)`,
          color: teamColors[player.team]?.text || 'white'
        }}
      >
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">{player.player_name}</CardTitle>
          <Badge 
            variant="secondary" 
            style={{ 
              backgroundColor: 'white',
              color: teamColors[player.team]?.bg || '#006BB6',
              borderColor: 'white'
            }}
          >
            {player.team}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-3 flex items-center justify-center w-20 h-20">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800">{player.clutchScore.toFixed(1)}</div>
              <div className="text-xs text-blue-600">CLUTCH</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-500">Points</span>
            <span className="text-lg font-semibold">{player.points.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-500">Minutes</span>
            <span className="text-lg font-semibold">{player.minutes.toFixed(1)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Tirs</span>
            <span className="text-sm font-medium">
              {player.total_field_goals}/{player.total_field_goal_attempts} ({fgPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">3 Points</span>
            <span className="text-sm font-medium">
              {player.total_three_point_field_goals}/{player.total_three_point_field_goal_attempts} ({tpPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Lancers Francs</span>
            <span className="text-sm font-medium">
              {player.total_free_throws}/{player.total_free_throw_attempts} ({ftPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">REB</span>
            <span className="font-medium">{player.rebounds.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">AST</span>
            <span className="font-medium">{player.assists.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">STL</span>
            <span className="font-medium">{player.steals.toFixed(1)}</span>
          </div>
        </div>

        {player.match_date && (
          <div className="mt-4 pt-2 border-t text-xs text-gray-500 flex justify-between">
            <span>Match: {formattedDate}</span>
            <span>Q4</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
