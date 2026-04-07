(function () {
    // Calendar: click day -> expand panel below grid
    var dataEl = document.getElementById('calendar-data');
    var panel = document.getElementById('day-expand-panel');
    var titleEl = document.getElementById('day-expand-title');
    var listEl = document.getElementById('day-expand-list');
    var closeBtn = document.getElementById('day-expand-close');

    if (dataEl && panel) {
        var postsByDate = JSON.parse(dataEl.textContent || '{}');

        document.querySelectorAll('[data-day-key]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.getAttribute('data-day-key');
                var items = postsByDate[key] || [];

                titleEl.textContent = new Date(key + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });

                if (items.length === 0) {
                    listEl.innerHTML = '<div class="text-sm text-gray-400">Aucun post ce jour</div>';
                } else {
                    var badgeMap = {
                        draft: 'bg-gray-100 text-gray-700',
                        scheduled: 'bg-blue-100 text-blue-700',
                        published: 'bg-green-100 text-green-700'
                    };
                    listEl.innerHTML = items.map(function (p) {
                        var badge = badgeMap[p.status] || 'bg-gray-100 text-gray-500';
                        var hook = (p.hook || 'Sans titre').replace(/[<>&"]/g, function (c) {
                            return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
                        });
                        return '<div class="border border-gray-100 rounded-lg p-3 flex items-center justify-between">' +
                            '<div class="text-sm text-secondary">' + hook + '</div>' +
                            '<span class="px-2 py-0.5 rounded text-xs font-medium ' + badge + '">' + p.status + '</span>' +
                            '</div>';
                    }).join('');
                }

                panel.classList.remove('hidden');
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                panel.classList.add('hidden');
            });
        }
    }

    // Comments accordion: toggle open/close per post group
    document.querySelectorAll('[data-accordion]').forEach(function (header) {
        header.addEventListener('click', function () {
            var id = header.getAttribute('data-accordion');
            var body = document.getElementById('accordion-body-' + id);
            var icon = header.querySelector('[data-accordion-icon]');
            if (!body) return;
            var isHidden = body.classList.toggle('hidden');
            if (icon) icon.textContent = isHidden ? '\u25b8' : '\u25be';
        });
    });
})();
