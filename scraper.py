import argparse
import json
import logging
import os
import random
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from scrapy.crawler import CrawlerProcess
from scrapy.utils.log import configure_logging
from basketball_scrapy_project.spiders.boxscore_spider import BoxScoreSpider

# Chemin du script et répertoire de travail
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEAMS_JSON_PATH = os.path.join(SCRIPT_DIR, 'team_colors.json')

# Définir la saison à scraper par défaut (saison actuelle)
current_year = datetime.now().year
if datetime.now().month >= 10:  # La saison NBA commence en octobre
    DEFAULT_SEASON = current_year + 1
else:
    DEFAULT_SEASON = current_year

# Classes de middleware et pipeline pour le debugging
class DebugPipeline:
    def process_item(self, item, spider):
        # Enregistrer chaque item pour le debug
        with open('debug_items.json', 'a') as f:
            f.write(json.dumps(dict(item)) + '\n')
        return item

class SaveHtmlMiddleware:
    def process_response(self, request, response, spider):
        # Enregistrer la première page pour debug
        if 'basketball-reference.com' in response.url and not os.path.exists('debug_response.html'):
            with open('debug_response.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            spider.logger.info(f"Saved HTML response from {response.url} to debug_response.html")
        return response

def get_default_settings(log_level="DEBUG", spider_type="boxscore"):
    """Retourne la configuration par défaut pour les spiders Scrapy"""
    return {
        "LOG_LEVEL": log_level,
        
        # Paramètres de respect du site
        "USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "ROBOTSTXT_OBEY": spider_type != 'shotchart',  # Désactiver pour le spider de shot chart
        "DOWNLOAD_DELAY": 5,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        
        # AutoThrottle pour éviter de surcharger le serveur
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_START_DELAY": 5,
        "AUTOTHROTTLE_MAX_DELAY": 60,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 1.0,
        "AUTOTHROTTLE_DEBUG": True,
        
        # Cache HTTP pour éviter de refaire les mêmes requêtes
        "HTTPCACHE_ENABLED": True,
        "HTTPCACHE_EXPIRATION_SECS": 86400,  # 24 heures
        "HTTPCACHE_DIR": "httpcache",
        
        # Retry pour gérer les erreurs temporaires
        "RETRY_ENABLED": True,
        "RETRY_TIMES": 5,
        "RETRY_HTTP_CODES": [429, 500, 502, 503, 504, 522, 524, 408, 520],
        
        # Middlewares personnalisés
        "DOWNLOADER_MIDDLEWARES": {
            "basketball_scrapy_project.middlewares.RandomUserAgentMiddleware": 400,
            "basketball_scrapy_project.middlewares.TooManyRequestsRetryMiddleware": 610,
            "scrapy.downloadermiddlewares.retry.RetryMiddleware": None,
            "scraper.SaveHtmlMiddleware": 900,
        },
        "ITEM_PIPELINES": {
            "scraper.DebugPipeline": 300,
        },
    }

def scrape_boxscores(args):
    """Exécute le spider pour les statistiques de match (boxscore)"""
    # Configurer le logging
    configure_logging(install_root_handler=False)
    logging.basicConfig(
        level=logging.INFO if args.full_season else logging.DEBUG,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
    )
    
    # Assurez-vous que le répertoire des caches existe
    os.makedirs('httpcache', exist_ok=True)
    
    # Définir le nom de fichier de sortie
    output_base = args.output
    output_json = f"{output_base}.json"
    output_csv = f"{output_base}.csv"
    
    # Nettoyer les fichiers de sortie existants pour éviter la confusion
    if os.path.exists(output_json):
        os.remove(output_json)
    if os.path.exists(output_csv):
        os.remove(output_csv)
        
    # Créer un fichier pour stocker les items pour debug
    if os.path.exists('debug_items.json'):
        os.remove('debug_items.json')
    
    # Afficher les paramètres utilisés
    if args.full_season:
        print("Mode SAISON COMPLÈTE activé - récupération de toutes les données")
        print("Attention: Cela peut prendre plusieurs heures et générer des fichiers volumineux")
    else:
        print("Mode TEST activé - récupération limitée de données (quelques matchs par mois)")
        print("Pour récupérer une saison complète, utilisez: --full-season")
    
    # Obtenir les paramètres de base
    settings = get_default_settings("INFO" if args.full_season else "DEBUG", "boxscore")
    settings["FEEDS"] = {
        output_json: {"format": "json"},
        output_csv: {"format": "csv"}
    }
    
    # Créer le processus de crawling
    process = CrawlerProcess(settings=settings)
    
    # Lancer le spider
    print(f"Lancement du scraping... Sortie vers {output_json} et {output_csv}")
    process.crawl(BoxScoreSpider, full_season=str(args.full_season).lower())
    process.start()
    print(f"Scraping terminé. Vérifiez les fichiers {output_json} et {output_csv}")

def scrape_shotchart(args):
    """Exécute le spider pour les données de tirs d'un joueur"""
    # Configurer le logging
    configure_logging(install_root_handler=False)
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
    )
    
    # Assurez-vous que le répertoire des caches existe
    os.makedirs('httpcache', exist_ok=True)
    
    # Définir le nom de fichier de sortie
    output_base = f"{args.player_id}_{args.season}_shotchart"
    output_json = f"{output_base}.json"
    output_csv = f"{output_base}.csv"
    
    # Nettoyer les fichiers de sortie existants pour éviter la confusion
    if os.path.exists(output_json):
        os.remove(output_json)
    if os.path.exists(output_csv):
        os.remove(output_csv)
        
    # Créer un fichier pour stocker les items pour debug
    if os.path.exists('debug_items.json'):
        os.remove('debug_items.json')
    
    print(f"Récupération des données de tirs pour le joueur ID: {args.player_id}, Saison: {args.season}")
    
    # Obtenir les paramètres de base
    settings = get_default_settings("DEBUG", "shotchart")
    settings["FEEDS"] = {
        output_json: {"format": "json"},
        output_csv: {"format": "csv"}
    }
    
    # Importer le spider dynamiquement pour éviter les imports inutiles
    from basketball_scrapy_project.spiders.team_shooting_spider import TeamShootingSpider
    
    # Créer le processus de crawling
    process = CrawlerProcess(settings=settings)
    
    # Lancer le spider
    print(f"Lancement du scraping... Sortie vers {output_json} et {output_csv}")
    process.crawl(TeamShootingSpider, player_id=args.player_id, season=args.season)
    process.start()
    print(f"Scraping terminé. Vérifiez les fichiers {output_json} et {output_csv}")

def scrape_single_team(args):
    """Exécute le spider pour les données de tirs d'une équipe spécifique"""
    team_code = args.team_code.upper()
    season = args.season
    
    output_file = f"{team_code.lower()}_shots_{season}.json"
    csv_file = f"{team_code.lower()}_shots_{season}.csv"
    
    print(f"Extraction des données de tir pour {team_code} (saison {int(season)-1}-{season})...")
    
    # Exécuter le spider Scrapy pour cette équipe
    command = f"scrapy crawl team_shooting -a team_code={team_code} -a season={season} -o \"{output_file}:json\""
    
    try:
        result = subprocess.run(command, shell=True, check=False)
        
        if result.returncode != 0:
            print(f"Erreur lors de l'extraction des données pour {team_code}.")
            return False
            
        print(f"Données extraites avec succès pour {team_code} -> {output_file}")
        
        # Générer également un fichier CSV
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            csv_command = f"scrapy crawl team_shooting -a team_code={team_code} -a season={season} -o \"{csv_file}:csv\""
            try:
                subprocess.run(csv_command, shell=True, check=False)
            except Exception as e:
                print(f"Avertissement: Impossible de créer le fichier CSV: {e}")
        
        return True
    except Exception as e:
        print(f"Exception lors de l'extraction des données: {e}")
        return False

def scrape_team_shooting(args):
    """Récupère les données de tir pour une équipe"""
    result = scrape_single_team(args)
    if result:
        print(f"Extraction réussie pour l'équipe {args.team_code}")
    else:
        print(f"Échec de l'extraction pour l'équipe {args.team_code}")

def scrape_all_teams(args):
    """Récupère les données de tir pour toutes les équipes NBA"""
    try:
        with open(TEAMS_JSON_PATH, 'r') as f:
            teams = json.load(f)
    except FileNotFoundError:
        print(f"Erreur: Le fichier {TEAMS_JSON_PATH} n'a pas été trouvé.")
        print(f"Répertoire de travail actuel: {os.getcwd()}")
        print(f"Contenu du répertoire: {os.listdir('.')}")
        return

    # Créer le répertoire de sortie s'il n'existe pas
    output_dir = os.path.join(SCRIPT_DIR, f"team_shots_{args.season}")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Définir la fonction de scraping d'équipe avec contexte
    def scrape_team(team_code):
        team_name = teams[team_code]['name']
        output_file = os.path.join(output_dir, f"{team_code.lower()}_shots_{args.season}.json")
        csv_file = os.path.join(output_dir, f"{team_code.lower()}_shots_{args.season}.csv")
        
        # Ajouter un délai aléatoire pour éviter les requêtes simultanées
        time.sleep(random.uniform(1, 3))
        
        print(f"Extraction des données pour {team_name} (saison {int(args.season)-1}-{args.season})...")
        
        # Exécuter le spider Scrapy pour cette équipe avec format JSON
        command = f"scrapy crawl team_shooting -a team_code={team_code} -a season={args.season} -o \"{output_file}:json\""
        
        try:
            result = subprocess.run(command, shell=True, check=False, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"Erreur lors de l'extraction des données pour {team_name}.")
                print(f"Code d'erreur: {result.returncode}")
                if result.stderr:
                    error_log = os.path.join(output_dir, f"{team_code.lower()}_error.log")
                    with open(error_log, 'w') as f:
                        f.write(result.stderr)
                    print(f"Détails de l'erreur enregistrés dans {error_log}")
                return False
                
            print(f"Données extraites avec succès pour {team_name} -> {output_file}")
            
            # Générer également un fichier CSV (seulement si JSON a réussi)
            if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
                csv_command = f"scrapy crawl team_shooting -a team_code={team_code} -a season={args.season} -o \"{csv_file}:csv\""
                try:
                    subprocess.run(csv_command, shell=True, check=False, capture_output=True)
                except Exception as e:
                    print(f"Avertissement: Impossible de créer le fichier CSV pour {team_name}: {e}")
            
            return True
        except Exception as e:
            print(f"Exception lors de l'extraction des données pour {team_name}: {e}")
            return False

    print(f"Début de l'extraction des données de tir pour toutes les équipes NBA - Saison {int(args.season)-1}-{args.season}")
    
    # Obtenir la liste des équipes
    team_codes = list(teams.keys())
    
    # Option pour traiter une seule équipe à la fois (pour tests)
    if args.teams:
        team_codes = [code.strip().upper() for code in args.teams.split(',')]
        print(f"Mode équipes sélectionnées: {', '.join(team_codes)}")
    
    success_count = 0
    failed_teams = []
    
    if args.parallel > 0:
        print(f"Mode parallèle activé avec {args.parallel} équipe(s) en simultané")
        try:
            with ThreadPoolExecutor(max_workers=args.parallel) as executor:
                results = list(executor.map(scrape_team, team_codes))
                success_count = sum(results)
                failed_teams = [team_codes[i] for i, result in enumerate(results) if not result]
        except KeyboardInterrupt:
            print("\nInterruption par l'utilisateur. Arrêt des extractions en cours...")
            print("Les données extraites jusqu'à présent seront conservées.")
        except Exception as e:
            print(f"\nErreur inattendue: {e}")
    else:
        print("Mode séquentiel activé (une équipe à la fois)")
        try:
            for team_code in team_codes:
                if scrape_team(team_code):
                    success_count += 1
                else:
                    failed_teams.append(team_code)
                # Ajouter un délai entre les équipes pour éviter de surcharger le site
                if team_code != team_codes[-1]:  # Pas de délai après la dernière équipe
                    delay = random.uniform(3, 5)
                    print(f"   Attente de {delay:.1f} secondes avant la prochaine équipe...")
                    time.sleep(delay)
        except KeyboardInterrupt:
            print("\nInterruption par l'utilisateur. Arrêt des extractions en cours...")
            print("Les données extraites jusqu'à présent seront conservées.")
    
    print(f"\nRésumé: {success_count}/{len(team_codes)} équipes extraites avec succès")
    if failed_teams:
        print(f"Équipes en échec: {', '.join(failed_teams)}")
    print(f"Les fichiers ont été enregistrés dans le répertoire: {os.path.abspath(output_dir)}")
    
    # Générer un fichier JSON combiné avec toutes les équipes
    print("Génération du fichier JSON combiné...")
    combined_data = {}
    for team_code in team_codes:
        json_file = os.path.join(output_dir, f"{team_code.lower()}_shots_{args.season}.json")
        if os.path.exists(json_file) and os.path.getsize(json_file) > 0:
            try:
                with open(json_file, 'r') as f:
                    team_data = json.load(f)
                    combined_data[team_code] = {
                        "team_name": teams[team_code]['name'],
                        "shots": team_data
                    }
            except json.JSONDecodeError:
                print(f"Impossible de charger le fichier {json_file} (format JSON invalide)")
            except Exception as e:
                print(f"Erreur lors du traitement du fichier {json_file}: {e}")
    
    if combined_data:
        combined_file = os.path.join(output_dir, f"all_teams_shots_{args.season}.json")
        with open(combined_file, 'w') as f:
            json.dump(combined_data, f, indent=2)
        print(f"Fichier combiné créé: {combined_file}")
    else:
        print("Aucune donnée valide trouvée pour créer le fichier combiné")

def main():
    # Créer le parser principal
    parser = argparse.ArgumentParser(description='NBA Data Scraping Tool')
    subparsers = parser.add_subparsers(dest='command', help='Commande à exécuter')
    
    # Sous-commande pour les statistiques de match (boxscore)
    boxscore_parser = subparsers.add_parser('boxscore', help='Récupérer les statistiques de match')
    boxscore_parser.add_argument('--full-season', action='store_true', 
                       help='Récupère la saison complète sans limites de matchs/mois')
    boxscore_parser.add_argument('--output', type=str, default='clutch_stats',
                       help='Nom de base pour les fichiers de sortie (sans extension)')
    
    # Sous-commande pour les données de tirs d'un joueur (shotchart)
    shotchart_parser = subparsers.add_parser('shotchart', help='Récupérer les données de tirs d\'un joueur')
    shotchart_parser.add_argument('--player-id', type=str, required=True,
                         help='ID du joueur (ex: gilgesh01 pour Shai Gilgeous-Alexander)')
    shotchart_parser.add_argument('--season', type=str, default=str(DEFAULT_SEASON),
                         help=f'Saison (ex: {DEFAULT_SEASON} pour la saison {DEFAULT_SEASON-1}-{DEFAULT_SEASON})')
    
    # Sous-commande pour les données de tirs d'une équipe (team)
    team_parser = subparsers.add_parser('team', help='Récupérer les données de tirs d\'une équipe')
    team_parser.add_argument('--team-code', type=str, required=True, 
                    help='Code de l\'équipe (ex: LAL, BOS)')
    team_parser.add_argument('--season', type=str, default=str(DEFAULT_SEASON),
                    help=f'Saison (ex: {DEFAULT_SEASON} pour la saison {DEFAULT_SEASON-1}-{DEFAULT_SEASON})')
    
    # Sous-commande pour les données de tirs de toutes les équipes (all-teams)
    all_teams_parser = subparsers.add_parser('all-teams', help='Récupérer les données de tirs de toutes les équipes')
    all_teams_parser.add_argument('--season', type=str, default=str(DEFAULT_SEASON),
                         help=f'Saison (ex: {DEFAULT_SEASON} pour la saison {DEFAULT_SEASON-1}-{DEFAULT_SEASON})')
    all_teams_parser.add_argument('--sequential', action='store_true',
                         help='Exécution séquentielle (une équipe à la fois)')
    all_teams_parser.add_argument('--parallel', type=int, default=1,
                         help='Nombre de workers pour l\'exécution parallèle (max 3, défaut: 1)')
    all_teams_parser.add_argument('--teams', type=str,
                         help='Liste des codes d\'équipes à traiter, séparés par des virgules (ex: LAL,BOS,GSW)')
    
    args = parser.parse_args()
    
    # Traiter la commande
    if args.command == 'boxscore':
        scrape_boxscores(args)
    elif args.command == 'shotchart':
        scrape_shotchart(args)
    elif args.command == 'team':
        scrape_team_shooting(args)
    elif args.command == 'all-teams':
        # Ajuster les paramètres pour la compatibilité avec le code existant
        if args.sequential:
            args.parallel = 0
        # Limiter le nombre de workers à 3
        args.parallel = min(3, max(0, args.parallel))
        scrape_all_teams(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 