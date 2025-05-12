import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  TooltipProps,
} from "recharts"
import { ArrowUpDown, Search, Filter, BarChart3, UserRound, Target, Activity } from "lucide-react"
import PlayerCard from "@/components/PlayerCard"
import ClutchScoreCard from "@/components/ClutchScoreData"
import ShotChart from "@/components/ShotChart"
import { calculatePlayerAverages } from "@/lib/utils"
import { playerData } from "@/data/playersData"
import RadarChart from "@/components/RadarChart"
import { loadPlayerShotData, getAvailablePlayers } from "@/services/shotDataService"
import PlayerComparisonChart from "@/components/PlayerComparisonChart"
import ShootingTrendsChart from "@/components/ShootingTrendsChart"
import DistanceEfficiencyChart from "@/components/DistanceEfficiencyChart"
import ClutchSituationsChart from "@/components/ClutchSituationsChart"

interface EfficiencyData {
  name: string
  minutes: number
  points: number
  clutchScore: number
  fgPercentage: number
}

interface ShotData {
  player_id: string;
  player_name: string;
  season: string;
  source_url: string;
  x_coordinate: string;
  y_coordinate: string;
  is_made: string;
  game_date: string;
  teams: string;
  quarter: string;
  time_remaining: string;
  shot_type: string;
  shot_distance: string;
  score_description?: string;
}

const MIN_MATCHES = 20

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

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("clutchScore")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [shootingData, setShootingData] = useState<ShotData[]>([])
  const [selectedPlayerForShots, setSelectedPlayerForShots] = useState<string>("")
  const [availablePlayers, setAvailablePlayers] = useState<{id: string, name: string, team: string}[]>([])
  const [isLoadingShots, setIsLoadingShots] = useState(false)
  const [comparePlayerData, setComparePlayerData] = useState<ShotData[]>([])
  const [selectedComparePlayer, setSelectedComparePlayer] = useState<string>("")

  // Effet pour charger la liste des joueurs disponibles pour les tirs
  useEffect(() => {
    const loadPlayers = async () => {
      const players = await getAvailablePlayers();
      console.log("Joueurs disponibles:", players);
      setAvailablePlayers(players);
      
      // Si nous avons des joueurs disponibles, sélectionner le premier par défaut
      if (players.length > 0) {
        setSelectedPlayerForShots(players[0].id);
        // Deuxième joueur pour la comparaison (si disponible)
        if (players.length > 1) {
          setSelectedComparePlayer(players[1].id);
        }
      }
    };
    
    loadPlayers();
  }, []);

  // Effet pour charger les données de tir quand le joueur change
  useEffect(() => {
    const loadShots = async () => {
      if (!selectedPlayerForShots) return;
      
      setIsLoadingShots(true);
      try {
        const data = await loadPlayerShotData(selectedPlayerForShots);
        setShootingData(data);
      } catch (error) {
        console.error("Erreur lors du chargement des tirs:", error);
        setShootingData([]);
      } finally {
        setIsLoadingShots(false);
      }
    };
    
    loadShots();
  }, [selectedPlayerForShots]);

  // Effet pour charger les données du joueur de comparaison
  useEffect(() => {
    const loadComparePlayerShots = async () => {
      if (!selectedComparePlayer) {
        setComparePlayerData([]);
        return;
      }
      
      try {
        const data = await loadPlayerShotData(selectedComparePlayer);
        setComparePlayerData(data);
      } catch (error) {
        console.error("Erreur lors du chargement des tirs pour comparaison:", error);
        setComparePlayerData([]);
      }
    };
    
    loadComparePlayerShots();
  }, [selectedComparePlayer]);

  // Calculate averages for all players
  const playersWithAverages = calculatePlayerAverages(playerData)
    .filter(player => player.matches >= MIN_MATCHES)

  // Sort and filter players
  const filteredPlayers = playersWithAverages
    .filter(
      (player) =>
        (searchTerm === "" || player.player_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedTeam === "all" || player.team === selectedTeam),
    )
    .sort((a, b) => {
      const aValue = a[sortBy] || 0
      const bValue = b[sortBy] || 0
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue
    })

  // Get top 5 clutch players
  const topClutchPlayers = [...playersWithAverages].sort((a, b) => b.clutchScore - a.clutchScore).slice(0, 5)

  // Extract unique teams for filter
  const teams = [...new Set(playersWithAverages.map((player) => player.team))].filter(Boolean)

  // Prepare data for efficiency scatter plot
  const efficiencyData: EfficiencyData[] = playersWithAverages.map((player) => {
    const fgPercentage = player.field_goal_attempts > 0
      ? Number((player.field_goals / player.field_goal_attempts * 100).toFixed(1))
      : 0

    const data = {
      name: player.player_name,
      minutes: Number(player.minutes.toFixed(1)),
      points: Number(player.points.toFixed(1)),
      clutchScore: Number(player.clutchScore.toFixed(1)),
      fgPercentage
    }
    return data
  })

  // Calculate league averages and maximums
  const leagueStats = {
    points: {
      avg: playersWithAverages.reduce((sum, player) => sum + player.points, 0) / playersWithAverages.length,
      max: Math.max(...playersWithAverages.map(player => player.points))
    },
    rebounds: {
      avg: playersWithAverages.reduce((sum, player) => sum + player.rebounds, 0) / playersWithAverages.length,
      max: Math.max(...playersWithAverages.map(player => player.rebounds))
    },
    assists: {
      avg: playersWithAverages.reduce((sum, player) => sum + player.assists, 0) / playersWithAverages.length,
      max: Math.max(...playersWithAverages.map(player => player.assists))
    },
    fgPercentage: {
      avg: playersWithAverages.reduce((sum, player) => {
        const fgPercentage = player.field_goal_attempts > 0
          ? (player.field_goals / player.field_goal_attempts) * 100
          : 0
        return sum + fgPercentage
      }, 0) / playersWithAverages.length,
      max: 100
    },
    clutchScore: {
      avg: playersWithAverages.reduce((sum, player) => sum + player.clutchScore, 0) / playersWithAverages.length,
      max: Math.max(...playersWithAverages.map(player => player.clutchScore))
    },
  }

  // Prepare data for radar chart with normalized values
  const prepareRadarData = (player: any) => {
    const fgPercentage = player.field_goal_attempts > 0
      ? (player.field_goals / player.field_goal_attempts) * 100
      : 0

    // Normalize values to a 0-100 scale
    const normalize = (value: number, max: number) => (value / max) * 100

    return [
      { 
        stat: 'Points', 
        player: normalize(player.points, leagueStats.points.max),
        league: normalize(leagueStats.points.avg, leagueStats.points.max),
        rawPlayer: player.points.toFixed(1),
        rawLeague: leagueStats.points.avg.toFixed(1)
      },
      { 
        stat: 'Rebonds', 
        player: normalize(player.rebounds, leagueStats.rebounds.max),
        league: normalize(leagueStats.rebounds.avg, leagueStats.rebounds.max),
        rawPlayer: player.rebounds.toFixed(1),
        rawLeague: leagueStats.rebounds.avg.toFixed(1)
      },
      { 
        stat: 'Passes', 
        player: normalize(player.assists, leagueStats.assists.max),
        league: normalize(leagueStats.assists.avg, leagueStats.assists.max),
        rawPlayer: player.assists.toFixed(1),
        rawLeague: leagueStats.assists.avg.toFixed(1)
      },
      { 
        stat: '% Tirs', 
        player: fgPercentage,
        league: leagueStats.fgPercentage.avg,
        rawPlayer: fgPercentage.toFixed(1),
        rawLeague: leagueStats.fgPercentage.avg.toFixed(1)
      },
      { 
        stat: 'Score Clutch', 
        player: normalize(player.clutchScore, leagueStats.clutchScore.max),
        league: normalize(leagueStats.clutchScore.avg, leagueStats.clutchScore.max),
        rawPlayer: player.clutchScore.toFixed(1),
        rawLeague: leagueStats.clutchScore.avg.toFixed(1)
      },
    ]
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8 bg-gray-50">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">NBA Clutch Performance Dashboard</h1>
        <p className="text-gray-500">
          Analyse des performances moyennes des joueurs NBA dans les moments décisifs (4ème quart-temps et prolongations)
          - Minimum {MIN_MATCHES} matchs joués
        </p>

        {/* Top Clutch Players Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {topClutchPlayers.slice(0, 3).map((player, index) => (
            <ClutchScoreCard key={index} player={player} rank={index + 1} />
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher un joueur..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Équipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les équipes</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="table" className="mt-4">
          <TabsList className="grid w-full grid-cols-7 md:w-[840px]">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Tableau</span>
            </TabsTrigger>
            <TabsTrigger value="efficiency" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Efficacité</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Comparaison</span>
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              <span>Joueurs</span>
            </TabsTrigger>
            <TabsTrigger value="shotchart" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Shot Chart</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Analyses</span>
            </TabsTrigger>
          </TabsList>

          {/* Table View */}
          <TabsContent value="table" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques moyennes des joueurs en situation clutch</CardTitle>
                <CardDescription>Performances moyennes au 4ème quart-temps et en prolongation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Joueur</TableHead>
                        <TableHead>Équipe</TableHead>
                        <TableHead>Matchs</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("clutchScore")}>
                          <div className="flex items-center">
                            Score Clutch
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("points")}>
                          <div className="flex items-center">
                            Points
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>% Tirs</TableHead>
                        <TableHead>% 3pts</TableHead>
                        <TableHead>Rebonds</TableHead>
                        <TableHead>Passes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player, index) => {
                        const fgPercentage =
                          player.field_goal_attempts > 0
                            ? (player.field_goals / player.field_goal_attempts) * 100
                            : 0

                        const tpPercentage =
                          player.three_point_field_goal_attempts > 0
                            ? (player.three_point_field_goals / player.three_point_field_goal_attempts) * 100
                            : 0

                        return (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{player.player_name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                style={{ 
                                  backgroundColor: teamColors[player.team]?.bg || '#gray-100',
                                  color: teamColors[player.team]?.text || 'black',
                                  borderColor: teamColors[player.team]?.bg || '#gray-200'
                                }}
                              >
                                {player.team}
                              </Badge>
                            </TableCell>
                            <TableCell>{player.matches}</TableCell>
                            <TableCell>{player.clutchScore.toFixed(1)}</TableCell>
                            <TableCell>{player.points.toFixed(1)}</TableCell>
                            <TableCell>{fgPercentage.toFixed(1)}%</TableCell>
                            <TableCell>{tpPercentage.toFixed(1)}%</TableCell>
                            <TableCell>{player.rebounds.toFixed(1)}</TableCell>
                            <TableCell>{player.assists.toFixed(1)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Efficiency View */}
          <TabsContent value="efficiency" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Efficacité des joueurs</CardTitle>
                <CardDescription>Relation entre les minutes jouées et les points marqués</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border-2 bg-gray-100">
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <ScatterChart>
                        <CartesianGrid />
                        <XAxis 
                          type="number" 
                          dataKey="minutes" 
                          name="Minutes"
                          domain={[0, 12]}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="points" 
                          name="Points"
                          domain={[0, 10]}
                        />
                        <Tooltip
                          content={({ payload }: TooltipProps) => {
                            if (payload && payload[0]) {
                              const data = payload[0].payload as EfficiencyData
                              return (
                                <div className="bg-white p-2 border rounded shadow">
                                  <p className="font-bold">{data.name}</p>
                                  <p>Minutes: {data.minutes.toFixed(1)}</p>
                                  <p>Points: {data.points.toFixed(1)}</p>
                                  <p>Score Clutch: {data.clutchScore.toFixed(1)}</p>
                                  <p>% Tirs: {data.fgPercentage.toFixed(1)}%</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Scatter
                          data={efficiencyData}
                          fill="#8884d8"
                          shape="circle"
                          fillOpacity={0.6}
                        >
                          {efficiencyData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(${entry.fgPercentage * 2.4}, 70%, 50%)`}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Player Comparison View */}
          <TabsContent value="comparison" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparaisons</CardTitle>
                <CardDescription>Comparez les performances par rapport à la ligue ou à un autre joueur</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="league">
                  <TabsList className="mb-6">
                    <TabsTrigger value="league">Comparaison avec la ligue</TabsTrigger>
                    <TabsTrigger value="player">Comparaison entre joueurs</TabsTrigger>
                  </TabsList>

                  <TabsContent value="league">
                    <div className="mb-4">
                      <Select
                        value={selectedPlayer?.player_name || ""}
                        onValueChange={(value) => {
                          const player = playersWithAverages.find(p => p.player_name === value)
                          if (player) {
                            setSelectedPlayer(player)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full md:w-[300px]">
                          <SelectValue placeholder="Sélectionner un joueur" />
                        </SelectTrigger>
                        <SelectContent>
                          {playersWithAverages.map((player) => (
                            <SelectItem key={player.player_name} value={player.player_name}>
                              {player.player_name} ({player.team})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPlayer && (
                      <RadarChart
                        data={prepareRadarData(selectedPlayer)}
                        playerName={selectedPlayer.player_name}
                        playerColor={teamColors[selectedPlayer.team]?.bg || '#006BB6'}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="player">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Joueur 1</h3>
                        <Select
                          value={selectedPlayerForShots}
                          onValueChange={setSelectedPlayerForShots}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un joueur" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                {player.name} ({player.team})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Joueur 2</h3>
                        <Select
                          value={selectedComparePlayer}
                          onValueChange={setSelectedComparePlayer}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un joueur" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                {player.name} ({player.team})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {isLoadingShots ? (
                      <div className="flex justify-center items-center h-60">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    ) : shootingData.length > 0 && comparePlayerData.length > 0 ? (
                      <PlayerComparisonChart 
                        player1Data={shootingData} 
                        player2Data={comparePlayerData} 
                        teamColors={teamColors} 
                      />
                    ) : (
                      <div className="flex justify-center items-center h-60 text-gray-500">
                        <p>Sélectionnez deux joueurs pour comparer leurs performances</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players View */}
          <TabsContent value="players" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlayers.slice(0, 6).map((player, index) => (
                <PlayerCard key={index} player={player} />
              ))}
            </div>
          </TabsContent>

          {/* Shot Chart View */}
          <TabsContent value="shotchart" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Shot Chart</CardTitle>
                <CardDescription>Visualisation des positions de tirs des joueurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select
                    value={selectedPlayerForShots}
                    onValueChange={setSelectedPlayerForShots}
                  >
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Sélectionner un joueur" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} ({player.team})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isLoadingShots ? (
                  <div className="flex justify-center items-center h-60">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : shootingData.length > 0 ? (
                  <ShotChart data={shootingData} teamColors={teamColors} />
                ) : (
                  <div className="flex justify-center items-center h-60 text-gray-500">
                    <p>Aucune donnée de tir disponible pour ce joueur</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Analysis Tab */}
          <TabsContent value="advanced" className="mt-4">
            <div className="grid grid-cols-1 gap-4">
              {isLoadingShots ? (
                <div className="flex justify-center items-center h-60">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : shootingData.length > 0 ? (
                <>
                  <Tabs defaultValue="trends">
                    <TabsList className="mb-4">
                      <TabsTrigger value="trends">Tendances</TabsTrigger>
                      <TabsTrigger value="distance">Distance</TabsTrigger>
                      <TabsTrigger value="clutch">Situations clutch</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="trends">
                      <ShootingTrendsChart 
                        data={shootingData} 
                        teamColor={teamColors[shootingData[0]?.teams.split(',')[1]?.trim().split(' ')[0] || 'CHI']?.bg || '#CE1141'} 
                      />
                    </TabsContent>
                    
                    <TabsContent value="distance">
                      <DistanceEfficiencyChart 
                        data={shootingData} 
                        teamColor={teamColors[shootingData[0]?.teams.split(',')[1]?.trim().split(' ')[0] || 'CHI']?.bg || '#CE1141'} 
                      />
                    </TabsContent>
                    
                    <TabsContent value="clutch">
                      <ClutchSituationsChart 
                        data={shootingData} 
                        teamColor={teamColors[shootingData[0]?.teams.split(',')[1]?.trim().split(' ')[0] || 'CHI']?.bg || '#CE1141'} 
                      />
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <div className="flex justify-center items-center h-60 text-gray-500">
                  <p>Sélectionnez un joueur dans l'onglet Shot Chart pour voir les analyses avancées</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
