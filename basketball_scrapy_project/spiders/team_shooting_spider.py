import scrapy
import re
import time
import os
from basketball_scrapy_project.items import ShotChartData
from scrapy.loader import ItemLoader
from scrapy.exceptions import CloseSpider
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from scrapy import signals

class TeamShootingSpider(scrapy.Spider):
    name = 'team_shooting'
    allowed_domains = ['basketball-reference.com']
    
    custom_settings = {
        'RETRY_HTTP_CODES': [429, 500, 502, 503, 504, 522, 524, 408, 520],
        'RETRY_TIMES': 5,
        'RETRY_PRIORITY_ADJUST': -1,
        'ROBOTSTXT_OBEY': False,  # Désactiver l'obéissance au robots.txt
        'DOWNLOAD_DELAY': 3,  # Ajouter un délai entre les requêtes
        'CONCURRENT_REQUESTS': 1,  # Limiter à une requête à la fois
        'REDIRECT_ENABLED': True,  # Activer les redirections
        'LOG_LEVEL': 'INFO',
        'DOWNLOADER_MIDDLEWARES': {
            'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
            'scrapy_user_agents.middlewares.RandomUserAgentMiddleware': 400,
        }
    }
    
    def __init__(self, team_code=None, season=None, *args, **kwargs):
        super(TeamShootingSpider, self).__init__(*args, **kwargs)
        
        if not team_code:
            raise CloseSpider("Un code d'équipe est requis (ex: 'BOS' pour Boston)")
        
        self.team_code = team_code.upper()
        
        if not season:
            raise CloseSpider("Une saison est requise (ex: '2024' pour 2023-24)")
        
        self.season = season
        
        # URL de la page de l'équipe
        self.start_urls = [f'https://www.basketball-reference.com/teams/{self.team_code}/{self.season}.html']
        
        # Initialisation du driver Selenium avec webdriver-manager
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Exécuter en mode headless
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")  # Définir une taille d'écran suffisante
        
        # Ajouter un user-agent pour éviter les détections de bot
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
        
        # Initialiser le driver avec webdriver-manager pour gérer automatiquement les versions du pilote
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        self.driver.implicitly_wait(5)  # Attente implicite de 5 secondes
        
    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super(TeamShootingSpider, cls).from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.spider_closed, signal=signals.spider_closed)
        return spider
        
    def spider_closed(self, spider):
        spider.logger.info('Spider fermé: %s', spider.name)
        # Fermer le navigateur Selenium
        self.driver.quit()
        
    def parse(self, response):
        """Parse la page de l'équipe pour extraire les liens vers les pages de shooting des joueurs"""
        self.logger.info(f"Parsing de la page de l'équipe: {response.url}")
        
        # Utiliser Selenium pour charger la page
        self.driver.get(response.url)
        
        # Attendre que la page soit chargée
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '#div_roster table'))
            )
        except Exception as e:
            self.logger.error(f"Erreur lors du chargement de la page: {e}")
            # Sauvegardons le contenu HTML pour déboguer
            with open(f"debug_roster_{self.team_code}.html", 'w', encoding='utf-8') as f:
                f.write(self.driver.page_source)
            self.logger.info(f"HTML enregistré dans debug_roster_{self.team_code}.html pour débogage")
            return
        
        # Extraire les liens des joueurs
        player_links = []
        try:
            player_elements = self.driver.find_elements(By.CSS_SELECTOR, 'td[data-stat="player"] a')
            for player_element in player_elements:
                player_links.append(player_element.get_attribute('href'))
        except Exception as e:
            self.logger.error(f"Erreur lors de l'extraction des liens des joueurs: {e}")
            # Sauvegardons le contenu HTML pour déboguer
            with open(f"debug_roster_{self.team_code}.html", 'w', encoding='utf-8') as f:
                f.write(self.driver.page_source)
            self.logger.info(f"HTML enregistré dans debug_roster_{self.team_code}.html pour débogage")
            return
        
        for player_link in player_links:
            # Extraire l'ID du joueur du lien
            player_id = player_link.split('/')[-1].replace('.html', '')
            # Construire l'URL de la page de shooting du joueur sans .html
            shooting_url = f"https://www.basketball-reference.com/players/{player_id[0]}/{player_id}/shooting/{self.season}"
            self.logger.info(f"Visite de la page de shooting: {shooting_url}")
            
            yield scrapy.Request(
                url=shooting_url,
                callback=self.parse_player_shooting,
                meta={'player_url': player_link},
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': response.url
                }
            )
    
    def parse_player_shooting(self, response):
        """Parse la page de shooting d'un joueur"""
        player_url = response.meta['player_url']
        
        # Extraire le player_id du lien original
        player_id_match = re.search(r'/players/([^/]+/[^/]+)\.html', player_url)
        if not player_id_match:
            self.logger.error(f"Impossible d'extraire le player_id de l'URL: {player_url}")
            return
            
        player_id = player_id_match.group(1)
        
        # Utiliser Selenium pour charger la page et rendre le JavaScript
        self.driver.get(response.url)
        
        # Attendre que la page soit chargée
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'ul.hoversmooth'))
            )
        except Exception as e:
            self.logger.error(f"Erreur lors du chargement de la page: {e}")
        
        # Extraire le nom du joueur avec Selenium
        try:
            player_name_element = self.driver.find_element(By.CSS_SELECTOR, 'ul.hoversmooth li.index:first-child a u')
            player_name = player_name_element.text
        except:
            try:
                player_name_element = self.driver.find_element(By.CSS_SELECTOR, 'ul.hoversmooth li.index:first-child a')
                player_name = player_name_element.text
            except:
                self.logger.warning(f"Nom du joueur non trouvé pour {player_id}")
                # Sauvegardons le contenu HTML pour déboguer si besoin
                safe_player_id = player_id.replace('/', '_')
                with open(f"debug_player_{safe_player_id}.html", 'w', encoding='utf-8') as f:
                    f.write(self.driver.page_source)
                self.logger.info(f"HTML enregistré dans debug_player_{safe_player_id}.html pour débogage")
                return
        
        player_name = player_name.strip()
        self.logger.info(f"Extraction des données pour le joueur: {player_name}")
        
        # Attendre que le shot chart soit chargé
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '#shot-wrapper'))
            )
        except Exception as e:
            self.logger.warning(f"Shot chart non trouvé pour {player_name}: {e}")
            # Sauvegardons le contenu HTML complet pour déboguer
            safe_player_id = player_id.replace('/', '_')
            with open(f"debug_shot_chart_{safe_player_id}.html", 'w', encoding='utf-8') as f:
                f.write(self.driver.page_source)
            self.logger.info(f"HTML du shot chart enregistré dans debug_shot_chart_{safe_player_id}.html pour débogage")
            return
        
        # Au lieu d'itérer sur les éléments directement, récupérer tout le HTML et extraire les données
        html_source = self.driver.page_source
        
        # Créer un objet Selector de Scrapy à partir du HTML
        selector = scrapy.Selector(text=html_source)
        
        # Extraire les éléments de tir avec le sélecteur Scrapy
        shot_elements = selector.css('#shot-wrapper div.tooltip')
        
        if not shot_elements:
            self.logger.warning(f"Aucun élément de tir trouvé pour {player_name}")
            # Sauvegardons le contenu HTML complet pour déboguer
            safe_player_id = player_id.replace('/', '_')
            with open(f"debug_shot_chart_{safe_player_id}.html", 'w', encoding='utf-8') as f:
                f.write(html_source)
            self.logger.info(f"HTML du shot chart enregistré dans debug_shot_chart_{safe_player_id}.html pour débogage")
            return
        
        self.logger.info(f"Trouvé {len(shot_elements)} tirs pour {player_name}")
        
        for shot_element in shot_elements:
            loader = ItemLoader(item=ShotChartData())
            
            # Données de base du joueur et de la saison
            loader.add_value('player_id', player_id)
            loader.add_value('player_name', player_name)
            loader.add_value('season', self.season)
            loader.add_value('source_url', response.url)
            
            try:
                # Extraire les coordonnées x et y à partir du style CSS
                style = shot_element.attrib.get('style', '')
                x_match = re.search(r'left:(\d+)px', style)
                y_match = re.search(r'top:(\d+)px', style)
                
                if x_match and y_match:
                    x_coordinate = x_match.group(1)
                    y_coordinate = y_match.group(1)
                    loader.add_value('x_coordinate', x_coordinate)
                    loader.add_value('y_coordinate', y_coordinate)
                
                # Déterminer si le tir est réussi en fonction de la classe
                shot_class = shot_element.attrib.get('class', '')
                is_make = 'make' in shot_class
                loader.add_value('is_made', str(is_make))
                
                # Extraire les détails du tir à partir de l'attribut tip
                tip_text = shot_element.attrib.get('tip', '')
                if tip_text:
                    # Extraire la date et les équipes
                    match_info = re.search(r'^(.+?),\s+(.+?)\s+(?:vs|at)\s+(.+?)(?:<br>|$)', tip_text)
                    if match_info:
                        game_date = match_info.group(1).strip()
                        team1 = match_info.group(2).strip()
                        team2 = match_info.group(3).strip()
                        teams = f"{team1} vs {team2}"
                        
                        loader.add_value('game_date', game_date)
                        loader.add_value('teams', teams)
                    
                    # Extraire le quart-temps et le temps restant
                    period_info = re.search(r'<br>(\d+\w+)\s+(?:Qtr|OT),\s+(\d+:\d+)\s+remaining', tip_text)
                    if period_info:
                        quarter = period_info.group(1)
                        time_remaining = period_info.group(2)
                        
                        loader.add_value('quarter', quarter)
                        loader.add_value('time_remaining', time_remaining)
                    
                    # Extraire le type de tir et la distance
                    shot_info = re.search(r'<br>(Made|Missed)\s+(\d+)-pointer\s+from\s+(\d+)\s+ft', tip_text)
                    if shot_info:
                        shot_result = shot_info.group(1)
                        shot_type = f"{shot_info.group(2)}-pointer"
                        shot_distance = shot_info.group(3)
                        
                        loader.add_value('shot_type', shot_type)
                        loader.add_value('shot_distance', shot_distance)
                    
                    # Extraire la description du score
                    score_info = re.search(r'<br>(.+?now\s+.+?\s+.+?-.+?)(?:<br>|$)', tip_text)
                    if score_info:
                        score_description = score_info.group(1).strip()
                        loader.add_value('score_description', score_description)
                
                yield loader.load_item()
            except Exception as e:
                self.logger.error(f"Erreur lors de l'extraction des données d'un tir: {e}")
        
        self.logger.info(f"Terminé le scraping des tirs pour {player_name}")

# REMARQUE IMPORTANTE:
"""
Les données de tir (shot chart) sur Basketball Reference sont générées dynamiquement via JavaScript.
Scrapy ne peut pas exécuter JavaScript, donc nous ne pouvons pas extraire ces données avec un spider Scrapy standard.

Pour résoudre ce problème, vous avez besoin d'une des solutions suivantes:

1. Utiliser Scrapy avec Splash ou Selenium pour rendre le JavaScript:
   - Installation: pip install scrapy-selenium
   - Exemple d'implémentation:

   from scrapy_selenium import SeleniumRequest
   
   def start_requests(self):
       for url in self.start_urls:
           yield SeleniumRequest(
               url=url,
               callback=self.parse,
               wait_time=10  # Attendre 10 secondes pour que le JS s'exécute
           )
           
   # Et modifier les autres requêtes pour utiliser SeleniumRequest également

2. Trouver l'API qui fournit les données brutes:
   - Les données sont probablement chargées via une API JSON
   - Examiner les requêtes réseau dans les outils de développement du navigateur
   - Rechercher des requêtes AJAX qui chargent les données de tir

3. Analyser le code JavaScript pour extraire directement les données:
   - Examiner les scripts pour trouver la variable qui contient les données (ex: 'var shotData = ...')
   - Utiliser regex ou un parseur JS pour extraire ces données

Si vous voulez continuer avec cette approche, vous devrez adapter votre pipeline pour tenir 
compte du fait qu'aucune donnée de tir ne sera collectée avec le spider actuel.
""" 