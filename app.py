from scrapy.crawler import CrawlerProcess
from basketball_scrapy_project.spiders.boxscore_spider import BoxScoreSpider
import os
import json
import argparse
from scrapy.utils.log import configure_logging
import logging

# Configurer le parser d'arguments
parser = argparse.ArgumentParser(description='Scrapez les statistiques NBA')
parser.add_argument('--full-season', action='store_true', 
                    help='Récupère la saison complète sans limites de matchs/mois')
parser.add_argument('--output', type=str, default='clutch_stats',
                    help='Nom de base pour les fichiers de sortie (sans extension)')
parser.add_argument('--spider', type=str, choices=['boxscore', 'shotchart'], default='boxscore',
                    help='Type de données à récupérer: boxscore (statistiques de match) ou shotchart (données de tirs)')
parser.add_argument('--player-id', type=str, default='gilgesh01',
                    help='ID du joueur pour le shot chart (ex: gilgesh01 pour Shai Gilgeous-Alexander)')
parser.add_argument('--season', type=str, default='2019',
                    help='Saison pour le shot chart (ex: 2019 pour la saison 2018-2019)')
args = parser.parse_args()

# Configurer le logging pour voir plus de détails
configure_logging(install_root_handler=False)
logging.basicConfig(
    level=logging.INFO if args.full_season else logging.DEBUG,  # Réduire la verbosité en mode saison complète
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)

# Assurez-vous que le répertoire des caches existe
os.makedirs('httpcache', exist_ok=True)

# Noms des fichiers de sortie adaptés au type de spider
if args.spider == 'shotchart':
    output_base = f"{args.player_id}_{args.season}_shotchart"
else:
    output_base = args.output

output_json = f"{output_base}.json"
output_csv = f"{output_base}.csv"

# Nettoyer les fichiers de sortie existants pour éviter la confusion
if os.path.exists(output_json):
    os.remove(output_json)
if os.path.exists(output_csv):
    os.remove(output_csv)
    
# Créer un fichier pour stocker la réponse HTML pour debug
if os.path.exists('debug_items.json'):
    os.remove('debug_items.json')

class DebugPipeline:
    def process_item(self, item, spider):
        # Enregistrer chaque item pour le debug
        with open('debug_items.json', 'a') as f:
            f.write(json.dumps(dict(item)) + '\n')
        return item

# Middleware pour enregistrer les réponses HTML
class SaveHtmlMiddleware:
    def process_response(self, request, response, spider):
        # Enregistrer la première page pour debug
        if 'basketball-reference.com' in response.url and not os.path.exists('debug_response.html'):
            with open('debug_response.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            spider.logger.info(f"Saved HTML response from {response.url} to debug_response.html")
        return response

# Afficher les paramètres utilisés
if args.spider == 'boxscore':
    if args.full_season:
        print("Mode SAISON COMPLÈTE activé - récupération de toutes les données")
        print("Attention: Cela peut prendre plusieurs heures et générer des fichiers volumineux")
    else:
        print("Mode TEST activé - récupération limitée de données (quelques matchs par mois)")
        print("Pour récupérer une saison complète, utilisez: python app.py --full-season")
else:
    print(f"Récupération des données de tirs pour le joueur ID: {args.player_id}, Saison: {args.season}")

# Créer le processus de crawling
process = CrawlerProcess(settings={
    "FEEDS": {
        output_json: {"format": "json"},
        output_csv: {"format": "csv"}
    },
    "LOG_LEVEL": "INFO" if args.full_season else "DEBUG",
    
    # Paramètres de respect du site
    "USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "ROBOTSTXT_OBEY": args.spider != 'shotchart',  # Désactiver pour le spider de shot chart
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
        "app.SaveHtmlMiddleware": 900,
    },
    "ITEM_PIPELINES": {
        "app.DebugPipeline": 300,
    },
})

# Lancer le spider approprié
print(f"Lancement du scraping... Sortie vers {output_json} et {output_csv}")

if args.spider == 'boxscore':
    process.crawl(BoxScoreSpider, full_season=str(args.full_season).lower())

process.start()
print(f"Scraping terminé. Vérifiez les fichiers {output_json} et {output_csv}")
