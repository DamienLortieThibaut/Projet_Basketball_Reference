#!/usr/bin/env python
import json
import os
import subprocess
import sys
import time
import random
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

# Obtenir le chemin du script et du répertoire de travail
script_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(script_dir, 'team_colors.json')

# Définir la saison à scraper (par défaut la saison actuelle)
current_year = datetime.now().year
if datetime.now().month >= 10:  # La saison NBA commence en octobre
    default_season = current_year + 1
else:
    default_season = current_year

# Vérifier si l'utilisateur a demandé de l'aide
if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h', 'help']:
    print(f"""
Extraction des données de tir pour toutes les équipes NBA

Usage: python {os.path.basename(__file__)} [saison] [options]

Arguments:
  saison           Année de la saison (ex: 2024 pour la saison 2023-2024)
                   Par défaut: {default_season} (saison {default_season-1}-{default_season})

Options:
  --sequential     Exécution séquentielle (une équipe à la fois)
  --parallel=N     Exécution parallèle avec N workers (max 3, défaut: 1)
  --help, -h       Affiche ce message d'aide

Exemples:
  python {os.path.basename(__file__)}                  # Utilise la saison actuelle ({default_season-1}-{default_season})
  python {os.path.basename(__file__)} 2024             # Saison 2023-2024
  python {os.path.basename(__file__)} 2023 --sequential # Saison 2022-2023, mode séquentiel
  python {os.path.basename(__file__)} --parallel=2     # Saison actuelle, 2 équipes en parallèle

Le script va:
- Extraire les données de tir pour les 30 équipes NBA
- Créer un dossier team_shots_XXXX (où XXXX est la saison)
- Générer un fichier JSON et un fichier CSV pour chaque équipe
- Créer un fichier JSON combiné avec toutes les données
    """)
    sys.exit(0)

# Traiter les arguments
parallel = 1  # Défaut: 1 worker (mode "parallèle" mais avec un seul processus)
season = default_season

for arg in sys.argv[1:]:
    if arg == '--sequential':
        parallel = 0
    elif arg.startswith('--parallel='):
        try:
            parallel = int(arg.split('=')[1])
            parallel = min(3, max(1, parallel))  # Limiter entre 1 et 3
        except ValueError:
            print(f"⚠️ Valeur invalide pour --parallel. Utilisation de la valeur par défaut: 1")
            parallel = 1
    elif arg.startswith('-'):
        # Ignorer les autres options
        pass
    else:
        # Considérer comme la saison
        try:
            season = int(arg)
        except ValueError:
            print(f"⚠️ Saison invalide: {arg}. Utilisation de la valeur par défaut: {default_season}")
            season = default_season

# Charger les informations des équipes
try:
    with open(json_path, 'r') as f:
        teams = json.load(f)
except FileNotFoundError:
    print(f"❌ Erreur: Le fichier {json_path} n'a pas été trouvé.")
    print(f"   Répertoire de travail actuel: {os.getcwd()}")
    print(f"   Contenu du répertoire: {os.listdir('.')}")
    sys.exit(1)

# Créer le répertoire de sortie s'il n'existe pas
output_dir = os.path.join(script_dir, f"team_shots_{season}")
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Fonction pour scraper une équipe
def scrape_team(team_code):
    team_name = teams[team_code]['name']
    output_file = os.path.join(output_dir, f"{team_code.lower()}_shots_{season}.json")
    csv_file = os.path.join(output_dir, f"{team_code.lower()}_shots_{season}.csv")
    
    # Ajouter un délai aléatoire pour éviter les requêtes simultanées
    time.sleep(random.uniform(1, 3))
    
    print(f"🏀 Extraction des données pour {team_name} (saison {season-1}-{season})...")
    
    # Exécuter le spider Scrapy pour cette équipe avec format JSON
    command = f"scrapy crawl team_shooting -a team_code={team_code} -a season={season} -o \"{output_file}:json\""
    
    try:
        result = subprocess.run(command, shell=True, check=False, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Erreur lors de l'extraction des données pour {team_name}.")
            print(f"   Code d'erreur: {result.returncode}")
            if result.stderr:
                error_log = os.path.join(output_dir, f"{team_code.lower()}_error.log")
                with open(error_log, 'w') as f:
                    f.write(result.stderr)
                print(f"   Détails de l'erreur enregistrés dans {error_log}")
            return False
            
        print(f"Données extraites avec succès pour {team_name} -> {output_file}")
        
        # Générer également un fichier CSV (seulement si JSON a réussi)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            csv_command = f"scrapy crawl team_shooting -a team_code={team_code} -a season={season} -o \"{csv_file}:csv\""
            try:
                subprocess.run(csv_command, shell=True, check=False, capture_output=True)
            except Exception as e:
                print(f"Avertissement: Impossible de créer le fichier CSV pour {team_name}: {e}")
        
        return True
    except Exception as e:
        print(f"Exception lors de l'extraction des données pour {team_name}: {e}")
        return False

if __name__ == "__main__":
    print(f"Début de l'extraction des données de tir pour toutes les équipes NBA - Saison {season-1}-{season}")
    
    # Obtenir la liste des équipes
    team_codes = list(teams.keys())
    
    # Option pour traiter une seule équipe à la fois (pour tests)
    # team_codes = ["LAL", "BOS"]  # Décommenter pour tester avec quelques équipes
    
    success_count = 0
    failed_teams = []
    
    if parallel > 0:
        print(f"Mode parallèle activé avec {parallel} équipe(s) en simultané")
        try:
            with ThreadPoolExecutor(max_workers=parallel) as executor:
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
        json_file = os.path.join(output_dir, f"{team_code.lower()}_shots_{season}.json")
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
        combined_file = os.path.join(output_dir, f"all_teams_shots_{season}.json")
        with open(combined_file, 'w') as f:
            json.dump(combined_data, f, indent=2)
        print(f"Fichier combiné créé: {combined_file}")
    else:
        print("Aucune donnée valide trouvée pour créer le fichier combiné") 