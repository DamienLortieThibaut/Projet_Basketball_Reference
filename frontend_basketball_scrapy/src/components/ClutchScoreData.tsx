import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Award, Medal } from "lucide-react"

interface ClutchScoreCardProps {
  player: {
    player_name: string
    team: string
    clutchScore: number
    points: number
    field_goals: number
    field_goal_attempts: number
    rebounds: number
    assists: number
  }
  rank: number
}

export default function ClutchScoreCard({ player, rank }: ClutchScoreCardProps) {
  // Get icon and color based on rank
  const getIconAndColor = () => {
    switch (rank) {
      case 1:
        return {
          icon: <Trophy className="h-8 w-8 text-yellow-500" />,
          bgColor: "bg-gradient-to-r from-yellow-400 to-yellow-600",
          textColor: "text-yellow-700",
        }
      case 2:
        return {
          icon: <Award className="h-8 w-8 text-gray-400" />,
          bgColor: "bg-gradient-to-r from-gray-300 to-gray-500",
          textColor: "text-gray-700",
        }
      case 3:
        return {
          icon: <Medal className="h-8 w-8 text-amber-700" />,
          bgColor: "bg-gradient-to-r from-amber-600 to-amber-800",
          textColor: "text-amber-900",
        }
      default:
        return {
          icon: <Trophy className="h-8 w-8 text-blue-500" />,
          bgColor: "bg-gradient-to-r from-blue-400 to-blue-600",
          textColor: "text-blue-700",
        }
    }
  }

  const { icon, bgColor, textColor } = getIconAndColor()

  // Calculate field goal percentage
  const fgPercentage =
    player.field_goal_attempts > 0
      ? (player.field_goals / player.field_goal_attempts) * 100
      : 0

  return (
    <Card className="overflow-hidden">
      <div className={`${bgColor} p-4 text-white`}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{player.player_name}</h3>
            <p className="text-sm opacity-90">{player.team}</p>
          </div>
          {icon}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center flex-1">
            <p className="text-sm text-gray-500">Score Clutch</p>
            <p className={`text-2xl font-bold ${textColor}`}>{player.clutchScore.toFixed(1)}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm text-gray-500">Points</p>
            <p className="text-2xl font-bold">{player.points.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">% Tirs</p>
            <p className="font-medium">{fgPercentage.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">REB</p>
            <p className="font-medium">{player.rebounds.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">AST</p>
            <p className="font-medium">{player.assists.toFixed(1)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
