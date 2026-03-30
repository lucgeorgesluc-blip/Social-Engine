# Instructions : créer un nouvel article de blog

Ce document explique **comment fonctionne la liste dynamique des articles** et tout ce que l’agent doit faire à chaque nouvel article (config, sitemap, images, prix, avatars, schema).

---

## Comment ça marche

1. **Liste centralisée**  
   Tous les articles sont déclarés dans **`assets/js/config.js`**, section **`SITE_CONFIG.blog`** (tableau d’objets).

2. **Injection automatique**  
   Sur chaque page d’article, le bloc « Articles qui pourraient vous intéresser » contient un **conteneur avec des attributs `data-blog-*`**. Au chargement de la page, le script lit `SITE_CONFIG.blog`, exclut l’article actuel, et **injecte les liens vers les autres articles** (cartes avec titre + description).

3. **Résultat**  
   Dès qu’un nouvel article est **ajouté dans la config**, il apparaît automatiquement dans les blocs « Articles qui pourraient vous intéresser » de tous les autres articles. Aucune modification manuelle des autres fichiers HTML n’est nécessaire.

---

## Checklist complète pour chaque nouvel article

### 1. Fichier HTML et structure

- **Emplacement :** `blog/[slug].html` (ex. `blog/arreter-fumer-hypnose-prevenir-rechutes.html`).
- **Structure :** comme les articles existants (ex. `blog/magnetiseur-arret-tabac-pres-de-moi.html`, `blog/hypnose-arret-tabac-troyes.html`).

### 2. Bloc « Articles qui pourraient vous intéresser »

Utiliser le **conteneur dynamique** (pas de cartes en dur), placé **juste avant le CTA final** :

```html
<!-- Articles qui pourraient vous intéresser (rempli depuis config.js → SITE_CONFIG.blog) -->
<section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-2xl font-serif font-bold text-secondary mb-8">Articles qui pourraient vous intéresser</h2>
        <div class="grid md:grid-cols-3 gap-6" data-blog-list="related" data-blog-current="[SLUG_SANS_HTML]" data-blog-limit="3">
            <!-- Liens injectés automatiquement depuis assets/js/config.js (SITE_CONFIG.blog) -->
        </div>
    </div>
</section>
```

- Remplacer **`[SLUG_SANS_HTML]`** par le slug de **cet** article (sans `.html`).  
  Exemple : `blog/arreter-fumer-hypnose-prevenir-rechutes.html` → `data-blog-current="arreter-fumer-hypnose-prevenir-rechutes"`.

### 3. Config : enregistrer l’article

Dans **`assets/js/config.js`**, section **`SITE_CONFIG.blog`** :

- **Ajouter une nouvelle entrée en première position** du tableau (article le plus récent en haut).
- **Format :**

```javascript
{
    slug: "slug-du-fichier-sans-html",
    title: "Titre tel qu'affiché dans les cartes",
    description: "Courte description pour la carte (une phrase).",
    date: "AAAA-MM-JJ"
}
```

- **Slug :** identique au nom du fichier sans `.html`.

### 4. Régénérer le fichier minifié

Après toute modification de **`config.js`** :

```bash
npx terser assets/js/config.js -o assets/js/config.min.js -c -m
```

(À exécuter depuis la racine du site.)

### 5. Sitemap

Dans **`sitemap.xml`**, ajouter une entrée pour le nouvel article **en tête de la section « Articles blog »** :

```xml
<url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/blog/[slug].html</loc>
    <lastmod>AAAA-MM-JJ</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
</url>
```

Remplacer `[slug]` et `AAAA-MM-JJ` par le slug et la date de publication.

---

## Images de l’article

### Image principale (featured)

- **Source :** prendre la **dernière image** du dossier **`articles-to-do`** (tri par date de modification, fichier `.webp`), ou l’image fournie par l’utilisateur.
- **Destination :** copier vers **`assets/images/blog/[slug].webp`** (ex. `magnetiseur-arret-tabac-pres-de-moi.webp`).
- **Optimisation :** redimensionner en 800×450 (crop centré si besoin), qualité 85, supprimer les métadonnées (ex. ImageMagick : `-resize "800x450^" -gravity center -extent 800x450 -quality 85 -strip`).
- **Dans l’article :**
  - Balise **featured** : `<figure class="mb-8 rounded-2xl overflow-hidden shadow-lg" aria-hidden="true">` avec une `<img>` :
    - `src="../assets/images/blog/[slug].webp"`
    - `alt="…"` descriptif
    - `class="w-full h-auto object-cover"` et `width="800" height="450" loading="lazy"`
  - **Open Graph :** `<meta property="og:image" content="https://www.magnetiseuse-lacoste-corinne.fr/assets/images/blog/[slug].webp">`
  - **Schema Article :** propriété `"image": "https://www.magnetiseuse-lacoste-corinne.fr/assets/images/blog/[slug].webp"` dans le JSON-LD Article.

Si aucune image n’est fournie et que `articles-to-do` est vide, ne pas inventer d’URL ; indiquer qu’une image est à ajouter.

---

## Prix et variables dynamiques

Les tarifs et infos de contact viennent de **`config.js`** (SITE_CONFIG.pricing, SITE_CONFIG.contact). Utiliser les attributs `data-*` pour que le script les injecte.

### Articles arrêt tabac (magnétisme + hypnose)

- **Tarif cabinet (séance combo) :** toujours **`<span data-price="tabac"></span>`** (pas de montant en dur type 115€). La config affiche 120€.
- **Meta description :** si le prix y figure, utiliser **`{{price}}€/séance`** dans le texte et **`data-meta-price="tabac"`** sur la balise `<meta name="description" …>`.
- **Fourchettes marché dans le texte :**
  - Magnétisme seul : **40–70€**
  - Combo magnétisme + hypnose (marché) : **120–275€**
  - Ton cabinet : uniquement via **`data-price="tabac"`** (120€).

### Contact (tous les articles où c’est pertinent)

- **Adresse :** `<span data-contact="adresse"></span>`
- **RDV sous X jours :** `<span data-contact="rdvSousJours"></span> jours`
- **Durée séance :** `<span data-duration="tabac"></span>` (ou autre clé : `stress_anxiete`, `sommeil`, etc.)

### Bloc ROI (coût tabac vs séance)

Si l’article contient un encart du type « coût annuel du tabac / coût séance » :

- Prix paquet utilisé dans le calcul : `<span data-calc="prixPaquetJour"></span>`
- Coût annuel : `<span data-calc="economiesAnnuelle"></span>`
- Coût séance : `<span data-price="tabac"></span>`

(Éviter les montants en dur pour que tout reste cohérent avec la config.)

---

## Avatars (témoignages)

- **Personnages déjà présents sur le site (index / autres pages) :**  
  **Marie L.**, **Thomas B.**, **Sophie D.** → utiliser **uniquement** les avatars existants :
  - `../assets/images/avatar-marie-l-64.webp`
  - `../assets/images/avatar-thomas-b-64.webp`
  - `../assets/images/avatar-sophie-d-64.webp`

- **Nouveau personnage** (ex. Marc, Jean, Valérie, Paul) :  
  Créer un **nouvel avatar** (ex. via Pravatar ou image libre de droit, format homme/femme selon le prénom), le sauvegarder dans **`assets/images/`** sous le nom **`avatar-[prénom]-64.webp`** (ex. `avatar-marc-64.webp`, `avatar-jean-64.webp`). Optimiser (taille, compression). Dans l’article, utiliser :
  - `src="../assets/images/avatar-[prénom]-64.webp"`
  - `alt="[Prénom]"` (ou "Prénom N." si initiale utilisée)
  - `width="48" height="48" loading="lazy" decoding="async" class="w-12 h-12 rounded-full object-cover border-2 border-primary/20"` (ou `border-secondary/20` pour varier).

Ne pas réutiliser un avatar existant pour un **autre** prénom (ex. ne pas mettre Marie pour Valérie).

---

## Schema et SEO

### Schema Article (JSON-LD)

- Inclure `headline`, `description`, `author` (Person, Corinne Lacoste), `datePublished`, `dateModified`.
- Si une image featured existe : ajouter la propriété **`"image"`** avec l’URL absolue de l’image (voir section Images).

### Schema FAQPage (si l’article contient une FAQ)

- Chaque objet **`FAQPage`** doit avoir une propriété **`"name"`** pour éviter l’avertissement Google « Element sans nom ».
- Exemple : `"name": "FAQ – Titre court de l’article"` (ex. "FAQ – Magnétiseur à Troyes", "FAQ – Hypnose Arrêt Tabac à Troyes").

---

## Contenu à ne pas inclure

- **rTMS / TMS / stimulation magnétique transcrânienne :** ne pas mentionner ; si présent dans un brouillon ou un ancien article, supprimer ces passages.

---

## Fichiers concernés

| Fichier | Rôle |
|--------|------|
| `assets/js/config.js` | Liste `SITE_CONFIG.blog` + script d’injection des liens + prix / contact. |
| `assets/js/config.min.js` | Version minifiée (à régénérer après chaque changement de `config.js`). |
| `blog/[slug].html` | Page de l’article : bloc related avec `data-blog-current="[slug]"`, image, prix/contact en `data-*`, avatars, schema. |
| `assets/images/blog/` | Images featured des articles (nom = `[slug].webp`). |
| `assets/images/` | Avatars (avatar-marie-l-64.webp, avatar-thomas-b-64.webp, avatar-sophie-d-64.webp + avatar-[prénom]-64.webp pour nouveaux personnages). |
| `articles-to-do/` | Dossier d’où tirer la dernière image pour un nouvel article (optionnel). |
| `sitemap.xml` | Une entrée par article de blog (nouvelle URL en tête de la section blog). |

---

## Exemple de phrase à donner à l’agent

« Crée l’article de blog [titre / sujet]. Fichier : `blog/[slug].html`. Applique les instructions de `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` : 1) bloc dynamique “Articles qui pourraient vous intéresser” avec `data-blog-list="related"` et `data-blog-current="[slug]"` avant le CTA ; 2) ajouter l’article en première position de `SITE_CONFIG.blog` dans `assets/js/config.js` (slug, title, description, date) ; 3) régénérer `config.min.js` ; 4) ajouter l’URL dans `sitemap.xml` en tête de la section blog. Pour l’image : prendre la dernière image de `articles-to-do`, la copier en `assets/images/blog/[slug].webp`, l’optimiser et mettre à jour og:image + schema. Pour les prix (article tabac) : utiliser `data-price="tabac"`, meta avec `data-meta-price="tabac"` et `{{price}}`, adresse/RDV en `data-contact`. Pour les témoignages : Marie L. / Thomas B. / Sophie D. = avatars existants ; tout nouveau prénom = nouvel avatar `avatar-[prénom]-64.webp`. Schema FAQPage avec `"name"`. Pas de mention rTMS. » 

Ou plus court : « Nouvel article `blog/[slug].html`. Suivre intégralement `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` (config, sitemap, image, prix, avatars, schema). »
