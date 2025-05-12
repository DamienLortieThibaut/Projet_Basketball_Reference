import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface ClutchSituationsChartProps {
  data: ShotData[];
  teamColor: string;
}

const ClutchSituationsChart: React.FC<ClutchSituationsChartProps> = ({ data, teamColor }) => {
  const playerName = data.length > 0 ? data[0].player_name.replace(' Overview', '') : 'Joueur';
  
  // Fonction pour déterminer si un tir est dans un moment critique
  const isClutchSituation = (shot: ShotData) => {
    // Déterminer si c'est le 4ème quart-temps ou prolongation
    const isLateGame = shot.quarter === '4th' || shot.quarter.includes('OT');
    
    // Vérifier le temps restant (format typique: "2:45")
    const timeRemaining = shot.time_remaining;
    let minutes = 0;
    let seconds = 0;
    
    // Parser le temps restant
    if (timeRemaining.includes(':')) {
      const [min, sec] = timeRemaining.split(':');
      minutes = parseInt(min, 10);
      seconds = parseInt(sec, 10);
    } else {
      seconds = parseInt(timeRemaining, 10);
    }
    
    // Convertir en secondes totales
    const totalSecondsRemaining = minutes * 60 + seconds;
    
    // Considérer comme "clutch" si dans les 2 dernières minutes du 4ème quart ou OT
    return isLateGame && totalSecondsRemaining <= 120;
  };
  
  // Fonction pour évaluer si le match était serré
  const isCloseGame = (shot: ShotData) => {
    const description = shot.score_description || '';
    
    // Extraire le score si disponible
    const scoreMatch = description.match(/now leads (\d+)-(\d+)/);
    if (scoreMatch) {
      const leadingTeamScore = parseInt(scoreMatch[1], 10);
      const trailingTeamScore = parseInt(scoreMatch[2], 10);
      const scoreDifference = Math.abs(leadingTeamScore - trailingTeamScore);
      
      // Considérer le match comme serré si l'écart est de 5 points ou moins
      return scoreDifference <= 5;
    }
    
    return false; // Par défaut, on ne peut pas déterminer
  };
  
  // Classifier les tirs
  const clutchShots = data.filter(isClutchSituation);
  const criticalShots = clutchShots.filter(isCloseGame);
  const regularShots = data.filter(shot => !isClutchSituation(shot));
  
  // Calculer les statistiques
  const calculateStats = (shots: ShotData[]) => {
    const total = shots.length;
    const made = shots.filter(s => s.is_made === 'True').length;
    const percentage = total > 0 ? (made / total) * 100 : 0;
    
    const twoPointers = shots.filter(s => s.shot_type === '2-pointer');
    const threePointers = shots.filter(s => s.shot_type === '3-pointer');
    
    const madeTwos = twoPointers.filter(s => s.is_made === 'True').length;
    const madeThrees = threePointers.filter(s => s.is_made === 'True').length;
    
    const twoPointPercentage = twoPointers.length > 0 ? (madeTwos / twoPointers.length) * 100 : 0;
    const threePointPercentage = threePointers.length > 0 ? (madeThrees / threePointers.length) * 100 : 0;
    
    return {
      total,
      made,
      percentage,
      twoPointers: {
        attempts: twoPointers.length,
        made: madeTwos,
        percentage: twoPointPercentage
      },
      threePointers: {
        attempts: threePointers.length,
        made: madeThrees,
        percentage: threePointPercentage
      }
    };
  };
  
  const clutchStats = calculateStats(clutchShots);
  const criticalStats = calculateStats(criticalShots);
  const regularStats = calculateStats(regularShots);
  
  // Préparer les données pour les graphiques
  const percentageComparisonData = [
    {
      name: 'Global',
      percentage: calculateStats(data).percentage
    },
    {
      name: 'Moments normaux',
      percentage: regularStats.percentage
    },
    {
      name: 'Dernières 2 min',
      percentage: clutchStats.percentage
    },
    {
      name: 'Moments critiques',
      percentage: criticalStats.percentage
    }
  ];
  
  // Données pour le graphique circulaire
  const shotDistributionData = [
    { name: 'Moments normaux', value: regularShots.length },
    { name: 'Clutch', value: clutchShots.length - criticalShots.length },
    { name: 'Critiques', value: criticalShots.length },
  ];
  
  const COLORS = ['#0088FE', '#00C49F', teamColor];
  
  // Extraire les quarts-temps pour une analyse plus détaillée
  const quarters = [...new Set(data.map(shot => shot.quarter))].sort();
  const quarterStats = quarters.map(quarter => {
    const quarterShots = data.filter(shot => shot.quarter === quarter);
    const stats = calculateStats(quarterShots);
    
    return {
      quarter,
      shots: quarterShots.length,
      made: stats.made,
      percentage: stats.percentage
    };
  });
  
  // Données pour le graphique par quart-temps
  const quarterChartData = quarterStats.map(stats => ({
    name: stats.quarter,
    shots: stats.shots,
    réussite: stats.percentage
  }));
  
  // S'il n'y a pas assez de données
  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Données insuffisantes pour l'analyse des situations clutch
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analyse des situations critiques</CardTitle>
        <CardDescription>
          Performance de {playerName} dans les moments décisifs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="quarters">Par quart-temps</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Statistiques de réussite par situation */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-medium mb-3">% de réussite par situation</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={percentageComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                      <Bar dataKey="percentage" fill={teamColor} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Distribution des types de situations */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-medium mb-3">Distribution des tirs</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={shotDistributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                      >
                        {shotDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Récapitulatif des statistiques critiques */}
              <div className="border rounded-lg p-4 md:col-span-2">
                <h3 className="text-md font-medium mb-3">Résumé des performances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded border">
                    <h4 className="font-medium">Global</h4>
                    <p className="text-2xl font-bold mt-1">{calculateStats(data).percentage.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">{calculateStats(data).made}/{calculateStats(data).total} tirs</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded border">
                    <h4 className="font-medium">Dernières 2 minutes</h4>
                    <p className="text-2xl font-bold mt-1">{clutchStats.percentage.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">{clutchStats.made}/{clutchStats.total} tirs</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded border">
                    <h4 className="font-medium">Moments critiques</h4>
                    <p className="text-2xl font-bold mt-1">{criticalStats.percentage.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">{criticalStats.made}/{criticalStats.total} tirs</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="quarters">
            <div className="grid grid-cols-1 gap-6">
              {/* Graphique par quart-temps */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-medium mb-3">Performance par quart-temps</h3>
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <BarChart data={quarterChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="shots" fill="#8884d8" name="Nombre de tirs" />
                      <Bar yAxisId="right" dataKey="réussite" fill={teamColor} name="% de réussite" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Détails par quart-temps */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-medium mb-3">Détails par quart-temps</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">Quart-temps</th>
                        <th className="px-4 py-2 text-left">Tirs</th>
                        <th className="px-4 py-2 text-left">Réussis</th>
                        <th className="px-4 py-2 text-left">Pourcentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quarterStats.map((stats, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="px-4 py-2">{stats.quarter}</td>
                          <td className="px-4 py-2">{stats.shots}</td>
                          <td className="px-4 py-2">{stats.made}</td>
                          <td className="px-4 py-2">{stats.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details">
            <div className="grid grid-cols-1 gap-6">
              {/* Détails des tirs en situation critique */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-medium mb-3">Tirs dans les moments critiques</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Quart</th>
                        <th className="px-4 py-2 text-left">Temps restant</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Distance</th>
                        <th className="px-4 py-2 text-left">Résultat</th>
                        <th className="px-4 py-2 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {clutchShots.map((shot, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="px-4 py-2">{shot.game_date}</td>
                          <td className="px-4 py-2">{shot.quarter}</td>
                          <td className="px-4 py-2">{shot.time_remaining}</td>
                          <td className="px-4 py-2">{shot.shot_type}</td>
                          <td className="px-4 py-2">{shot.shot_distance} ft</td>
                          <td className="px-4 py-2">
                            <span 
                              className={`px-2 py-1 rounded text-xs ${
                                shot.is_made === 'True' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {shot.is_made === 'True' ? 'Réussi' : 'Manqué'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs max-w-[200px] truncate">
                            {shot.score_description?.replace(/<br>/g, ' - ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClutchSituationsChart; 