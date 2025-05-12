# Basketball Scrapy Project

Ce projet scrape les statistiques des joueurs NBA à partir de basketball-reference.com, incluant :
- Statistiques "clutch" (4ème quart-temps et prolongations)
- Données de position des tirs (shot chart)
- Données de tir par équipe pour tous les joueurs d'une équipe

## Installation

1. Cloner le dépôt
2. Installer les dépendances:

```
pip install scrapy selenium webdriver-manager scrapy-user-agents
```

## Configuration

Le projet est configuré pour:
- Respecter les politiques de scraping du site (délais, User-Agent, etc.)
- Utiliser le cache HTTP pour éviter de refaire les mêmes requêtes
- Gérer les erreurs 429 (Too Many Requests)
- Limiter le nombre de requêtes simultanées
- Utiliser Selenium pour extraire le contenu rendu par JavaScript

## Utilisation

### Mode Statistiques de match (boxscore)

#### Mode Test (par défaut)

Pour lancer le scraper en mode test (quelques matchs par mois):

```
python app.py --spider=boxscore
```

#### Mode Saison Complète

Pour récupérer une saison complète (tous les matchs de tous les mois):

```
python app.py --spider=boxscore --full-season
```

ATTENTION: Le mode saison complète peut prendre plusieurs heures et générer des fichiers très volumineux.

#### Personnaliser le nom des fichiers de sortie

Vous pouvez spécifier un nom personnalisé pour les fichiers de sortie:

```
python app.py --spider=boxscore --output=nba_clutch_2024
```

Cela générera `nba_clutch_2024.json` et `nba_clutch_2024.csv`.

### Mode Team Shooting (données de tir par équipe)

Ce mode extrait les données de tir pour tous les joueurs d'une équipe spécifique:

```
scrapy crawl team_shooting -a team_code=IND -a season=2024 -o shots_data.csv
```

Paramètres:
- `team_code` : Le code de l'équipe (ex: "IND" pour les Pacers, "LAL" pour les Lakers)
- `season` : La saison (ex: 2024 pour la saison 2023-2024)
- `-o` : Fichier de sortie (format CSV recommandé)

Exemple pour extraire les données des Lakers:
```
scrapy crawl team_shooting -a team_code=LAL -a season=2024 -o lakers_shots.csv
```

Les codes des équipes NBA sont disponibles dans le fichier `team_colors.json` à la racine du projet.

### Extraction de toutes les équipes NBA

Pour extraire les données de tir de toutes les équipes NBA en une seule commande, utilisez le script `scrape_all_teams.py`:

```
python scrape_all_teams.py [saison] [options]
```

#### Options disponibles:

- `--sequential` : Exécution séquentielle (une équipe à la fois)
- `--parallel=N` : Exécution parallèle avec N workers (max 3, défaut: 1)
- `--help` ou `-h` : Affiche le message d'aide

#### Exemples:

```
# Utilise la saison actuelle, 1 worker par défaut
python scrape_all_teams.py

# Saison 2023-2024, 1 worker
python scrape_all_teams.py 2024

# Saison 2022-2023, mode séquentiel (une équipe à la fois)
python scrape_all_teams.py 2023 --sequential

# Saison actuelle, 2 équipes en parallèle
python scrape_all_teams.py --parallel=2
```

Ce script:
- Extrait les données de tir pour les 30 équipes NBA
- Crée un dossier `team_shots_XXXX` (où XXXX est la saison)
- Génère un fichier JSON et un fichier CSV pour chaque équipe
- Crée un fichier JSON combiné avec toutes les données
- Gère les interruptions et les erreurs de manière robuste

**Recommandations:**
- Utilisez le mode séquentiel (`--sequential`) ou un seul worker pour minimiser les risques d'erreurs
- L'extraction complète des 30 équipes peut prendre plusieurs heures
- Si vous rencontrez des erreurs avec certaines équipes, vous pouvez relancer le script ultérieurement - il ne retraitera que les équipes qui ont échoué

**Note:** Le script inclut des délais aléatoires entre les requêtes pour respecter le site et éviter d'être bloqué.

### Fichiers de sortie

Les données seront exportées dans:
- Fichier JSON (format JSON)
- Fichier CSV (format CSV)

Les noms des fichiers dépendent du type de spider et des paramètres utilisés.

## Paramètres des Spiders

### BoxScoreSpider

Dans le fichier `basketball_scrapy_project/spiders/boxscore_spider.py`:
- `max_month_pages`: Limite le nombre de mois à scraper (en mode test)
- `max_games_per_month`: Limite le nombre de matchs par mois (en mode test)

Ces limites sont désactivées automatiquement en mode `--full-season`.

### ShotChartSpider

Dans le fichier `basketball_scrapy_project/spiders/shotchart_spider.py`:
- `player_id`: ID du joueur sur basketball-reference.com
- `season`: Saison à récupérer

### TeamShootingSpider

Dans le fichier `basketball_scrapy_project/spiders/team_shooting_spider.py`:
- `team_code`: Code de l'équipe (voir `team_colors.json`)
- `season`: Saison à récupérer (ex: 2024 pour 2023-2024)

## Structure du projet

- `basketball_scrapy_project/spiders/boxscore_spider.py`: Spider pour les statistiques de match
- `basketball_scrapy_project/spiders/shotchart_spider.py`: Spider pour les données de tirs d'un joueur
- `basketball_scrapy_project/spiders/team_shooting_spider.py`: Spider pour les données de tirs d'une équipe
- `basketball_scrapy_project/items.py`: Définition des items à extraire
- `basketball_scrapy_project/middlewares.py`: Middlewares personnalisés
- `basketball_scrapy_project/settings.py`: Configuration globale du projet
- `app.py`: Script principal pour exécuter les spiders
- `team_colors.json`: Données des équipes NBA (codes, noms et couleurs)

## Informations des équipes NBA

Le fichier `team_colors.json` contient les informations pour chaque franchise NBA:
- Code d'équipe (ex: "LAL", "IND", "BOS")
- Nom complet (ex: "Los Angeles Lakers", "Indiana Pacers")
- Couleurs principales (fond et texte)

Vous pouvez utiliser ces informations pour la visualisation des données ou pour exécuter le spider `team_shooting` avec une équipe spécifique.

## Bonnes pratiques

Ce scraper est conçu pour être respectueux du site cible:
- Délais entre les requêtes
- Limitation des requêtes parallèles
- User-Agent personnalisé
- Gestion des erreurs 429 

## Exemples d'utilisation avancée

### Récupérer une saison complète avec un nom de fichier personnalisé

```
python app.py --spider=boxscore --full-season --output=nba_2024_clutch_stats
```

### Récupérer les données de tirs de LeBron James pour la saison 2022-2023

```
python app.py --spider=shotchart --player-id=jamesle01 --season=2023
```

### Récupérer les données de tirs de tous les joueurs des Celtics pour la saison 2023-2024

```
scrapy crawl team_shooting -a team_code=BOS -a season=2024 -o celtics_shots_2024.csv
```
