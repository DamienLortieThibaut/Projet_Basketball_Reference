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

// Fonction pour charger les données d'une équipe
export const loadTeamShotData = async (teamCode: string, season: string = '2024'): Promise<ShotData[]> => {
  try {
    const response = await fetch(`/data/shots/${teamCode.toLowerCase()}_shots_${season}.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erreur lors du chargement des données pour ${teamCode}:`, error);
    return [];
  }
};

// Fonction pour charger les données d'un joueur spécifique
export const loadPlayerShotData = async (playerId: string, season: string = '2024'): Promise<ShotData[]> => {
  try {
    // Essayons d'abord de charger depuis un fichier spécifique au joueur
    try {
      const response = await fetch(`/data/shots/player_${playerId.replace('/', '_')}_${season}.json`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (e) {
      // Silencieux, nous allons essayer l'approche alternative
    }

    // Si ça échoue, nous chargeons toutes les équipes et filtrons par joueur
    const teams = ['ATL', 'BOS', 'BRK', 'CHO', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 
                  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK', 
                  'OKC', 'ORL', 'PHI', 'PHO', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'];
    
    for (const team of teams) {
      try {
        const teamData = await loadTeamShotData(team, season);
        const playerData = teamData.filter(shot => shot.player_id === playerId);
        
        if (playerData.length > 0) {
          return playerData;
        }
      } catch (e) {
        // Ignore les erreurs pour les équipes individuelles
      }
    }
    
    throw new Error(`Aucune donnée trouvée pour le joueur ${playerId}`);
  } catch (error) {
    console.error(`Erreur lors du chargement des données pour ${playerId}:`, error);
    return [];
  }
};

// Fonction pour combiner toutes les données de tir de toutes les équipes
export const loadAllShotData = async (season: string = '2024'): Promise<ShotData[]> => {
  try {
    // Essayer de charger depuis le fichier combiné d'abord
    try {
      const response = await fetch(`/data/shots/all_teams_shots_${season}.json`);
      if (response.ok) {
        const data = await response.json();
        // Convertir le format combiné en tableau plat
        let allShots: ShotData[] = [];
        for (const team in data) {
          if (data[team].shots && Array.isArray(data[team].shots)) {
            allShots = [...allShots, ...data[team].shots];
          }
        }
        return allShots;
      }
    } catch (e) {
      // Silencieux, nous allons essayer l'approche alternative
    }

    // Si ça échoue, nous chargeons chaque équipe individuellement
    const teams = ['ATL', 'BOS', 'BRK', 'CHO', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 
                  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK', 
                  'OKC', 'ORL', 'PHI', 'PHO', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'];
    
    let allShots: ShotData[] = [];
    
    for (const team of teams) {
      try {
        const teamData = await loadTeamShotData(team, season);
        allShots = [...allShots, ...teamData];
      } catch (e) {
        // Ignore les erreurs pour les équipes individuelles
      }
    }
    
    return allShots;
  } catch (error) {
    console.error('Erreur lors du chargement de toutes les données de tir:', error);
    return [];
  }
};

// Fonction pour obtenir la liste des joueurs disponibles
export const getAvailablePlayers = async (season: string = '2024'): Promise<{id: string, name: string, team: string}[]> => {
  try {
    const allShots = await loadAllShotData(season);
    const playersMap = new Map<string, {id: string, name: string, team: string}>();
    
    allShots.forEach(shot => {
      if (!playersMap.has(shot.player_id)) {
        const team = shot.teams.split(',')[1]?.trim().split(' ')[0] || '';
        playersMap.set(shot.player_id, {
          id: shot.player_id,
          name: shot.player_name.replace(' Overview', ''),
          team
        });
      }
    });
    
    return Array.from(playersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Erreur lors de la récupération des joueurs:', error);
    return [];
  }
}; 