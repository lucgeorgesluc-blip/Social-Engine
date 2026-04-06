// Mobile sidebar hamburger toggle
document.addEventListener('DOMContentLoaded', function() {
    var toggle = document.getElementById('menu-toggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');

    if (toggle && sidebar && overlay) {
        toggle.addEventListener('click', function() {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        });
        overlay.addEventListener('click', function() {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }
});
