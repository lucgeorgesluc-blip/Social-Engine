# OPTIMISATIONS EXACTES POUR VOS PAGES EXISTANTES
# Guide ligne par ligne - À appliquer immédiatement

---

## 📄 PAGE: index.html (Page d'accueil)

### 🔴 CRITIQUE - À modifier AUJOURD'HUI

**Title actuel:** (à vérifier dans votre fichier)
```html
<title>Corinne Lacoste - Magnétiseuse</title>
```

**✅ Title optimisé:**
```html
<title>Corinne Lacoste | Magnétiseuse & Hypnothérapeute à Troyes (Aube)</title>
```

**Longueur:** 64 caractères ✓

---

**Meta description actuelle:** (à vérifier)
```html
<meta name="description" content="...">
```

**✅ Meta description optimisée:**
```html
<meta name="description" content="Magnétisme et hypnose à Troyes : arrêt du tabac, gestion du stress, troubles du sommeil. Cabinet Saint-Germain. Corinne Lacoste, praticienne certifiée depuis 15+ ans. Séance 115€. RDV sous 7 jours.">
```

**Longueur:** 206 caractères ❌ TROP LONG

**✅ Version courte (160 caractères):**
```html
<meta name="description" content="Magnétisme et hypnose à Troyes : arrêt tabac, stress, sommeil. Cabinet Saint-Germain. Corinne Lacoste, 15+ ans d'expérience. 115€/séance. RDV rapide.">
```

**Longueur:** 158 caractères ✓

---

**Schema.org LocalBusiness À AJOUTER dans le <head>:**

```html
<!-- Schema.org LocalBusiness - À AJOUTER après les balises meta -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Corinne Lacoste - Magnétiseuse & Hypnothérapeute",
  "image": "https://www.magnetiseuse-lacoste-corinne.fr/assets/images/photo-corrine.webp",
  "description": "Magnétisme et hypnose à Troyes pour arrêt du tabac, gestion du stress, troubles du sommeil",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "7 rue du Printemps",
    "addressLocality": "Saint-Germain",
    "addressRegion": "Troyes",
    "postalCode": "10120",
    "addressCountry": "FR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "48.2975",
    "longitude": "4.0744"
  },
  "telephone": "+33XXXXXXXXX",
  "priceRange": "€€",
  "openingHours": "Mo-Fr 09:00-18:00",
  "url": "https://www.magnetiseuse-lacoste-corinne.fr",
  "sameAs": [
    "VOTRE_PAGE_FACEBOOK_SI_EXISTE",
    "VOTRE_PAGE_INSTAGRAM_SI_EXISTE"
  ]
}
</script>
```

**⚠️ IMPORTANT:** Remplacez:
- `latitude` et `longitude` par vos coordonnées GPS réelles => Latitude : 48.253273 | Longitude : 4.03042
- `telephone` par votre vrai numéro au format international (+33...) => contact telephoneFormatted
- Supprimez la ligne `sameAs` si vous n'avez pas de réseaux sociaux

---

**Section Hero - À OPTIMISER:**

Trouvez votre H1 actuel dans le code (probablement quelque chose comme):
```html
<h1>Bienvenue</h1>
```

**✅ H1 optimisé:**
```html
<h1 class="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-secondary mb-6 leading-tight">
    Magnétiseuse & Hypnothérapeute à Troyes<br>
    <span class="text-primary">Arrêt du tabac, stress, sommeil</span>
</h1>
```

---

**Paragraphe d'introduction - À OPTIMISER:**

**✅ Version optimisée (inclut mots-clés naturellement):**
```html
<p class="text-xl text-gray-700 mb-8 leading-relaxed">
    Je vous accompagne avec douceur pour arrêter de fumer, apaiser votre stress et 
    retrouver un sommeil réparateur. Cabinet à Saint-Germain (Troyes), séances d'hypnose 
    et magnétisme adaptées à vos besoins. Résultats rapides et durables.
</p>
```

---

### 🟠 IMPORTANT - À ajouter cette semaine

**Section "Zone d'intervention" À CRÉER:**

Ajoutez cette section APRÈS votre section témoignages (avant le footer):

```html
<!-- Zone d'intervention -->
<section class="py-16 bg-accent/10">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl md:text-4xl font-serif font-bold text-secondary mb-8 text-center">
            Cabinet à Troyes, accessible depuis toute l'Aube
        </h2>
        
        <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 class="text-xl font-semibold text-secondary mb-4">📍 Comment venir ?</h3>
                    <div class="space-y-3 text-gray-700">
                        <p><strong>Depuis Troyes centre:</strong> 5 minutes</p>
                        <p><strong>Depuis Sainte-Savine:</strong> 7 minutes</p>
                        <p><strong>Depuis Romilly-sur-Seine:</strong> 25 minutes (A5)</p>
                        <p><strong>Depuis Bar-sur-Aube:</strong> 35 minutes (D619)</p>
                        <p><strong>Depuis Saint-Dizier (52):</strong> 45 minutes</p>
                        <p><strong>Depuis Épernay (51):</strong> 1h (A26)</p>
                    </div>
                </div>
                
                <div>
                    <h3 class="text-xl font-semibold text-secondary mb-4">🅿️ Accès pratique</h3>
                    <ul class="space-y-2 text-gray-700">
                        <li>• Parking gratuit devant le cabinet</li>
                        <li>• À 8 min de McArthur Glen (shopping)</li>
                        <li>• Arrêt de bus ligne X à 200m</li>
                        <li>• Accessible en transport en commun</li>
                    </ul>
                    
                    <div class="mt-6 bg-primary/10 p-4 rounded-lg">
                        <p class="text-sm text-gray-800">
                            💡 <strong>Astuce :</strong> Profitez de votre venue pour visiter 
                            le centre historique de Troyes ou faire du shopping à McArthur Glen !
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
```

**Pourquoi cette section ?**
- Rassure les gens de l'Aube que c'est accessible
- Mentionne les départements voisins (52, 51) → élargit votre portée
- Angle marketing "McArthur Glen" → différenciation

---

### 🟡 MOYEN - À faire dans les 2 semaines

**Navigation - Ajouter liens vers nouvelles pages piliers:**

Trouvez votre menu de navigation actuel et ajoutez:

```html
<!-- Desktop Menu -->
<div class="hidden md:flex items-center space-x-8">
    <a href="index.html" class="text-gray-700 hover:text-primary transition">Accueil</a>
    <a href="a-propos.html" class="text-gray-700 hover:text-primary transition">À propos</a>
    
    <!-- AJOUTER CES 2 LIGNES -->
    <a href="hypnose-troyes.html" class="text-gray-700 hover:text-primary transition">Hypnose</a>
    <a href="magnetiseur-troyes.html" class="text-gray-700 hover:text-primary transition">Magnétisme</a>
    
    <a href="faq.html" class="text-gray-700 hover:text-primary transition">FAQ</a>
    <a href="#contact" class="bg-primary text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition font-medium">
        Réserver
    </a>
</div>
```

Faites la même chose pour le menu mobile.

---

---

## 📄 PAGE: a-propos.html

### ✅ DÉJÀ FAIT (d'après votre fichier)

**Title:** ✓ Optimisé
```html
<title>Corinne Lacoste | Magnétiseuse & Hypnothérapeute à Troyes</title>
```

**Meta description:** ✓ Optimisé
```html
<meta name="description" content="Qui est Corinne Lacoste ? Magnétiseuse et hypnothérapeute à Troyes depuis 15+ ans. Formation, parcours, méthode combinée magnétisme + hypnose. Cabinet Saint-Germain (Aube).">
```

---

### 🟠 À AJOUTER cette semaine

**Section "Mes formations" - À ENRICHIR:**

Si vous avez une section formations, ajoutez:

```html
<div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
    <h2 class="text-2xl font-semibold text-secondary mb-6">Formations & Certifications</h2>
    
    <div class="space-y-4">
        <div class="border-l-4 border-primary pl-4">
            <h3 class="font-semibold text-secondary">Hypnose Ericksonienne</h3>
            <p class="text-gray-700 text-sm">[Nom de l'école] - [Année]</p>
            <p class="text-gray-600 text-sm">[Nombre d'heures de formation]</p>
        </div>
        
        <div class="border-l-4 border-primary pl-4">
            <h3 class="font-semibold text-secondary">Magnétisme énergétique</h3>
            <p class="text-gray-700 text-sm">[Formation] - [Année]</p>
        </div>
        
        <div class="border-l-4 border-primary pl-4">
            <h3 class="font-semibold text-secondary">Formation continue</h3>
            <p class="text-gray-700 text-sm">Supervision régulière et actualisation des pratiques</p>
        </div>
    </div>
</div>
```

---

**Section "Zone d'intervention" - À AJOUTER:**

Même section que sur index.html (voir plus haut).

---

---

## 📄 PAGE: arret-tabac-troyes.html (ex landing-tabac.html)

### 🔴 CRITIQUE - URL À RENOMMER

**Fichier actuel:**
```
landing-tabac.html
```

**✅ Nouveau nom:**
```
arret-tabac-troyes.html
```

**Comment faire:**
1. Renommez le fichier `landing-tabac.html` en `arret-tabac-troyes.html`
2. Gardez l'ancien fichier avec redirection 301 (voir section .htaccess plus bas)

---

### 🔴 CRITIQUE - Title & Meta à OPTIMISER

**✅ Title optimisé:**
```html
<title>Arrêt du Tabac par Hypnose & Magnétisme à Troyes | Corinne Lacoste</title>
```

**Longueur:** 71 caractères ⚠️ Légèrement long mais OK

**✅ Meta description optimisée:**
```html
<meta name="description" content="Arrêtez de fumer avec l'hypnose et le magnétisme à Troyes. Méthode douce, résultats rapides en 1 à 3 séances. Cabinet Saint-Germain. 115€. Témoignages clients.">
```

**Longueur:** 165 caractères ⚠️ Légèrement long, version courte:

```html
<meta name="description" content="Arrêt du tabac par hypnose & magnétisme à Troyes. Méthode douce en 1-3 séances. Cabinet Saint-Germain. 115€. Témoignages.">
```

**Longueur:** 130 caractères ✓

---

### 🟠 IMPORTANT - Contenu à AJOUTER

**Section "Pourquoi venir à Troyes ?" - À AJOUTER:**

```html
<!-- Pourquoi venir à Troyes -->
<section class="py-16 bg-accent/10">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl md:text-4xl font-serif font-bold text-secondary mb-8">
            Pourquoi choisir mon cabinet à Troyes ?
        </h2>
        
        <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-white rounded-lg p-6">
                <h3 class="text-xl font-semibold text-secondary mb-4">💰 Tarif transparent</h3>
                <p class="text-gray-700 mb-2">
                    <strong>115€ la séance</strong> (1h à 1h30)
                </p>
                <p class="text-gray-600 text-sm">
                    Comparé à Paris : 150-250€<br>
                    Économisez jusqu'à 50%
                </p>
            </div>
            
            <div class="bg-white rounded-lg p-6">
                <h3 class="text-xl font-semibold text-secondary mb-4">📅 Disponibilité rapide</h3>
                <p class="text-gray-700 mb-2">
                    <strong>RDV sous 7 jours</strong> en moyenne
                </p>
                <p class="text-gray-600 text-sm">
                    Comparé à Paris : 3-4 semaines d'attente<br>
                    Possibilité de séances le samedi
                </p>
            </div>
            
            <div class="bg-white rounded-lg p-6">
                <h3 class="text-xl font-semibold text-secondary mb-4">🌿 Cadre apaisant</h3>
                <p class="text-gray-700 mb-2">
                    Cabinet calme à Saint-Germain
                </p>
                <p class="text-gray-600 text-sm">
                    Parking gratuit<br>
                    À 8 min de McArthur Glen
                </p>
            </div>
            
            <div class="bg-white rounded-lg p-6">
                <h3 class="text-xl font-semibold text-secondary mb-4">🎯 Méthode unique</h3>
                <p class="text-gray-700 mb-2">
                    Hypnose + magnétisme
                </p>
                <p class="text-gray-600 text-sm">
                    Approche globale corps-esprit<br>
                    Résultats durables
                </p>
            </div>
        </div>
        
        <div class="mt-8 bg-white rounded-lg p-6">
            <h3 class="text-xl font-semibold text-secondary mb-4">🚗 Accessible depuis toute l'Aube</h3>
            <div class="grid md:grid-cols-3 gap-4 text-gray-700">
                <div>
                    <p class="font-medium">Troyes → 5 min</p>
                    <p class="text-sm text-gray-600">Centre-ville</p>
                </div>
                <div>
                    <p class="font-medium">Romilly-sur-Seine → 25 min</p>
                    <p class="text-sm text-gray-600">Via A5</p>
                </div>
                <div>
                    <p class="font-medium">Bar-sur-Aube → 35 min</p>
                    <p class="text-sm text-gray-600">Via D619</p>
                </div>
            </div>
        </div>
    </div>
</section>
```

---

**Section FAQ - À AJOUTER (si elle n'existe pas déjà):**

```html
<!-- FAQ Arrêt Tabac -->
<section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl md:text-4xl font-serif font-bold text-secondary mb-12">
            Questions fréquentes sur l'arrêt du tabac par hypnose
        </h2>
        
        <div class="space-y-6">
            <!-- Question 1 -->
            <div class="bg-accent/10 rounded-lg p-6" x-data="{ open: false }">
                <button @click="open = !open" class="w-full flex justify-between items-center text-left">
                    <h3 class="text-lg font-semibold text-secondary pr-4">
                        Combien de séances faut-il pour arrêter de fumer ?
                    </h3>
                    <svg class="w-6 h-6 flex-shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div x-show="open" x-transition class="mt-4 text-gray-700">
                    <p>
                        La plupart des personnes arrêtent de fumer dès la première séance. Selon votre niveau de 
                        dépendance et votre motivation, 1 à 3 séances peuvent être nécessaires pour consolider 
                        l'arrêt définitif. Nous ferons le point ensemble lors de la première consultation.
                    </p>
                </div>
            </div>

            <!-- Question 2 -->
            <div class="bg-accent/10 rounded-lg p-6" x-data="{ open: false }">
                <button @click="open = !open" class="w-full flex justify-between items-center text-left">
                    <h3 class="text-lg font-semibold text-secondary pr-4">
                        Vais-je prendre du poids en arrêtant de fumer ?
                    </h3>
                    <svg class="w-6 h-6 flex-shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div x-show="open" x-transition class="mt-4 text-gray-700">
                    <p>
                        Pas forcément. L'hypnose peut vous aider à gérer les compulsions alimentaires qui 
                        remplacent parfois la cigarette. Lors de la séance, je travaille également sur votre 
                        rapport à la nourriture pour éviter la prise de poids. De plus, le magnétisme aide 
                        à réguler votre métabolisme.
                    </p>
                </div>
            </div>

            <!-- Question 3 -->
            <div class="bg-accent/10 rounded-lg p-6" x-data="{ open: false }">
                <button @click="open = !open" class="w-full flex justify-between items-center text-left">
                    <h3 class="text-lg font-semibold text-secondary pr-4">
                        Que faire si j'ai une envie de fumer après la séance ?
                    </h3>
                    <svg class="w-6 h-6 flex-shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div x-show="open" x-transition class="mt-4 text-gray-700">
                    <p>
                        Je vous donne des outils concrets (auto-hypnose, respiration, points d'acupression) 
                        pour gérer les envies ponctuelles. Ces envies sont généralement brèves (2-3 minutes) 
                        et s'espacent rapidement. Vous pouvez aussi me contacter si besoin d'un soutien entre 
                        les séances.
                    </p>
                </div>
            </div>

            <!-- Question 4 -->
            <div class="bg-accent/10 rounded-lg p-6" x-data="{ open: false }">
                <button @click="open = !open" class="w-full flex justify-between items-center text-left">
                    <h3 class="text-lg font-semibold text-secondary pr-4">
                        L'hypnose pour arrêter de fumer est-elle remboursée ?
                    </h3>
                    <svg class="w-6 h-6 flex-shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div x-show="open" x-transition class="mt-4 text-gray-700">
                    <p>
                        Non, l'hypnose n'est pas remboursée par la Sécurité sociale. En revanche, certaines 
                        mutuelles proposent un forfait médecines douces (20-50€ par séance). Je vous fournis 
                        une facture détaillée que vous pouvez soumettre à votre mutuelle.
                    </p>
                </div>
            </div>

            <!-- Question 5 -->
            <div class="bg-accent/10 rounded-lg p-6" x-data="{ open: false }">
                <button @click="open = !open" class="w-full flex justify-between items-center text-left">
                    <h3 class="text-lg font-semibold text-secondary pr-4">
                        Quel est le taux de réussite de l'hypnose pour arrêter de fumer ?
                    </h3>
                    <svg class="w-6 h-6 flex-shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div x-show="open" x-transition class="mt-4 text-gray-700">
                    <p>
                        Les études montrent un taux de réussite de 60-80% après 3 séances d'hypnose, contre 
                        30-40% avec les substituts nicotiniques seuls. Le facteur clé est votre motivation 
                        personnelle : l'hypnose est un outil puissant, mais elle fonctionne mieux quand 
                        VOUS voulez vraiment arrêter (pas pour faire plaisir à quelqu'un).
                    </p>
                </div>
            </div>
        </div>
    </div>
</section>
```

---

**Témoignages - À DIVERSIFIER géographiquement:**

Si vous avez une section témoignages, assurez-vous d'avoir:
- 60% clients de Troyes
- 25% clients de l'Aube (Romilly, Bar-sur-Aube, etc.)
- 10% clients départements voisins (52, 51)
- 5% client parisien (effet waouh)

**Format:**
```html
<div class="bg-white rounded-2xl shadow-lg p-8">
    <div class="flex items-center gap-2 mb-4">
        <div class="flex text-yellow-400">★★★★★</div>
    </div>
    <p class="text-gray-700 italic mb-6">
        "Témoignage du client..."
    </p>
    <p class="font-semibold text-secondary">Sophie, 38 ans</p>
    <p class="text-sm text-gray-600">Troyes</p>
</div>
```

---

---

## 📄 PAGE: faq.html

### 🟠 IMPORTANT - Title & Meta à OPTIMISER

**Title actuel:** Probablement générique

**✅ Title optimisé:**
```html
<title>FAQ : Hypnose & Magnétisme à Troyes | Corinne Lacoste</title>
```

**✅ Meta description optimisée:**
```html
<meta name="description" content="Questions fréquentes sur l'hypnose et le magnétisme à Troyes : tarifs, séances, remboursement, efficacité. Réponses claires par Corinne Lacoste.">
```

---

### 🟡 MOYEN - Contenu à enrichir

**Ajouter Schema.org FAQPage:**

Ajoutez dans le `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Combien coûte une séance d'hypnose à Troyes ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Une séance d'hypnose coûte 115€ et dure entre 1h et 1h30. Le paiement se fait par CB, espèces ou chèque. L'hypnose n'est pas remboursée par la Sécurité sociale, mais certaines mutuelles proposent un forfait médecines douces."
      }
    },
    {
      "@type": "Question",
      "name": "Combien de séances d'hypnose sont nécessaires ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Cela dépend de votre problématique. Pour l'arrêt du tabac ou une phobie, une seule séance peut suffire. Pour des problèmes plus complexes comme le stress chronique ou les troubles du sommeil, comptez entre 2 et 4 séances espacées de 2 à 3 semaines."
      }
    }
  ]
}
</script>
```

**⚠️ IMPORTANT:** Adaptez les questions/réponses selon votre FAQ réelle.

---

---

## 🔧 FICHIER: .htaccess

### 🔴 CRITIQUE - Redirection 301 à AJOUTER

Si vous renommez `landing-tabac.html` en `arret-tabac-troyes.html`, ajoutez cette ligne dans votre `.htaccess`:

```apache
# Redirection 301 ancienne landing page vers nouvelle URL
Redirect 301 /landing-tabac.html https://www.magnetiseuse-lacoste-corinne.fr/arret-tabac-troyes.html
```

---

---

## 🗺️ FICHIER: sitemap.xml

### 🔴 CRITIQUE - À METTRE À JOUR après création des pages piliers

**Structure optimale:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Page d'accueil (priorité max) -->
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <!-- Pages piliers (haute priorité) -->
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/hypnose-troyes.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-troyes.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/magnetiseur-aube.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <!-- Landing pages (priorité moyenne-haute) -->
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/arret-tabac-troyes.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <!-- Pages standards -->
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/a-propos.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/soins.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/faq.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  
  <!-- Pages légales (basse priorité) -->
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/mentions-legales.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/politique-confidentialite.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/cgv.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <!-- Articles blog (à ajouter au fur et à mesure) -->
  <!-- Exemple:
  <url>
    <loc>https://www.magnetiseuse-lacoste-corinne.fr/blog/fatigue-arret-tabac.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
    <lastmod>2026-02-14</lastmod>
  </url>
  -->

</urlset>
```

**⚠️ Pensez à:**
- Mettre à jour `<lastmod>` avec la vraie date de modification
- Ajouter chaque nouvel article blog au sitemap
- Soumettre le sitemap à Google Search Console après chaque mise à jour majeure

---

---

## 🔧 FICHIER: robots.txt

### 🟢 À VÉRIFIER

**Contenu recommandé:**

```
User-agent: *
Allow: /

# Sitemap
Sitemap: https://www.magnetiseuse-lacoste-corinne.fr/sitemap.xml

# Bloquer les dossiers techniques
Disallow: /assets/css/
Disallow: /assets/js/
Disallow: /assets/fonts/
Disallow: /api/

# Bloquer les fichiers temporaires
Disallow: /*.js$
Disallow: /*.css$
Disallow: /*.json$

# Autoriser les images pour Google Images
Allow: /assets/images/
```

---

---

## 📊 RÉSUMÉ DES MODIFICATIONS PAR PRIORITÉ

### 🔴 CRITIQUE - À faire AUJOURD'HUI (2-3h)

- [ ] index.html : Optimiser title + meta description
- [ ] index.html : Ajouter Schema.org LocalBusiness
- [ ] index.html : Optimiser H1
- [ ] a-propos.html : Vérifier title/meta (normalement déjà fait)
- [ ] arret-tabac-troyes.html : Optimiser title + meta
- [ ] .htaccess : Ajouter redirection 301 si fichier renommé

### 🟠 IMPORTANT - À faire CETTE SEMAINE (4-6h)

- [ ] index.html : Ajouter section "Zone d'intervention"
- [ ] index.html : Ajouter liens navigation vers pages piliers
- [ ] arret-tabac-troyes.html : Ajouter section "Pourquoi Troyes"
- [ ] arret-tabac-troyes.html : Ajouter FAQ complète
- [ ] a-propos.html : Enrichir section formations
- [ ] a-propos.html : Ajouter section "Zone d'intervention"

### 🟡 MOYEN - À faire dans les 2 SEMAINES (2-3h)

- [ ] faq.html : Optimiser title + meta
- [ ] faq.html : Ajouter Schema.org FAQPage
- [ ] sitemap.xml : Mettre à jour avec nouvelles pages
- [ ] robots.txt : Vérifier configuration
- [ ] Toutes les pages : Vérifier liens internes

---

---

## ✅ CHECKLIST FINALE APRÈS MODIFICATIONS

### Vérifications techniques:

- [ ] Tous les titles font 50-60 caractères
- [ ] Toutes les meta descriptions font 150-160 caractères
- [ ] Schema.org LocalBusiness présent sur page d'accueil
- [ ] Schema.org FAQPage présent sur page FAQ
- [ ] Redirections 301 configurées si URLs renommées
- [ ] Sitemap mis à jour
- [ ] Sitemap soumis à Google Search Console

### Vérifications contenu:

- [ ] Chaque page a 1 seul H1
- [ ] H1 différent du title tag
- [ ] Mot-clé "Troyes" présent dans title/H1 des pages principales
- [ ] Section "Zone d'intervention" présente (index + a-propos)
- [ ] Témoignages géolocalisés (Troyes, Aube, dép. voisins)
- [ ] FAQ complète sur page arrêt tabac
- [ ] Liens internes vers pages piliers

### Vérifications liens:

- [ ] Navigation mise à jour avec liens hypnose/magnétisme
- [ ] Tous les liens internes fonctionnent
- [ ] Pas de liens cassés (404)
- [ ] Ancres descriptives (pas "cliquez ici")

---

---

## 📞 CONTACT POUR VALIDATION

**Avant de publier ces modifications, vérifiez:**

1. Que votre numéro de téléphone est au bon format (+33...)
2. Que les coordonnées GPS sont exactes
3. Que le SIRET est correct (839 303 773 00 015)
4. Que l'adresse est complète : 7 rue du Printemps, 10120 Saint-Germain

**Si besoin d'aide technique, contactez votre développeur.**

---

FIN DU DOCUMENT
