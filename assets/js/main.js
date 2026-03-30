// Main JavaScript for v2 site

// Smooth scroll with offset for fixed nav
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80; // Height of fixed nav
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (nav) { // Vérifier que le nav existe (pas sur landing pages)
        if (window.scrollY > 50) {
            nav.classList.add('shadow-lg');
        } else {
            nav.classList.remove('shadow-lg');
        }
    }
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all sections except the first one (hero)
document.querySelectorAll('section:not(:first-of-type)').forEach(section => {
    observer.observe(section);
});

// Track CTA clicks for analytics
document.querySelectorAll('a[href="#contact"]').forEach(button => {
    button.addEventListener('click', () => {
        // Google Analytics event (if GA is set up)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'cta_click', {
                'event_category': 'engagement',
                'event_label': button.textContent.trim()
            });
        }
        console.log('CTA clicked:', button.textContent.trim());
    });
});

// Phone number click tracking
document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'phone_click', {
                'event_category': 'contact',
                'event_label': 'phone_number'
            });
        }
        console.log('Phone number clicked');
    });
});

// Form submission handler (if you add a form later)
const handleFormSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Send to your backend API
    fetch('/api/contact.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Message envoyé avec succès ! Nous vous recontactons sous 24h.');
            e.target.reset();
        } else {
            alert('Erreur lors de l\'envoi. Veuillez réessayer.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Erreur technique. Merci de nous contacter par téléphone.');
    });
};

// Calendly event tracking
window.addEventListener('message', (e) => {
    if (e.data.event && e.data.event.indexOf('calendly') === 0) {
        if (e.data.event === 'calendly.event_scheduled') {
            // Track successful booking
            if (typeof gtag !== 'undefined') {
                gtag('event', 'booking_completed', {
                    'event_category': 'conversion',
                    'event_label': 'calendly_booking'
                });
            }
            console.log('Booking completed!');
            
            // Optional: Show success message
            alert('Votre rendez-vous est confirmé ! Vous allez recevoir un email de confirmation.');
        }
    }
});

// Cookie consent (RGPD compliance) - Google Consent Mode v2
const initCookieConsent = () => {
    const hasConsent = localStorage.getItem('consentGranted');
    if (!hasConsent) {
        // Show cookie banner
        showConsentBanner();
    }
};

// Afficher la bannière de consentement
const showConsentBanner = () => {
    // Vérifier si la bannière existe déjà
    if (document.getElementById('consent-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.innerHTML = `
        <div style="position: fixed; bottom: 0; left: 0; right: 0; background: #2C5F4F; color: white; padding: 20px; z-index: 10000; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 250px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                        Ce site utilise des cookies pour améliorer votre expérience et analyser le trafic. 
                        <a href="politique-confidentialite.html" style="color: #D4A574; text-decoration: underline;">En savoir plus</a>
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="consent-accept" style="background: #D4A574; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        J'accepte
                    </button>
                    <button id="consent-decline" style="background: transparent; color: white; border: 2px solid white; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        Refuser
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(banner);
    
    // Gérer l'acceptation
    document.getElementById('consent-accept').addEventListener('click', () => {
        grantConsent();
        banner.remove();
    });
    
    // Gérer le refus
    document.getElementById('consent-decline').addEventListener('click', () => {
        declineConsent();
        banner.remove();
    });
};

// Accorder le consentement
const grantConsent = () => {
    localStorage.setItem('consentGranted', 'true');
    
    // Mettre à jour le consentement Google
    if (typeof gtag !== 'undefined') {
        gtag('consent', 'update', {
            'ad_user_data': 'granted',
            'ad_personalization': 'granted',
            'ad_storage': 'granted',
            'analytics_storage': 'granted'
        });
    }
};

// Refuser le consentement
const declineConsent = () => {
    localStorage.setItem('consentGranted', 'false');
    
    // S'assurer que le consentement reste refusé
    if (typeof gtag !== 'undefined') {
        gtag('consent', 'update', {
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'ad_storage': 'denied',
            'analytics_storage': 'denied'
        });
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initCookieConsent();
    
    // Add loading class removal after page load
    document.body.classList.add('loaded');
});

// Performance monitoring
if ('PerformanceObserver' in window) {
    const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            console.log('Performance metric:', entry.name, entry.value);
        }
    });
    perfObserver.observe({ entryTypes: ['measure', 'navigation'] });
}

// Service Worker registration for PWA (future enhancement)
if ('serviceWorker' in navigator) {
    // Will implement when needed for offline support
    console.log('Service Worker support detected');
}

// Utility: Format phone numbers
const formatPhoneNumber = (phone) => {
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
};

// Utility: Scroll to top button (if added later)
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

// Export functions for potential use
window.siteUtils = {
    formatPhoneNumber,
    scrollToTop,
    handleFormSubmit
};