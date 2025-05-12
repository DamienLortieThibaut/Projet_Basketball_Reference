import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, Legend } from 'recharts';

// Interface pour les données de tir
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

interface ShotChartProps {
  data: ShotData[];
  teamColors: { [key: string]: { bg: string, text: string } };
}

// Interface for tooltip payload
interface TooltipPayload {
  payload: {
    made: boolean;
    shotType: string;
    distance: number;
    gameDate: string;
    quarter: string;
    timeRemaining: string;
    scoreDescription: string;
  };
}

// Forme personnalisée de triangle pour les tirs à 3 points
const CustomTriangle = (props: any) => {
  const { cx, cy, fill, opacity } = props;
  const size = 8; // Taille du triangle
  
  return (
    <polygon 
      points={`${cx},${cy-size} ${cx-size},${cy+size} ${cx+size},${cy+size}`} 
      fill={fill} 
      opacity={opacity} 
    />
  );
};

// Forme personnalisée de cercle pour les tirs à 2 points
const CustomCircle = (props: any) => {
  const { cx, cy, fill, opacity } = props;
  const radius = 4; // Rayon du cercle
  
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={radius} 
      fill={fill} 
      opacity={opacity} 
    />
  );
};

// Composant pour le terrain de basket
const BasketballCourt = () => (
  <svg width="500" height="470" viewBox="0 0 500 470" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ligne de base */}
    <line x1="0" y1="380" x2="500" y2="380" stroke="black" strokeWidth="2" />
    
    {/* Zone restrictive */}
    <rect x="175" y="260" width="150" height="120" stroke="black" strokeWidth="2" fill="none" />
    
    {/* Cercle de la ligne des lancers francs */}
    <circle cx="250" cy="260" r="40" stroke="black" strokeWidth="2" fill="none" />
    
    {/* Panier */}
    <circle cx="250" cy="380" r="10" stroke="black" strokeWidth="2" fill="none" />
  </svg>
);

// Composant pour afficher un quart-temps spécifique
const QuarterChart = ({ 
  data, 
  quarter, 
  renderCustomShape,
}: { 
  data: any[], 
  quarter: string,
  renderCustomShape: (props: any) => React.ReactElement,
}) => {
  const filteredData = data.filter(shot => shot.quarter === quarter);
  const madeShots = filteredData.filter(shot => shot.made).length;
  const percentage = filteredData.length > 0 
    ? (madeShots / filteredData.length * 100).toFixed(1) 
    : '0.0';

  return (
    <Card className="w-full">
      <CardHeader className="p-3">
        <CardTitle className="text-base flex justify-between items-center">
          <span>{quarter}</span>
          <Badge variant="outline" className="bg-green-100">
            {percentage}% ({madeShots}/{filteredData.length})
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="relative border border-gray-200 rounded-lg bg-gray-50 h-[400px]">
          {/* Dessin du terrain */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <BasketballCourt />
          </div>

          {/* Scatter plot */}
          <div style={{ width: '500px', height: 400, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <XAxis type="number" dataKey="x" domain={[0, 500]} hide />
                <YAxis type="number" dataKey="y" domain={[0, 470]} hide />
                <ZAxis range={[60, 60]} />
                <Tooltip 
                  content={({ payload }: { payload?: TooltipPayload[] }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2 bg-white border rounded shadow-md text-xs">
                          <p className="font-bold">{data.made ? 'Tir réussi' : 'Tir manqué'}</p>
                          <p>{data.shotType} ({data.distance} pieds)</p>
                          <p>{data.timeRemaining}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  name="Tirs" 
                  data={filteredData} 
                  shape={renderCustomShape}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ShotChart: React.FC<ShotChartProps> = ({ data, teamColors }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'made' | 'missed'>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [selectedShotType, setSelectedShotType] = useState<string>('all');
  
  // Extraire l'équipe des données (prend la première trouvée)
  const teamCode = data.length > 0 ? data[0].teams.split(',')[1]?.trim().split(' ')[0] : 'CHI';

  // Filtrer les données selon les sélections
  const filteredData = data.filter(shot => {
    // Filtre de réussite/échec
    if (selectedFilter === 'made' && shot.is_made !== 'True') return false;
    if (selectedFilter === 'missed' && shot.is_made !== 'False') return false;
    
    // Filtre par quart-temps
    if (selectedQuarter !== 'all' && !shot.quarter.includes(selectedQuarter)) return false;
    
    // Filtre par type de tir
    if (selectedShotType !== 'all' && shot.shot_type !== selectedShotType) return false;
    
    return true;
  });

  // Adapter les coordonnées pour le terrain de basket
  const chartData = filteredData.map(shot => ({
    x: parseFloat(shot.x_coordinate + 20),
    y: parseFloat(shot.y_coordinate),
    made: shot.is_made === 'True',
    distance: parseInt(shot.shot_distance || '0', 10),
    shotType: shot.shot_type,
    quarter: shot.quarter,
    gameDate: shot.game_date,
    teams: shot.teams,
    timeRemaining: shot.time_remaining,
    scoreDescription: shot.score_description || ''
  }));

  // Calculer les statistiques
  const totalShots = filteredData.length;
  const madeShots = filteredData.filter(shot => shot.is_made === 'True').length;
  const shootingPercentage = totalShots > 0 ? (madeShots / totalShots * 100).toFixed(1) : '0.0';
  
  const threePointers = filteredData.filter(shot => shot.shot_type === '3-pointer');
  const madeThrees = threePointers.filter(shot => shot.is_made === 'True').length;
  const threePointPercentage = threePointers.length > 0 
    ? (madeThrees / threePointers.length * 100).toFixed(1) 
    : '0.0';
  
  const twoPointers = filteredData.filter(shot => shot.shot_type === '2-pointer');
  const madeTwos = twoPointers.filter(shot => shot.is_made === 'True').length;
  const twoPointPercentage = twoPointers.length > 0 
    ? (madeTwos / twoPointers.length * 100).toFixed(1) 
    : '0.0';

  // Obtenir les quarts-temps uniques pour le filtre
  const quarters = Array.from(new Set(data.map(shot => shot.quarter))).sort();

  // Obtenir les types de tirs uniques pour le filtre
  const shotTypes = Array.from(new Set(data.map(shot => shot.shot_type))).sort();

  // Couleur de l'équipe pour les visualisations
  const teamColor = teamColors[teamCode]?.bg || '#CE1141';

  // Fonction pour rendre la bonne forme selon le type de tir
  const renderCustomShape = (props: any) => {
    const { x, y, payload } = props;
    const isMade = payload.made;
    const isThreePointer = payload.shotType === '3-pointer';
    const fill = isMade ? teamColor : '#888888';
    const opacity = isMade ? 0.8 : 0.5;
    
    return isThreePointer 
      ? <CustomTriangle cx={x} cy={y} fill={fill} opacity={opacity} /> 
      : <CustomCircle cx={x} cy={y} fill={fill} opacity={opacity} />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Shot Chart</CardTitle>
        <CardDescription>
          Visualisation des tirs - {data.length > 0 ? data[0].player_name.replace(' Overview', '') : 'Joueur'} 
          {selectedQuarter !== 'all' ? ` - ${selectedQuarter}` : ''}
          {selectedShotType !== 'all' ? ` - ${selectedShotType}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <div className="flex gap-2">
            <Badge variant="outline" style={{ backgroundColor: teamColor, color: 'white' }}>
              {teamCode}
            </Badge>
            <Badge variant="outline">
              {totalShots} tirs
            </Badge>
            <Badge variant="outline" className="bg-green-100">
              {shootingPercentage}% réussite
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedFilter} onValueChange={(value) => setSelectedFilter(value as 'all' | 'made' | 'missed')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tirs</SelectItem>
                <SelectItem value="made">Tirs réussis</SelectItem>
                <SelectItem value="missed">Tirs manqués</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Quart-temps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les quarts</SelectItem>
                {quarters.map(quarter => (
                  <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedShotType} onValueChange={setSelectedShotType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type de tir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {shotTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs defaultValue="scatter" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="scatter">General</TabsTrigger>
            <TabsTrigger value="quarters">Par Quart-Temps</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scatter">
            <div className="relative border border-gray-200 rounded-lg bg-gray-50">
              {/* Dessin du terrain */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                <svg width="500" height="470" viewBox="0 0 500 470" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Ligne de base */}
                  <line x1="0" y1="420" x2="500" y2="420" stroke="black" strokeWidth="2" />
                  
                  {/* Zone restrictive */}
                  <rect x="175" y="300" width="150" height="120" stroke="black" strokeWidth="2" fill="none" />
                  
                  {/* Cercle de la ligne des lancers francs */}
                  <circle cx="250" cy="300" r="60" stroke="black" strokeWidth="2" fill="none" />
                  
                  {/* Panier */}
                  <circle cx="250" cy="420" r="10" stroke="black" strokeWidth="2" fill="none" />
                </svg>
              </div>

              {/* Scatter plot */}
              <div style={{ width: '500px', height: 500, margin: '0 auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
                  >
                    <XAxis type="number" dataKey="x" domain={[0, 500]} hide />
                    <YAxis type="number" dataKey="y" domain={[0, 470]} hide />
                    <ZAxis range={[60, 60]} />
                    <Tooltip 
                      content={({ payload }: { payload?: TooltipPayload[] }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2 bg-white border rounded shadow-md">
                              <p className="font-bold">{data.made ? 'Tir réussi' : 'Tir manqué'}</p>
                              <p>{data.shotType} ({data.distance} pieds)</p>
                              <p>{data.gameDate}, {data.quarter}, {data.timeRemaining}</p>
                              {data.scoreDescription && (
                                <p className="text-xs mt-1">{data.scoreDescription.split('<br>').join(' - ')}</p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter 
                      name="Tirs" 
                      data={chartData} 
                      shape={renderCustomShape}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      content={() => (
                        <div className="flex gap-4 justify-center mb-2 p-2 bg-white border rounded-md">
                          <div className="flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="5" fill={teamColor} opacity={0.8} />
                            </svg>
                            <span className="text-sm">2pts réussi</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="5" fill="#888888" opacity={0.5} />
                            </svg>
                            <span className="text-sm">2pts raté</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <polygon 
                                points="10,4 4,16 16,16" 
                                fill={teamColor} 
                                opacity={0.8} 
                              />
                            </svg>
                            <span className="text-sm">3pts réussi</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <polygon 
                                points="10,4 4,16 16,16" 
                                fill="#888888" 
                                opacity={0.5} 
                              />
                            </svg>
                            <span className="text-sm">3pts raté</span>
                          </div>
                        </div>
                      )}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quarters">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quarters.map(quarter => (
                <QuarterChart 
                  key={quarter}
                  data={chartData}
                  quarter={quarter}
                  renderCustomShape={renderCustomShape}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Tirs à 2 points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{twoPointPercentage}%</div>
                  <p className="text-gray-500">{madeTwos}/{twoPointers.length} tirs réussis</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Tirs à 3 points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{threePointPercentage}%</div>
                  <p className="text-gray-500">{madeThrees}/{threePointers.length} tirs réussis</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{shootingPercentage}%</div>
                  <p className="text-gray-500">{madeShots}/{totalShots} tirs réussis</p>
                </CardContent>
              </Card>
              
              {/* Statistiques par quart-temps */}
              <Card className="md:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Statistiques par quart-temps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {quarters.map(quarter => {
                      const quarterShots = filteredData.filter(shot => shot.quarter === quarter);
                      const quarterMade = quarterShots.filter(shot => shot.is_made === 'True').length;
                      const quarterPercentage = quarterShots.length > 0 
                        ? (quarterMade / quarterShots.length * 100).toFixed(1) 
                        : '0.0';
                      
                      return (
                        <div key={quarter} className="bg-gray-50 rounded-lg p-3 border">
                          <h3 className="font-medium">{quarter}</h3>
                          <div className="text-2xl font-bold mt-1">{quarterPercentage}%</div>
                          <p className="text-gray-500 text-sm">{quarterMade}/{quarterShots.length} tirs</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ShotChart; 