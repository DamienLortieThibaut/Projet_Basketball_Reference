import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface PlayerStatsSummary {
  playerId: string;
  playerName: string;
  team: string;
  totalShots: number;
  madeShots: number;
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
  quarterStats: {
    [key: string]: {
      attempts: number;
      made: number;
      percentage: number;
    };
  };
  zoneStats: {
    [key: string]: {
      attempts: number;
      made: number;
      percentage: number;
    };
  };
}

interface PlayerComparisonChartProps {
  player1Data: ShotData[];
  player2Data: ShotData[];
  teamColors: { [key: string]: { bg: string, text: string } };
}

const PlayerComparisonChart: React.FC<PlayerComparisonChartProps> = ({ 
  player1Data, 
  player2Data,
  teamColors 
}) => {
  if (!player1Data.length || !player2Data.length) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Données insuffisantes pour la comparaison
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fonction pour calculer les statistiques d'un joueur
  const calculatePlayerStats = (data: ShotData[]): PlayerStatsSummary => {
    const player = data[0];
    const playerName = player.player_name.replace(' Overview', '');
    const teamCode = player.teams.split(',')[1]?.trim().split(' ')[0] || '';
    
    // Calcul des statistiques globales
    const totalShots = data.length;
    const madeShots = data.filter(shot => shot.is_made === 'True').length;
    const percentage = totalShots > 0 ? (madeShots / totalShots) * 100 : 0;
    
    // Statistiques par type de tir
    const twoPointShots = data.filter(shot => shot.shot_type === '2-pointer');
    const threePointShots = data.filter(shot => shot.shot_type === '3-pointer');
    
    const madeTwoPoints = twoPointShots.filter(shot => shot.is_made === 'True').length;
    const madeThreePoints = threePointShots.filter(shot => shot.is_made === 'True').length;
    
    // Statistiques par quart-temps
    const quarters = [...new Set(data.map(shot => shot.quarter))].sort();
    const quarterStats: {[key: string]: {attempts: number, made: number, percentage: number}} = {};
    
    quarters.forEach(quarter => {
      const quarterShots = data.filter(shot => shot.quarter === quarter);
      const quarterMade = quarterShots.filter(shot => shot.is_made === 'True').length;
      quarterStats[quarter] = {
        attempts: quarterShots.length,
        made: quarterMade,
        percentage: quarterShots.length > 0 ? (quarterMade / quarterShots.length) * 100 : 0
      };
    });
    
    // Statistiques par zone (simplifié)
    const zones = {
      'Perimètre': data.filter(shot => parseInt(shot.shot_distance) > 20),
      'Mi-distance': data.filter(shot => parseInt(shot.shot_distance) > 10 && parseInt(shot.shot_distance) <= 20),
      'Près du panier': data.filter(shot => parseInt(shot.shot_distance) <= 10)
    };
    
    const zoneStats: {[key: string]: {attempts: number, made: number, percentage: number}} = {};
    
    Object.entries(zones).forEach(([zoneName, zoneShots]) => {
      const zoneMade = zoneShots.filter(shot => shot.is_made === 'True').length;
      zoneStats[zoneName] = {
        attempts: zoneShots.length,
        made: zoneMade,
        percentage: zoneShots.length > 0 ? (zoneMade / zoneShots.length) * 100 : 0
      };
    });
    
    return {
      playerId: player.player_id,
      playerName,
      team: teamCode,
      totalShots,
      madeShots,
      percentage,
      twoPointers: {
        attempts: twoPointShots.length,
        made: madeTwoPoints,
        percentage: twoPointShots.length > 0 ? (madeTwoPoints / twoPointShots.length) * 100 : 0
      },
      threePointers: {
        attempts: threePointShots.length,
        made: madeThreePoints,
        percentage: threePointShots.length > 0 ? (madeThreePoints / threePointShots.length) * 100 : 0
      },
      quarterStats,
      zoneStats
    };
  };

  const player1Stats = calculatePlayerStats(player1Data);
  const player2Stats = calculatePlayerStats(player2Data);

  // Préparation des données pour les graphiques
  const overallComparisonData = [
    {
      name: "% Global",
      [player1Stats.playerName]: player1Stats.percentage,
      [player2Stats.playerName]: player2Stats.percentage
    },
    {
      name: "% 2pts",
      [player1Stats.playerName]: player1Stats.twoPointers.percentage,
      [player2Stats.playerName]: player2Stats.twoPointers.percentage
    },
    {
      name: "% 3pts",
      [player1Stats.playerName]: player1Stats.threePointers.percentage,
      [player2Stats.playerName]: player2Stats.threePointers.percentage
    }
  ];

  // Données pour la comparaison par quart-temps
  const quarters = [...new Set([
    ...Object.keys(player1Stats.quarterStats),
    ...Object.keys(player2Stats.quarterStats)
  ])].sort();

  const quarterComparisonData = quarters.map(quarter => ({
    name: quarter,
    [player1Stats.playerName]: player1Stats.quarterStats[quarter]?.percentage || 0,
    [player2Stats.playerName]: player2Stats.quarterStats[quarter]?.percentage || 0
  }));

  // Données pour la comparaison par zone
  const zones = [...new Set([
    ...Object.keys(player1Stats.zoneStats),
    ...Object.keys(player2Stats.zoneStats)
  ])];

  const zoneComparisonData = zones.map(zone => ({
    name: zone,
    [player1Stats.playerName]: player1Stats.zoneStats[zone]?.percentage || 0,
    [player2Stats.playerName]: player2Stats.zoneStats[zone]?.percentage || 0
  }));

  // Couleurs des équipes pour les graphiques
  const player1Color = teamColors[player1Stats.team]?.bg || '#1D428A';
  const player2Color = teamColors[player2Stats.team]?.bg || '#CE1141';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Comparaison de joueurs</CardTitle>
        <CardDescription>
          {player1Stats.playerName} vs {player2Stats.playerName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 border rounded-lg" style={{ borderColor: player1Color }}>
            <h3 className="text-lg font-bold" style={{ color: player1Color }}>
              {player1Stats.playerName} ({player1Stats.team})
            </h3>
            <div className="mt-2 space-y-1">
              <p>Tirs totaux: {player1Stats.madeShots}/{player1Stats.totalShots} ({player1Stats.percentage.toFixed(1)}%)</p>
              <p>Tirs à 2pts: {player1Stats.twoPointers.made}/{player1Stats.twoPointers.attempts} ({player1Stats.twoPointers.percentage.toFixed(1)}%)</p>
              <p>Tirs à 3pts: {player1Stats.threePointers.made}/{player1Stats.threePointers.attempts} ({player1Stats.threePointers.percentage.toFixed(1)}%)</p>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg" style={{ borderColor: player2Color }}>
            <h3 className="text-lg font-bold" style={{ color: player2Color }}>
              {player2Stats.playerName} ({player2Stats.team})
            </h3>
            <div className="mt-2 space-y-1">
              <p>Tirs totaux: {player2Stats.madeShots}/{player2Stats.totalShots} ({player2Stats.percentage.toFixed(1)}%)</p>
              <p>Tirs à 2pts: {player2Stats.twoPointers.made}/{player2Stats.twoPointers.attempts} ({player2Stats.twoPointers.percentage.toFixed(1)}%)</p>
              <p>Tirs à 3pts: {player2Stats.threePointers.made}/{player2Stats.threePointers.attempts} ({player2Stats.threePointers.percentage.toFixed(1)}%)</p>
            </div>
          </div>
        </div>
        
        {/* Graphique de comparaison globale */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Pourcentages de réussite</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={overallComparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Bar dataKey={player1Stats.playerName} fill={player1Color} />
                <Bar dataKey={player2Stats.playerName} fill={player2Color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Graphique de comparaison par quart-temps */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Pourcentages par quart-temps</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={quarterComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Bar dataKey={player1Stats.playerName} fill={player1Color} />
                <Bar dataKey={player2Stats.playerName} fill={player2Color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Graphique de comparaison par zone */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Pourcentages par zone</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart 
                data={zoneComparisonData} 
                layout="vertical"
                margin={{ left: 120, right: 30, top: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Bar dataKey={player1Stats.playerName} fill={player1Color} />
                <Bar dataKey={player2Stats.playerName} fill={player2Color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerComparisonChart; 