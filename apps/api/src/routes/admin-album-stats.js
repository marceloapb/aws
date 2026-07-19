// ══════════════════════════════════════════════════════════════
// ALB-15: Admin Album Statistics Routes
// Mounted at /admin/albuns/:albumId/estatisticas
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { dynamo, TABLE } = require('../config/dynamodb');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

const router = Router({ mergeParams: true });

// GET / — Return album statistics
router.get('/', async (req, res) => {
  try {
    const { albumId } = req.params;

    // Query all events for this album
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ALBUM#${albumId}`,
        ':sk': 'EVENTO#',
      },
    }));

    const eventos = result.Items || [];

    // Aggregate statistics
    let total_visualizacoes = 0;
    let total_downloads = 0;
    let ultimo_acesso = null;
    const fotoViews = {}; // foto_id -> count
    const acessosPorDia = {}; // date string -> count

    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 86400000);

    for (const evento of eventos) {
      const tipo = evento.tipo;
      const timestamp = evento.timestamp || evento.created_at;

      // Count by type
      if (tipo === 'view') {
        total_visualizacoes++;
        // Track foto views
        if (evento.foto_id) {
          fotoViews[evento.foto_id] = (fotoViews[evento.foto_id] || 0) + 1;
        }
      } else if (tipo === 'download') {
        total_downloads++;
      }

      // Track ultimo_acesso
      if (timestamp && (!ultimo_acesso || timestamp > ultimo_acesso)) {
        ultimo_acesso = timestamp;
      }

      // Acessos por dia (last 30 days)
      if (timestamp) {
        const eventDate = new Date(timestamp);
        if (eventDate >= trintaDiasAtras) {
          const dia = timestamp.split('T')[0];
          acessosPorDia[dia] = (acessosPorDia[dia] || 0) + 1;
        }
      }
    }

    // Top 5 fotos mais vistas
    const fotos_mais_vistas = Object.entries(fotoViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([foto_id, views]) => ({ foto_id, views }));

    // Format acessos_por_dia as sorted array
    const acessos_por_dia = Object.entries(acessosPorDia)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, total]) => ({ dia, total }));

    res.json({
      success: true,
      data: {
        total_visualizacoes,
        total_downloads,
        total_eventos: eventos.length,
        fotos_mais_vistas,
        ultimo_acesso,
        acessos_por_dia,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
