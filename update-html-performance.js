/**
 * Script pour appliquer les améliorations de performance et accessibilité
 * à tous les fichiers HTML du site
 * 
 * Usage: node update-html-performance.js
 */

const fs = require('fs');
const path = require('path');

// Liste des fichiers HTML principaux (pas les backups)
const htmlFiles = [
    'index.html',
    'a-propos.html',
    'soins.html',
    'faq.html',
    'cgv.html',
    'mentions-legales.html',
    'politique-confidentialite.html',
    'landing-tabac.html'
];

function updateHTMLFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Fichier non trouvé: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Déplacer charset en première ligne du head
    if (content.includes('<head>') && !content.match(/<head>\s*<meta charset="UTF-8">/)) {
        content = content.replace(
            /<head>\s*<!-- Google Consent Mode/,
            '<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    \n    <!-- Google Consent Mode'
        );
        // Supprimer le charset en double si présent plus bas
        content = content.replace(/\s*<meta charset="UTF-8">\s*(?=\n\s*<meta name="viewport")/g, '');
        modified = true;
    }

    // 2. Ajouter preconnect pour Calendly
    if (content.includes('fonts.gstatic.com') && !content.includes('calendly.com')) {
        content = content.replace(
            /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/,
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link rel="preconnect" href="https://calendly.com">\n    <link rel="dns-prefetch" href="https://js.stripe.com">\n    <link rel="dns-prefetch" href="https://assets.calendly.com">'
        );
        modified = true;
    }

    // 3. Ajouter aria-label au bouton menu mobile
    if (content.includes('@click="mobileMenuOpen = !mobileMenuOpen"') && !content.includes('aria-label="Ouvrir le menu')) {
        content = content.replace(
            /<button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden p-2">/,
            '<button \n                    @click="mobileMenuOpen = !mobileMenuOpen" \n                    class="md:hidden p-2"\n                    aria-label="Ouvrir le menu de navigation"\n                    :aria-expanded="mobileMenuOpen">\n                    <span class="sr-only">Menu</span>'
        );
        // Ajouter aria-hidden au SVG
        content = content.replace(
            /<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">/,
            '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
        );
        modified = true;
    }

    // 4. Ajouter balise <main>
    if (content.includes('</nav>') && !content.includes('<main>')) {
        content = content.replace(
            /(\s*)<\/nav>\s*\n\s*<!-- (Hero|.*Section)/,
            '$1</nav>\n\n    <main>\n    <!-- $2'
        );
        // Fermer main avant footer
        if (content.includes('<!-- Footer -->')) {
            content = content.replace(
                /(\s*)<\/section>\s*\n\s*<!-- Footer -->/,
                '$1</section>\n    </main>\n\n    <!-- Footer -->'
            );
        }
        modified = true;
    }

    // 5. Différer les scripts
    if (content.includes('config.min.js') && !content.includes('defer')) {
        content = content.replace(
            /<script src="assets\/js\/config\.min\.js"><\/script>/g,
            '<script src="assets/js/config.min.js" defer></script>'
        );
        content = content.replace(
            /<script src="assets\/js\/main\.min\.js"><\/script>/g,
            '<script src="assets/js/main.min.js" defer></script>'
        );
        modified = true;
    }

    // 6. Différer Google Tag Manager (charger après load)
    if (content.includes('GTM-MFK6BL36') && !content.includes('window.addEventListener(\'load\'')) {
        // Remplacer le GTM inline par version différée
        const gtmPattern = /<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/;
        const gtmReplacement = `<!-- Google Tag Manager - Chargé après le contenu principal pour améliorer les performances -->
    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-MFK6BL36');
                
                // Google tag (gtag.js) - chargé après GTM
                var gtagScript = document.createElement('script');
                gtagScript.async = true;
                gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-5KYCNEBXRX';
                document.head.appendChild(gtagScript);
                
                gtagScript.onload = function() {
                    gtag('js', new Date());
                    gtag('config', 'G-5KYCNEBXRX');
                    gtag('config', 'AW-17956035279');
                };
            }, 2000);
        });
    </script>`;
        
        if (content.match(gtmPattern)) {
            content = content.replace(gtmPattern, gtmReplacement);
            // Supprimer aussi le gtag.js inline s'il existe
            content = content.replace(
                /<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config', 'G-5KYCNEBXRX'\);[\s\S]*?<\/script>\s*\n/g,
                ''
            );
            modified = true;
        }
    }

    // 7. Ajouter defer aux scripts à la fin
    if (content.includes('</body>') && !content.includes('GTM-MFK6BL36')) {
        // Si GTM n'a pas été trouvé, ajouter le script différé avant </body>
        const gtmScript = `
    <!-- Google Tag Manager - Chargé après le contenu principal -->
    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-MFK6BL36');
            }, 2000);
        });
    </script>`;
        content = content.replace('</body>', gtmScript + '\n</body>');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Mis à jour: ${filePath}`);
        return true;
    } else {
        console.log(`⏭️  Aucun changement: ${filePath}`);
        return false;
    }
}

// Exécuter les mises à jour
console.log('🚀 Début des mises à jour des fichiers HTML...\n');

let updatedCount = 0;
htmlFiles.forEach(file => {
    if (updateHTMLFile(file)) {
        updatedCount++;
    }
});

console.log(`\n✨ Terminé! ${updatedCount}/${htmlFiles.length} fichiers mis à jour.`);

