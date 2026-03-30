━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 SEO ENGINE — USAGE GUIDE
Site : magnetiseuse-lacoste-corinne.fr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tape ces commandes dans Claude Code. Ou décris simplement ce que tu veux.

─── ÉCRITURE ─────────────────────────────────────

"Écris le prochain article"
   → Prend la priorité haute dans content-queue.yaml, demande les données SERP, rédige.

"Écris un article sur [sujet]"
   → Vérifie la cannibalisation d'abord, puis rédige.

"Écris le comparatif : [Notre méthode] vs [Concurrent]"
   → Utilise le template comparison-template.md + données competitors.yaml.

"Écris la page pillar pour le cluster [nom]"
   → Page pillar complète pour un topic cluster.

"Approuve l'article [slug]"
   → Marque comme publié dans content-map.yaml après ta relecture.

"L'article [slug] a besoin de modifications : [feedback]"
   → Révise et garde en review.

─── DONNÉES SERP (OBLIGATOIRE avant chaque article) ──

Avant chaque article, Claude Code demande les données SERP réelles de Google.
Il ne fait PAS de recherche web — ça donne des résultats génériques.

Si tu as DataForSEO MCP connecté → il l'utilise automatiquement.

Sinon → Claude Code te demande de chercher sur Google et de copier :
   1. Top 3-5 titres + URLs des résultats
   2. Questions "People Also Ask"
   3. Recherches associées (bas de page Google)
   4. Mots-clés connexes de ton outil SEO (optionnel)

─── NOUVEAUX ARTICLES DE BLOG ───────────────────

Commande standard :
   "Crée l'article de blog [TITRE]. Fichier : blog/[slug].html.
    Applique intégralement INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md"

Checklist après chaque article :
   [ ] blog/[slug].html créé
   [ ] Entrée ajoutée EN TÊTE de SITE_CONFIG.blog dans config.js
   [ ] config.min.js régénéré (npx terser assets/js/config.js -o assets/js/config.min.js -c -m)
   [ ] URL ajoutée dans sitemap.xml
   [ ] content-map.yaml mis à jour
   [ ] Fichiers uploadés SFTP
   [ ] URL inspectée dans Google Search Console

─── NOUVELLES DOCS & FEATURES ───────────────────

"Scanne les nouvelles docs à [chemin]"
"Nouvelle fonctionnalité : [nom] à [chemin doc]"

─── CONCURRENTS ─────────────────────────────────

"Mise à jour concurrent : [nom] propose maintenant [fonctionnalité]"
"[Concurrent] a changé ses tarifs. Mettre à jour."

─── MOTS-CLÉS ────────────────────────────────────

"Importe ces mots-clés : [colle les données]"
"Tire les mots-clés via MCP pour [sujet]"

─── CLUSTERS THÉMATIQUES ────────────────────────

"Montre le statut des topic clusters"
"Crée un cluster pour [sujet]"
"Quelles pages cluster écrire en premier ?"

─── AUDITS ───────────────────────────────────────

"Lance un audit de contenu"
"Vérifie la cannibalisation de mots-clés"
"Qu'est-ce que je devrais écrire en suivant ?"
"Quels articles ont besoin d'être mis à jour ?"

─── MAINTENANCE MOTEUR (Python) ─────────────────

Ces scripts Python permettent de garder le moteur synchronisé avec les vrais fichiers.
Utiliser `python` (pas python3) sur ce poste Windows.

## 1. Audit complet blog/ vs content-map
Vérifie que tous les fichiers HTML sont enregistrés et que rien n'est orphelin.

```python
import re, os

blog_dir = 'E:/Site CL/blog'
actual_files = {f.replace('.html','') for f in os.listdir(blog_dir) if f.endswith('.html')}

map_path = 'E:/Site CL/.seo-engine/data/content-map.yaml'
with open(map_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

slugs_in_map = set()
wc_zeros = []
current_slug = None
for line in lines:
    if line.strip().startswith('- slug:'):
        current_slug = line.strip().split('"')[1]
        slugs_in_map.add(current_slug)
    if current_slug and 'word_count: 0' in line:
        wc_zeros.append(current_slug)

print(f'Blog files on disk:   {len(actual_files)}')
print(f'Slugs in content-map: {len(slugs_in_map)}')
print(f'Missing from map:     {actual_files - slugs_in_map}')
print(f'In map but no file:   {slugs_in_map - actual_files}')
print(f'word_count still 0:   {wc_zeros}')
```

## 2. Recalculer tous les word_counts depuis les vrais fichiers HTML
À lancer après avoir ajouté de nouveaux articles ou si les counts semblent faux.
Compte les mots du texte visible uniquement (scripts et styles exclus).

```python
import re, os

blog_dir = 'E:/Site CL/blog'
files = {f.replace('.html',''):os.path.join(blog_dir,f) for f in os.listdir(blog_dir) if f.endswith('.html')}

def count_words(path):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
    text = re.sub(r'<[^>]+>', ' ', html)
    return len(re.sub(r'\s+', ' ', text).strip().split())

actual_counts = {slug: count_words(path) for slug, path in files.items()}

map_path = 'E:/Site CL/.seo-engine/data/content-map.yaml'
with open(map_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_slug = None
updated = 0
for i, line in enumerate(lines):
    if line.strip().startswith('- slug:'):
        current_slug = line.strip().split('"')[1]
    if current_slug and current_slug in actual_counts and '    word_count:' in line:
        old = line
        lines[i] = re.sub(r'word_count: \d+', f'word_count: {actual_counts[current_slug]}', line)
        if lines[i] != old:
            updated += 1

with open(map_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'{updated} word_counts mis à jour')
```

## Quand lancer ces scripts ?
- Après avoir ajouté un ou plusieurs articles en dehors du moteur
- Si un audit signale des word_count à 0 ou incohérents
- En début de session si le moteur n'a pas été utilisé depuis longtemps

─── CONFIG ───────────────────────────────────────

Modifier .seo-engine/config.yaml pour changer :
- Infos auteur, signaux de confiance, témoignages
- CTA texte/URL, limites de mots
- Ajouter/supprimer des concurrents
- Cadence de publication

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─── PILLAR PAGES EN ATTENTE DE SERP ──────────────

Ces pillar pages sont planifiées mais nécessitent les données SERP :

1. "bien-être naturel Troyes" → tc_bien_etre_troyes (q_004)
2. "meilleures méthodes arrêter fumer comparatif" → tc_comparatifs_tabac

Pillar pages déjà publiées (pages service) :
- tc_magnetiseur_troyes → magnetiseur-troyes.html ✅
- tc_magnetiseur_aube  → magnetiseur-aube.html ✅
- tc_arret_tabac       → guide-complet-arret-tabac-troyes.html ✅
- tc_sevrage_symptomes → arret-tabac-timeline-jour-par-jour.html ✅

Pour débloquer : tape "Écris la page pillar pour le cluster [nom]"
Claude Code demandera les données SERP.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
