import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface ShootingTrendsChartProps {
  data: ShotData[];
  teamColor: string;
}

interface GameStats {
  date: string;
  dateObj: Date;
  formattedDate: string;
  shotAttempts: number;
  shotsMade: number;
  percentage: number;
  twoPointers: {
    attempts: number;
    made: number;
    percentage: number;
  };
  threePointers: {
    attempts: number;
    made: number;
    percentage: number;
  };
}

const ShootingTrendsChart: React.FC<ShootingTrendsChartProps> = ({ data, teamColor }) => {
  // Fonction pour parser et formatter les dates
  const parseGameDate = (dateStr: string, year: string) => {
    try {
      // Format: "Dec 28" -> "Dec 28, 2023"
      const fullDateStr = `${dateStr}, ${year}`;
      const dateObj = parse(fullDateStr, 'MMM d, yyyy', new Date(), { locale: fr });
      return {
        dateObj,
        formattedDate: format(dateObj, 'd MMM yyyy', { locale: fr })
      };
    } catch (error) {
      console.error("Erreur de parsing de date:", error);
      return {
        dateObj: new Date(),
        formattedDate: dateStr
      };
    }
  };

  // Regrouper les tirs par date de match
  const gameStatsMap = new Map<string, GameStats>();
  
  data.forEach(shot => {
    const gameDate = shot.game_date;
    const year = shot.teams.split(",")[0].trim();
    
    if (!gameStatsMap.has(gameDate)) {
      const { dateObj, formattedDate } = parseGameDate(gameDate, year);
      
      gameStatsMap.set(gameDate, {
        date: gameDate,
        dateObj,
        formattedDate,
        shotAttempts: 0,
        shotsMade: 0,
        percentage: 0,
        twoPointers: {
          attempts: 0,
          made: 0,
          percentage: 0
        },
        threePointers: {
          attempts: 0,
          made: 0,
          percentage: 0
        }
      });
    }
    
    const stats = gameStatsMap.get(gameDate)!;
    stats.shotAttempts++;
    
    if (shot.is_made === 'True') {
      stats.shotsMade++;
    }
    
    if (shot.shot_type === '2-pointer') {
      stats.twoPointers.attempts++;
      if (shot.is_made === 'True') {
        stats.twoPointers.made++;
      }
    } else if (shot.shot_type === '3-pointer') {
      stats.threePointers.attempts++;
      if (shot.is_made === 'True') {
        stats.threePointers.made++;
      }
    }
    
    // Calculer les pourcentages
    stats.percentage = (stats.shotsMade / stats.shotAttempts) * 100;
    
    if (stats.twoPointers.attempts > 0) {
      stats.twoPointers.percentage = (stats.twoPointers.made / stats.twoPointers.attempts) * 100;
    }
    
    if (stats.threePointers.attempts > 0) {
      stats.threePointers.percentage = (stats.threePointers.made / stats.threePointers.attempts) * 100;
    }
    
    gameStatsMap.set(gameDate, stats);
  });
  
  // Convertir la Map en tableau et trier par date
  const gameStats = Array.from(gameStatsMap.values())
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  
  // Préparer les données pour le graphique
  const chartData = gameStats.map(stats => ({
    date: stats.formattedDate,
    "% Global": stats.percentage,
    "% 2pts": stats.twoPointers.percentage,
    "% 3pts": stats.threePointers.percentage,
    tentatives: stats.shotAttempts
  }));
  
  // Calculer la moyenne mobile sur 3 matchs
  const movingAverageData = [...chartData];
  for (let i = 2; i < chartData.length; i++) {
    const avg = (chartData[i]["% Global"] + chartData[i-1]["% Global"] + chartData[i-2]["% Global"]) / 3;
    movingAverageData[i]["Moyenne mobile"] = avg;
  }
  
  // S'il n'y a pas assez de données
  if (chartData.length < 2) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Pas assez de données pour afficher les tendances (minimum 2 matchs requis)
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Évolution des pourcentages de tir</CardTitle>
        <CardDescription>
          Tendances du joueur au fil des matchs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Graphique des pourcentages de tir */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Pourcentages de réussite par match</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={movingAverageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="% Global" 
                  stroke={teamColor} 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="% 2pts" 
                  stroke="#8884d8" 
                  strokeWidth={1.5}
                />
                <Line 
                  type="monotone" 
                  dataKey="% 3pts" 
                  stroke="#82ca9d" 
                  strokeWidth={1.5}
                />
                {chartData.length >= 3 && (
                  <Line 
                    type="monotone" 
                    dataKey="Moyenne mobile" 
                    stroke="#ff7300" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Graphique du nombre de tentatives */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Nombre de tentatives par match</h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tentatives" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Détail des performances par match */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Détail des matchs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Tirs</th>
                  <th className="px-4 py-2 text-left">% Global</th>
                  <th className="px-4 py-2 text-left">2 points</th>
                  <th className="px-4 py-2 text-left">3 points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gameStats.map((game, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2">{game.formattedDate}</td>
                    <td className="px-4 py-2">{game.shotsMade}/{game.shotAttempts}</td>
                    <td className="px-4 py-2">{game.percentage.toFixed(1)}%</td>
                    <td className="px-4 py-2">{game.twoPointers.made}/{game.twoPointers.attempts} ({game.twoPointers.percentage.toFixed(1)}%)</td>
                    <td className="px-4 py-2">{game.threePointers.made}/{game.threePointers.attempts} ({game.threePointers.percentage.toFixed(1)}%)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShootingTrendsChart; 