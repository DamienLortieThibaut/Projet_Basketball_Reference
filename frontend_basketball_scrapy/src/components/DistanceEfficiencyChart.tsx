import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

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

interface DistanceEfficiencyChartProps {
  data: ShotData[];
  teamColor: string;
}

const DistanceEfficiencyChart: React.FC<DistanceEfficiencyChartProps> = ({ data, teamColor }) => {
  // Définir les plages de distance (en pieds)
  const distanceRanges = [
    { min: 0, max: 3, label: '0-3' },
    { min: 4, max: 6, label: '4-6' },
    { min: 7, max: 10, label: '7-10' },
    { min: 11, max: 15, label: '11-15' },
    { min: 16, max: 20, label: '16-20' },
    { min: 21, max: 25, label: '21-25' },
    { min: 26, max: 30, label: '26-30' },
    { min: 31, max: 100, label: '31+' }
  ];
  
  // Analyser les données par plage de distance
  const distanceStats = distanceRanges.map(range => {
    const shotsInRange = data.filter(shot => {
      const distance = parseInt(shot.shot_distance || '0', 10);
      return distance >= range.min && distance <= range.max;
    });
    
    const totalShots = shotsInRange.length;
    const madeShots = shotsInRange.filter(shot => shot.is_made === 'True').length;
    const percentage = totalShots > 0 ? (madeShots / totalShots) * 100 : 0;
    
    return {
      range: range.label,
      total: totalShots,
      made: madeShots,
      percentage,
      averageDistance: totalShots > 0 
        ? shotsInRange.reduce((sum, shot) => sum + parseInt(shot.shot_distance || '0', 10), 0) / totalShots
        : 0
    };
  }).filter(stats => stats.total > 0); // Filtrer les plages sans tirs
  
  // Données pour le graphique de volume
  const volumeData = distanceStats.map(stats => ({
    range: stats.range,
    tentatives: stats.total,
    réussis: stats.made
  }));
  
  // Données pour le graphique d'efficacité
  const efficiencyData = distanceStats.map(stats => ({
    range: stats.range,
    pourcentage: stats.percentage,
    distanceMoyenne: stats.averageDistance
  }));
  
  // S'il n'y a pas assez de données
  if (distanceStats.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Données insuffisantes pour l'analyse de distance
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Couleurs pour les graphiques
  const madeColor = teamColor;
  const attemptColor = '#8884d8';
  const percentageColor = '#ff7300';
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Efficacité par Distance</CardTitle>
        <CardDescription>
          Analyse des tirs en fonction de la distance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Graphique de volume de tirs par distance */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Volume de tirs par distance (pieds)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tentatives" fill={attemptColor} />
                <Bar dataKey="réussis" fill={madeColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Graphique de pourcentage de réussite par distance */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Pourcentage de réussite par distance (pieds)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis yAxisId="left" domain={[0, 100]} />
                <Tooltip formatter={(value, name) => {
                  return name === 'pourcentage' 
                    ? `${Number(value).toFixed(1)}%` 
                    : `${Number(value).toFixed(1)} pieds`;
                }} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="pourcentage" 
                  stroke={percentageColor} 
                  yAxisId="left"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Tableau détaillé des statistiques */}
        <div className="border rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Détails par distance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Distance (pieds)</th>
                  <th className="px-4 py-2 text-left">Tirs tentés</th>
                  <th className="px-4 py-2 text-left">Tirs réussis</th>
                  <th className="px-4 py-2 text-left">Pourcentage</th>
                  <th className="px-4 py-2 text-left">Distance moyenne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {distanceStats.map((stats, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2">{stats.range}</td>
                    <td className="px-4 py-2">{stats.total}</td>
                    <td className="px-4 py-2">{stats.made}</td>
                    <td className="px-4 py-2">{stats.percentage.toFixed(1)}%</td>
                    <td className="px-4 py-2">{stats.averageDistance.toFixed(1)}</td>
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

export default DistanceEfficiencyChart; 