// Stats route — STAT-02 + STAT-03: weekly KPI rates + acquisition funnel
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');

router.get('/stats', isAuthenticated, async function(req, res, next) {
    try {
        const { rows: metricsRows } = await query(
            'SELECT * FROM metrics_weekly ORDER BY week DESC LIMIT 4'
        );
        const latestWeek = metricsRows[0] || null;
        const previousWeeks = metricsRows.slice(1);

        // KPI rates (null when denominator is 0 — shown as "—" in view)
        const kpis = {
            engagementRate:      null,
            infoDmRate:          null,
            dmCalendlyRate:      null,
            calendlyPatientRate: null
        };
        let funnelData = [];

        if (latestWeek) {
            // Engagement rate: (likes + comments + shares) / reach * 100
            kpis.engagementRate = latestWeek.engagement_rate
                ? parseFloat(latestWeek.engagement_rate)
                : (latestWeek.total_reach > 0
                    ? Math.round(((latestWeek.total_likes + latestWeek.total_comments + latestWeek.total_shares) / latestWeek.total_reach) * 10000) / 100
                    : 0);

            // Conversion rates through funnel steps
            kpis.infoDmRate = latestWeek.info_comments > 0
                ? Math.round((latestWeek.dm_opened / latestWeek.info_comments) * 100) : null;
            kpis.dmCalendlyRate = latestWeek.dm_opened > 0
                ? Math.round((latestWeek.calendly_booked / latestWeek.dm_opened) * 100) : null;
            kpis.calendlyPatientRate = latestWeek.calendly_booked > 0
                ? Math.round((latestWeek.patients_converted / latestWeek.calendly_booked) * 100) : null;

            // Funnel bars — proportional to max value
            funnelData = [
                { label: 'Portée',             value: latestWeek.total_reach       || 0, color: 'bg-blue-500'   },
                { label: 'Commentaires',        value: latestWeek.total_comments    || 0, color: 'bg-indigo-500' },
                { label: 'Commentaires INFO',   value: latestWeek.info_comments     || 0, color: 'bg-purple-500' },
                { label: 'DM ouverts',          value: latestWeek.dm_opened         || 0, color: 'bg-pink-500'   },
                { label: 'RDV Calendly',        value: latestWeek.calendly_booked   || 0, color: 'bg-amber-500'  },
                { label: 'Patients convertis',  value: latestWeek.patients_converted|| 0, color: 'bg-green-500'  }
            ];
            const maxVal = Math.max.apply(null, funnelData.map(function(f) { return f.value; }));
            funnelData.forEach(function(f) {
                f.pct = maxVal > 0 ? Math.round((f.value / maxVal) * 100) : 0;
            });
        }

        res.render('stats', {
            currentPath: '/stats',
            latestWeek: latestWeek,
            previousWeeks: previousWeeks,
            kpis: kpis,
            funnelData: funnelData
        });
    } catch (err) { next(err); }
});

module.exports = router;
