import scrapy
import time
import random
from basketball_scrapy_project.items import PlayerClutchStats
from scrapy.loader import ItemLoader
import logging
import re

class BoxScoreSpider(scrapy.Spider):
    name = 'boxscore'
    allowed_domains = ['basketball-reference.com']
    start_urls = ['https://www.basketball-reference.com/leagues/NBA_2024_games.html']
    
    # Paramètres de contrôle
    max_month_pages = 3  # Limiter le nombre de mois à scraper (pour test)
    max_games_per_month = 5  # Limiter le nombre de matchs par mois (pour test)
    
    # Ajouter la possibilité de passer des arguments depuis la ligne de commande
    def __init__(self, *args, **kwargs):
        super(BoxScoreSpider, self).__init__(*args, **kwargs)
        # Si le paramètre 'full_season' est passé et vaut 'True', désactiver les limites
        self.full_season = kwargs.get('full_season', 'False').lower() == 'true'
        if self.full_season:
            self.logger.info("Mode SAISON COMPLÈTE activé - toutes les données seront récupérées")
            # Désactiver les limites pour récupérer tous les matchs
            self.max_month_pages = None  # Pas de limite de mois
            self.max_games_per_month = None  # Pas de limite de matchs par mois
    
    custom_settings = {
        'RETRY_HTTP_CODES': [429, 500, 502, 503, 504, 522, 524, 408, 520],
        'RETRY_TIMES': 5,
        'RETRY_PRIORITY_ADJUST': -1,
    }

    def parse(self, response):
        """Fonction principale qui traite la page d'accueil et extrait les liens mensuels"""
        self.logger.info(f"Parsing main page: {response.url}")
        
        # Récupérer les liens vers les mois
        month_pages = []
        for month in ['october', 'november', 'december', 'january', 'february', 'march', 'april', 'may', 'june']:
            month_url = f"https://www.basketball-reference.com/leagues/NBA_2024_games-{month}.html"
            month_pages.append(month_url)
            
        self.logger.info(f"Found {len(month_pages)} month pages")
        
        # Limiter le nombre de mois à traiter pour les tests
        if self.max_month_pages is not None:
            month_pages = month_pages[:self.max_month_pages]
            self.logger.info(f"Limited to {len(month_pages)} month pages for testing")
        else:
            self.logger.info(f"Processing all {len(month_pages)} month pages")
        
        # Traiter chaque page mensuelle
        for month_url in month_pages:
            self.logger.info(f"Processing month page: {month_url}")
            yield scrapy.Request(url=month_url, callback=self.parse_month_page)
    
    def parse_month_page(self, response):
        """Traite la page d'un mois et extrait les liens des boxscores"""
        self.logger.info(f"Parsing month page: {response.url}")
        
        # À l'intérieur du tbody, nous cherchons tous les tr
        game_rows = response.css('table#schedule tbody tr')
        self.logger.info(f"Found {len(game_rows)} game rows in month page")
        
        # Limiter le nombre de matchs par mois pour les tests
        if self.max_games_per_month is not None:
            original_count = len(game_rows)
            game_rows = game_rows[:self.max_games_per_month]
            self.logger.info(f"Limited from {original_count} to {len(game_rows)} games for testing")
        else:
            self.logger.info(f"Processing all {len(game_rows)} games")
        
        # Pour chaque match, extraire le lien du boxscore
        for game_row in game_rows:
            # Trouver le td avec data-stat="box_score_text"
            box_score_td = game_row.css('td[data-stat="box_score_text"]')
            
            # Extraire le lien href dans le a
            box_score_link = box_score_td.css('a::attr(href)').get()
            
            if box_score_link:
                # Construire l'URL complète
                box_score_url = f"https://www.basketball-reference.com{box_score_link}"
                self.logger.info(f"Found box score link: {box_score_url}")
                
                # Récupérer les abréviations des équipes qui jouent
                visitor_td = game_row.css('td[data-stat="visitor_team_name"]')
                home_td = game_row.css('td[data-stat="home_team_name"]')
                
                visitor_abbr = visitor_td.css('a::attr(href)').get()
                home_abbr = home_td.css('a::attr(href)').get()
                
                # Extraction des abréviations des équipes depuis les liens
                if visitor_abbr:
                    # Format: /teams/ABBR/2024.html
                    visitor_abbr = visitor_abbr.split('/')[2]
                if home_abbr:
                    home_abbr = home_abbr.split('/')[2]
                
                # Stocker les abréviations d'équipes dans les métadonnées de la requête
                meta = {
                    'visitor_abbr': visitor_abbr,
                    'home_abbr': home_abbr
                }
                
                self.logger.info(f"Game: {visitor_abbr} @ {home_abbr}")
                
                # Ajouter un délai aléatoire entre 5 et 10 secondes
                delay = random.uniform(5, 10)
                self.logger.info(f"Waiting {delay:.2f} seconds before requesting box score")
                time.sleep(delay)
                
                # Faire la requête vers la page du boxscore avec les métadonnées des équipes
                yield scrapy.Request(url=box_score_url, callback=self.parse_box_score, meta=meta)
            else:
                self.logger.warning("No box score link found in game row")
    
    def parse_box_score(self, response):
        """Traite la page du boxscore et extrait les statistiques des joueurs"""
        self.logger.info(f"Parsing box score page: {response.url}")
        
        # Récupérer les abréviations des équipes depuis les métadonnées
        visitor_abbr = response.meta.get('visitor_abbr')
        home_abbr = response.meta.get('home_abbr')
        
        self.logger.info(f"Teams in this game: {visitor_abbr} (away) vs {home_abbr} (home)")
        
        # Identifier les abréviations des équipes à partir de l'URL
        # Format: /boxscores/YYYYMMDD0XXX.html où XXX est l'équipe domicile
        path_parts = response.url.split('/')[-1].split('.')
        match_date = ""
        if len(path_parts) > 0:
            date_team = path_parts[0]
            match_date = date_team[:8]  # Extraire la date (YYYYMMDD)
            
            self.logger.info(f"Match date: {match_date}")
            
            # Traiter d'abord les statistiques du quatrième quart-temps
            
            # 1. Identifier les sections de statistiques pour le quatrième quart-temps (q4)
            q4_tables = response.css('div[id$="-q4-basic"] table')
            if len(q4_tables) == 0:
                # Essayer avec une sélection plus large si la première méthode échoue
                q4_tables = response.css('*[id*="-q4-basic"] table')
                
            self.logger.info(f"Found {len(q4_tables)} Q4 tables")
            
            # Parcourir chaque table pour extraire les statistiques des joueurs
            for table_index, table in enumerate(q4_tables):
                # Tenter de déterminer l'équipe à partir de l'ID de la table ou la div parente
                table_id = table.attrib.get('id', '')
                team_abbr = None
                
                # Regarder en premier le chemin complet pour identifier l'équipe
                parent_path = "".join([p for p in table.xpath('ancestor-or-self::*/@id').getall()])
                
                # Rechercher quelle équipe correspond à cette table
                if visitor_abbr and visitor_abbr.upper() in parent_path.upper():
                    team_abbr = visitor_abbr
                elif home_abbr and home_abbr.upper() in parent_path.upper():
                    team_abbr = home_abbr
                else:
                    # Essayer d'extraire l'abréviation de l'équipe à partir de l'ID de la table
                    if table_id and '-' in table_id:
                        # Format possible: TEAM-q4-basic-xxxxx
                        match = re.search(r'^([A-Z]{3})', table_id)
                        if match:
                            possible_abbr = match.group(1)
                            # Vérifier si cette abréviation correspond à une des équipes du match
                            if possible_abbr == visitor_abbr or possible_abbr == home_abbr:
                                team_abbr = possible_abbr
                
                # Si on n'a toujours pas identifié l'équipe, utiliser une heuristique
                if not team_abbr:
                    # Pour le premier tableau, c'est probablement l'équipe visiteuse
                    # Pour le deuxième tableau, c'est probablement l'équipe à domicile
                    team_abbr = visitor_abbr if table_index == 0 else home_abbr
                
                self.logger.info(f"Processing Q4 table {table_index}, team: {team_abbr}")
                
                # Extraire les lignes des joueurs
                player_rows = table.css('tbody tr')
                self.logger.info(f"Found {len(player_rows)} player rows in table {table_index}")
                
                for row in player_rows:
                    # Vérifier si c'est une ligne de joueur valide
                    player_name_elem = row.css('th[data-stat="player"]')
                    player_name = None
                    
                    if player_name_elem:
                        # Essayer d'abord avec le lien, puis avec le texte direct
                        player_name = player_name_elem.css('a::text').get()
                        if not player_name:
                            player_name = player_name_elem.css('::text').get()
                    
                    # Ignorer les lignes qui ne sont pas des joueurs individuels
                    if player_name and player_name.strip() and not player_name.strip() in ['Team Totals', 'Reserves']:
                        self.logger.info(f"Extracting stats for player: {player_name}")
                        
                        # Vérifier si la ligne contient des données de statistiques
                        has_stats = False
                        for data_stat in ['mp', 'pts', 'fg', 'fga']:
                            if row.css(f'td[data-stat="{data_stat}"]::text').get():
                                has_stats = True
                                break
                        
                        # Créer un chargeur d'ItemLoader pour ce joueur
                        loader = ItemLoader(item=PlayerClutchStats())
                        
                        # Informations de base
                        loader.add_value('player_name', player_name.strip())
                        loader.add_value('team', team_abbr)
                        loader.add_value('quarter', 'Q4')
                        loader.add_value('match_date', match_date)
                        loader.add_value('source_url', response.url)
                        
                        # Statistiques si disponibles
                        if has_stats:
                            # Minutes jouées
                            minutes = row.css('td[data-stat="mp"]::text').get()
                            loader.add_value('minutes', minutes)
                            
                            # Points
                            points = row.css('td[data-stat="pts"]::text').get()
                            loader.add_value('points', points)
                            
                            # Field goals
                            fg = row.css('td[data-stat="fg"]::text').get()
                            loader.add_value('field_goals', fg)
                            
                            # Field goal attempts
                            fga = row.css('td[data-stat="fga"]::text').get()
                            loader.add_value('field_goal_attempts', fga)
                            
                            # Free throws
                            ft = row.css('td[data-stat="ft"]::text').get()
                            loader.add_value('free_throws', ft)
                            
                            # Free throw attempts
                            fta = row.css('td[data-stat="fta"]::text').get()
                            loader.add_value('free_throw_attempts', fta)
                            
                            # 3-point field goals
                            fg3 = row.css('td[data-stat="fg3"]::text').get()
                            loader.add_value('three_point_field_goals', fg3)
                            
                            # 3-point field goal attempts
                            fg3a = row.css('td[data-stat="fg3a"]::text').get()
                            loader.add_value('three_point_field_goal_attempts', fg3a)
                            
                            # Rebounds
                            rebounds = row.css('td[data-stat="trb"]::text').get()
                            loader.add_value('rebounds', rebounds)
                            
                            # Assists
                            assists = row.css('td[data-stat="ast"]::text').get()
                            loader.add_value('assists', assists)
                            
                            # Steals
                            steals = row.css('td[data-stat="stl"]::text').get()
                            loader.add_value('steals', steals)
                            
                            # Blocks
                            blocks = row.css('td[data-stat="blk"]::text').get()
                            loader.add_value('blocks', blocks)
                            
                            # Turnovers
                            turnovers = row.css('td[data-stat="tov"]::text').get()
                            loader.add_value('turnovers', turnovers)
                            
                            # Personal fouls
                            fouls = row.css('td[data-stat="pf"]::text').get()
                            loader.add_value('personal_fouls', fouls)
                        
                        # Produire l'élément
                        yield loader.load_item()
                    else:
                        if player_name:
                            self.logger.debug(f"Skipped row with player_name: {player_name}")
            
            # Traiter les prolongations (overtime) si elles existent
            for ot_num in range(1, 6):  # OT1 à OT5
                ot_tables = response.css(f'div[id$="-ot{ot_num}-basic"] table')
                if len(ot_tables) == 0:
                    # Essayer avec une sélection plus large si la première méthode échoue
                    ot_tables = response.css(f'*[id*="-ot{ot_num}-basic"] table')
                
                self.logger.info(f"Found {len(ot_tables)} OT{ot_num} tables")
                
                if len(ot_tables) > 0:
                    # Parcourir chaque table de prolongation
                    for table_index, table in enumerate(ot_tables):
                        # Déterminer l'équipe (même logique que pour Q4)
                        table_id = table.attrib.get('id', '')
                        team_abbr = None
                        
                        # Regarder en premier le chemin complet pour identifier l'équipe
                        parent_path = "".join([p for p in table.xpath('ancestor-or-self::*/@id').getall()])
                        
                        # Rechercher quelle équipe correspond à cette table
                        if visitor_abbr and visitor_abbr.upper() in parent_path.upper():
                            team_abbr = visitor_abbr
                        elif home_abbr and home_abbr.upper() in parent_path.upper():
                            team_abbr = home_abbr
                        else:
                            # Essayer d'extraire l'abréviation de l'équipe à partir de l'ID de la table
                            if table_id and '-' in table_id:
                                match = re.search(r'^([A-Z]{3})', table_id)
                                if match:
                                    possible_abbr = match.group(1)
                                    if possible_abbr == visitor_abbr or possible_abbr == home_abbr:
                                        team_abbr = possible_abbr
                        
                        # Si on n'a toujours pas identifié l'équipe, utiliser une heuristique
                        if not team_abbr:
                            team_abbr = visitor_abbr if table_index == 0 else home_abbr
                        
                        self.logger.info(f"Processing OT{ot_num} table {table_index}, team: {team_abbr}")
                        
                        # Extraction similaire à Q4, mais pour la prolongation
                        player_rows = table.css('tbody tr')
                        
                        for row in player_rows:
                            player_name_elem = row.css('th[data-stat="player"]')
                            player_name = None
                            
                            if player_name_elem:
                                player_name = player_name_elem.css('a::text').get()
                                if not player_name:
                                    player_name = player_name_elem.css('::text').get()
                            
                            if player_name and player_name.strip() and not player_name.strip() in ['Team Totals', 'Reserves']:
                                self.logger.info(f"Extracting OT{ot_num} stats for player: {player_name}")
                                
                                has_stats = False
                                for data_stat in ['mp', 'pts', 'fg', 'fga']:
                                    if row.css(f'td[data-stat="{data_stat}"]::text').get():
                                        has_stats = True
                                        break
                                
                                loader = ItemLoader(item=PlayerClutchStats())
                                
                                loader.add_value('player_name', player_name.strip())
                                loader.add_value('team', team_abbr)
                                loader.add_value('quarter', f'OT{ot_num}')
                                loader.add_value('match_date', match_date)
                                loader.add_value('source_url', response.url)
                                
                                if has_stats:
                                    # Ajouter les statistiques comme pour Q4
                                    minutes = row.css('td[data-stat="mp"]::text').get()
                                    loader.add_value('minutes', minutes)
                                    
                                    points = row.css('td[data-stat="pts"]::text').get()
                                    loader.add_value('points', points)
                                    
                                    # Continuer avec les autres statistiques comme avant
                                    fg = row.css('td[data-stat="fg"]::text').get()
                                    loader.add_value('field_goals', fg)
                                    
                                    fga = row.css('td[data-stat="fga"]::text').get()
                                    loader.add_value('field_goal_attempts', fga)
                                    
                                    ft = row.css('td[data-stat="ft"]::text').get()
                                    loader.add_value('free_throws', ft)
                                    
                                    fta = row.css('td[data-stat="fta"]::text').get()
                                    loader.add_value('free_throw_attempts', fta)
                                    
                                    fg3 = row.css('td[data-stat="fg3"]::text').get()
                                    loader.add_value('three_point_field_goals', fg3)
                                    
                                    fg3a = row.css('td[data-stat="fg3a"]::text').get()
                                    loader.add_value('three_point_field_goal_attempts', fg3a)
                                    
                                    rebounds = row.css('td[data-stat="trb"]::text').get()
                                    loader.add_value('rebounds', rebounds)
                                    
                                    assists = row.css('td[data-stat="ast"]::text').get()
                                    loader.add_value('assists', assists)
                                    
                                    steals = row.css('td[data-stat="stl"]::text').get()
                                    loader.add_value('steals', steals)
                                    
                                    blocks = row.css('td[data-stat="blk"]::text').get()
                                    loader.add_value('blocks', blocks)
                                    
                                    turnovers = row.css('td[data-stat="tov"]::text').get()
                                    loader.add_value('turnovers', turnovers)
                                    
                                    fouls = row.css('td[data-stat="pf"]::text').get()
                                    loader.add_value('personal_fouls', fouls)
                                
                                yield loader.load_item()
                else:
                    # Si aucune table n'est trouvée pour cette prolongation, on arrête la recherche
                    break
        else:
            self.logger.error(f"Unable to process URL: {response.url}")
