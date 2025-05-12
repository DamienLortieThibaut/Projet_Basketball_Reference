# Basketball Scrapy Project

Ce projet extrait les statistiques des joueurs NBA à partir de basketball-reference.com, incluant :
- Statistiques "clutch" (4ème quart-temps et prolongations)
- Données de position des tirs (shot chart)
- Données de tir par équipe pour tous les joueurs d'une équipe

## Demonstration

Le dashboard est conçu pour être intuitif et offre une expérience utilisateur fluide pour analyser les données de basketball extraites par les scrapers.

Voici une preview disponible par ce lien: [Le lien de la video](https://youtu.be/QwyLAFyd4jo)

## Installation et démarrage du projet

### Backend (Scraper)

1. Cloner le dépôt
   ```bash
   git clone https://github.com/username/basketball_scrapy_project.git
   cd basketball_scrapy_project
   ```

2. Créer et activer un environnement virtuel (recommandé)
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Installer les dépendances du scraper
   ```bash
   pip install -r requirements.txt
   ```

### Frontend (Dashboard)

1. Naviguer vers le dossier frontend
   ```bash
   cd frontend_basketball_scrapy
   ```

2. Installer les dépendances (Node.js requis)
   ```bash
   npm install
   ```

3. Démarrer l'application en mode développement
   ```bash
   npm run dev
   ```

4. L'application sera accessible à l'adresse [http://localhost:5173](http://localhost:5173)

### Configuration et utilisation

1. Les données extraites sont stockées dans le dossier `output/` par défaut
2. Le frontend charge automatiquement les données des fichiers JSON dans le dossier `frontend_basketball_scrapy/public/data/`
3. Pour utiliser vos propres données, copiez les fichiers JSON extraits dans ce dossier

### Déploiement

Pour un déploiement en production:

1. Construire l'application frontend
   ```bash
   cd frontend_basketball_scrapy
   npm run build
   ```

2. Déployer les fichiers générés sur votre serveur web préféré

## Configuration

Le projet est configuré pour:
- Respecter les politiques de scraping du site (délais, User-Agent, etc.)
- Utiliser le cache HTTP pour éviter de refaire les mêmes requêtes
- Gérer les erreurs 429 (Too Many Requests)
- Limiter le nombre de requêtes simultanées
- Utiliser Selenium pour extraire le contenu rendu par JavaScript

## Utilisation avec l'outil unifié `scraper.py`

Le projet dispose désormais d'un outil de ligne de commande unifié (`scraper.py`) qui centralise toutes les fonctionnalités d'extraction de données.

### Commandes disponibles

```bash
python scraper.py [commande] [options]
```

Où `[commande]` est l'une des suivantes:
- `boxscore` - Statistiques de match (moments clutch)
- `shotchart` - Données de tirs d'un joueur spécifique
- `team` - Données de tirs d'une équipe spécifique
- `all-teams` - Données de tirs pour toutes les équipes NBA

Pour afficher l'aide générale:
```bash
python scraper.py --help
```

Pour afficher l'aide d'une commande spécifique:
```bash
python scraper.py [commande] --help
```

### Exemples d'utilisation

#### 1. Statistiques de match (boxscore)

Mode test (quelques matchs par mois):
```bash
python scraper.py boxscore
```

Mode saison complète:
```bash
python scraper.py boxscore --full-season
```

Personnaliser le nom des fichiers de sortie:
```bash
python scraper.py boxscore --output=nba_clutch_2024
```

#### 2. Données de tirs d'une équipe

```bash
python scraper.py team --team-code=LAL --season=2024
```

#### 3. Données de tirs de toutes les équipes

Mode séquentiel (une équipe à la fois):
```bash
python scraper.py all-teams --sequential --season=2024
```

Mode parallèle (plusieurs équipes simultanément):
```bash
python scraper.py all-teams --parallel=2 --season=2024
```

Équipes spécifiques uniquement:
```bash
python scraper.py all-teams --teams=LAL,BOS,GSW
```

## Compatibilité avec les anciens scripts

Pour des raisons de rétrocompatibilité, les anciens scripts restent disponibles:

### `app.py` (Statistiques de match)

```bash
python app.py --spider=boxscore [--full-season] [--output=nom_fichier]
```

### `scrape_all_teams.py` (Données de tir par équipe)

```bash
python scrape_all_teams.py [saison] [--sequential | --parallel=N]
```

Cependant, il est recommandé d'utiliser le nouvel outil unifié `scraper.py` pour toutes les nouvelles extractions.

## Fichiers de sortie

Les données sont exportées dans:
- Format JSON (traitement automatisé)
- Format CSV (analyse et visualisation)

Les noms des fichiers dépendent du type de commande et des paramètres utilisés.

## Structure du projet

### Scripts principaux
- `scraper.py`: Outil unifié pour toutes les extractions de données (RECOMMANDÉ)
- `app.py`: Script original pour les statistiques clutch (ancien, maintenu pour compatibilité)
- `scrape_all_teams.py`: Script original pour les données de tirs par équipe (ancien)

### Structure interne
- `basketball_scrapy_project/spiders/boxscore_spider.py`: Spider pour les statistiques de match
- `basketball_scrapy_project/spiders/shotchart_spider.py`: Spider pour les données de tirs d'un joueur
- `basketball_scrapy_project/spiders/team_shooting_spider.py`: Spider pour les données de tirs d'une équipe
- `basketball_scrapy_project/items.py`: Définition des items à extraire
- `basketball_scrapy_project/middlewares.py`: Middlewares personnalisés
- `basketball_scrapy_project/settings.py`: Configuration globale du projet
- `team_colors.json`: Données des équipes NBA (codes, noms et couleurs)

## Paramètres des Spiders

### BoxScoreSpider
- `max_month_pages`: Limite le nombre de mois à scraper (en mode test)
- `max_games_per_month`: Limite le nombre de matchs par mois (en mode test)

Ces limites sont désactivées automatiquement en mode `--full-season`.

### ShotChartSpider
- `player_id`: ID du joueur sur basketball-reference.com
- `season`: Saison à récupérer

### TeamShootingSpider
- `team_code`: Code de l'équipe (voir `team_colors.json`)
- `season`: Saison à récupérer (ex: 2024 pour 2023-2024)

## Bonnes pratiques

Ce scraper est conçu pour être respectueux du site cible:
- Délais entre les requêtes avec Auto Throttle
- Limitation des requêtes parallèles
- User-Agent aléatoire
- Gestion des erreurs 429 (Too Many Requests)
- Système de cache pour éviter les requêtes redondantes

## Conseils d'utilisation

1. **Commencez petit** : Testez d'abord avec un petit ensemble de données avant de lancer une extraction complète.
2. **Respectez le site** : Utilisez le mode séquentiel ou un nombre limité de workers parallèles.
3. **Patience** : L'extraction de données complètes peut prendre plusieurs heures.
4. **Vérifiez les erreurs** : Examinez les fichiers logs en cas d'échec pour comprendre et corriger les problèmes.
5. **Attention aux limites** : Le site peut bloquer temporairement les adresses IP qui font trop de requêtes.

## Informations des équipes NBA

Le fichier `team_colors.json` contient les informations pour chaque franchise NBA:
- Code d'équipe (ex: "LAL", "IND", "BOS")
- Nom complet (ex: "Los Angeles Lakers", "Indiana Pacers")
- Couleurs principales (fond et texte)

Ces informations peuvent être utilisées pour la visualisation des données extraites.

## Application Frontend

Le projet comprend également une application frontend développée avec React qui permet de visualiser les données extraites. L'application est construite avec Tailwind CSS, offrant une interface utilisateur moderne et responsive.

### Fonctionnalités du Dashboard

Le dashboard (`frontend_basketball_scrapy/src/pages/Dashboard.tsx`) offre plusieurs vues et fonctionnalités pour analyser les performances des joueurs NBA:

1. **Vue d'ensemble des meilleurs joueurs "clutch"** - Affiche les joueurs les plus performants dans les moments décisifs.

2. **Tableau de statistiques** - Présente les statistiques moyennes des joueurs en situation "clutch" (4ème quart-temps et prolongations) avec options de tri et filtrage.

3. **Graphique d'efficacité** - Visualise la relation entre les minutes jouées et les points marqués, avec indication du pourcentage de réussite aux tirs.

4. **Comparaisons**
   - Comparaison avec la ligue: Radar chart montrant les performances d'un joueur par rapport aux moyennes de la ligue
   - Comparaison entre joueurs: Permet de comparer les statistiques de tir de deux joueurs

5. **Shot Chart** - Visualisation des positions de tirs des joueurs sur le terrain de basket avec:
   - Filtres par type de tir (2pts/3pts)
   - Filtres par quart-temps
   - Indications visuelles des tirs réussis et manqués
   - Statistiques de réussite

6. **Analyses avancées**
   - Tendances de tir: Évolution des performances au fil du temps
   - Efficacité par distance: Analyse des tirs selon leur distance du panier
   - Situations clutch: Performances dans les moments critiques (2 dernières minutes du 4ème quart-temps ou prolongation)
