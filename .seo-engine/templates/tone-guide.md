# Guide de Ton & Style — magnetiseuse-lacoste-corinne.fr

## Identité de voix

Corinne Lacoste parle à des gens qui **souffrent ou qui cherchent** : quelqu'un qui fume depuis 20 ans, quelqu'un qui dort mal depuis des mois, quelqu'un qui a essayé mille choses. Le ton est :

- **Chaleureux sans être condescendant** — comme un praticien de confiance, pas un commercial
- **Direct et concret** — des faits, des chiffres, des exemples réels
- **Rassurant** — lever les doutes sans les balayer
- **Honnête** — admettre les limites de la méthode (pas de miracle pour tout le monde)
- **Local** — ancré dans Troyes, l'Aube, Saint-Germain

---

## Règles absolues

### E-E-A-T obligatoire
Chaque article DOIT inclure AU MOINS UN de ces éléments :
- Témoignage nommé d'un patient (Paul, Marie L., Thomas B., Sophie D., etc.)
- Métrique chiffrée (85% taux réussite, 35 avis 4.9★, 15+ ans d'expérience)
- Expérience personnelle de Corinne (formation Pascal Bescos, observation en cabinet)
- Lien avis Google : https://search.google.com/local/writereview?placeid=ChIJeVdQE_mZ7kcE7rpheOUlF8c

Si config.trust_signals ne contient pas encore de témoignage pertinent → **demander au client avant de publier**.

### Angle unique obligatoire
Avant d'écrire, définir EN UNE PHRASE l'angle unique. Si la réponse est "plus complet" → ce n'est pas un angle. Trouver ce qui manque dans ce qui existe déjà.

### Mentions concurrents
- Commencer par leurs forces (objectivité = crédibilité)
- Ne jamais dénigrer — comparer les faits
- Données non vérifiées (>90 jours ou confidence: unverified) → ajouter "selon les informations disponibles" ou rediriger vers le site concurrent

### Mots à ne jamais utiliser
- "rTMS" ou "stimulation magnétique transcrânienne"
- "guérir", "guérison", "traitement médical"
- "remboursé par la Sécurité Sociale" (sauf à préciser "non remboursé SS, certaines mutuelles")
- Montants en dur (120€) — utiliser `data-price="tabac"` dans le HTML

### CTA
- Un seul CTA par article, à la fin
- Texte : "Prendre RDV avec Corinne" → lien Calendly
- Soft, jamais pushy : "Si vous voulez en savoir plus…", "Vous pouvez réserver un appel découverte…"

---

## Voix par type d'article

### Comparatif
Ton : **analyste objectif**
- "Commençons par les avantages de [méthode concurrente]..."
- Tableau comparatif quand possible
- Conclusion nuancée, pas de victoire écrasante
- "La méthode qui vous convient dépend de…"

### Tutoriel / How-to
Ton : **professeur patient**
- Utiliser "je" pour l'expérience de Corinne
- Étapes numérotées claires
- "En cabinet, je remarque souvent que…"
- "La plupart de mes patients me disent que…"

### Témoignage
Ton : **narrateur bienveillant**
- Raconter le PARCOURS (avant → séance → après)
- Détails concrets (durée, nombre de séances, résultat en semaines)
- Ne pas exagérer les résultats
- Toujours préciser "les résultats varient d'une personne à l'autre"

### Listicle
Ton : **curateur utile**
- Chaque point doit apporter quelque chose de nouveau
- Pas de remplissage
- Ordre du plus actionnable au plus contextuel

### Symptômes sevrage (how-to informatif)
Ton : **allié compréhensif**
- "C'est normal de ressentir ça — voici pourquoi..."
- Timeline précise (J+1, semaine 2, mois 1)
- Solution concrète pour chaque symptôme
- Transition naturelle vers magnétisme/hypnose comme soutien (pas comme vente)

---

## Structure de base

```
H1 : Titre (mot-clé principal dedans)
Intro : 2-3 phrases — poser le problème + annoncer l'article
[Lead E-E-A-T si témoignage : "Comme me disait Paul, 45 ans, qui fumait depuis 20 ans..."]

H2 : [Sujet principal — mot-clé secondaire]
  Contenu...

H2 : [Développement]
  Contenu...

H2 : FAQ — Questions fréquentes
  [Questions issues des People Also Ask Google]
  Q: ...
  R: ...

H2 : Conclusion
  Résumé + E-E-A-T final
  CTA soft
```

---

## Longueur cible par type

| Type | Min | Cible | Max |
|------|-----|-------|-----|
| Comparatif | 2000 | 2500 | 3000 |
| Listicle | 2500 | 3000 | 4000 |
| Tutoriel | 1500 | 2000 | 2500 |
| How-to | 1200 | 1800 | 2500 |
| Témoignage | 1500 | 2500 | 3000 |
| Pillar | 3000 | 3500 | 5000 |
