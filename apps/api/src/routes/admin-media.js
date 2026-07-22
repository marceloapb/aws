// ══════════════════════════════════════════════════════════════
// ROUTES/ADMIN-MEDIA.JS — Rotas administrativas de mídia
// ══════════════════════════════════════════════════════════════

const { Router } = require('express');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');
const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { generateUploadUrl } = require('../services/mediaUploadService');
const { createMediaRecord, listMedia, deleteMedia, getMediaById, updateOrdem } = require('../services/mediaService');
const { getBatchUrls } = require('../services/mediaUrlService');
const { getStorageMetrics, getAllStorageMetrics } = require('../services/mediaMetricsService');

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

// POST /upload-url — Gera presigned URL para upload
router.post('/upload-url', async (req, res) => {
  try {
    const { contexto, entidade_id, filename, content_type, size_bytes } = req.body;

    if (!contexto || !entidade_id || !filename || !content_type || !size_bytes) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: contexto, entidade_id, filename, content_type, size_bytes' });
    }

    const tenant_id = req.tenantId || TENANT;
    const result = await generateUploadUrl({ tenant_id, contexto, entidade_id, filename, content_type, size_bytes });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /confirm — Confirma upload e cria registro no DynamoDB
router.post('/confirm', async (req, res) => {
  try {
    const { media_id, contexto, entidade_id, key, content_type, size_bytes } = req.body;

    if (!media_id || !contexto || !entidade_id || !key) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: media_id, contexto, entidade_id, key' });
    }

    const tenant_id = req.tenantId || TENANT;

    const record = await createMediaRecord({
      media_id,
      contexto,
      entidade_id,
      key,
      bucket: key.startsWith(tenant_id) ? (process.env.MEDIA_PUBLIC_BUCKET || process.env.S3_BUCKET_NAME) : process.env.S3_BUCKET_NAME,
      content_type,
      size_bytes: size_bytes || 0,
      status: 'processing',
      tenant_id,
    });

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /metrics — Métricas de armazenamento (ANTES das rotas parametrizadas)
router.get('/metrics', async (req, res) => {
  try {
    const { contexto } = req.query;

    // Se não passar contexto, retorna métricas agregadas de todos os contextos
    if (!contexto) {
      const metrics = await getAllStorageMetrics();
      return res.json({ success: true, data: metrics });
    }

    const metrics = await getStorageMetrics(contexto);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /:contexto/:entidade_id — Lista mídias de uma entidade
router.get('/:contexto/:entidade_id', async (req, res) => {
  try {
    const { contexto, entidade_id } = req.params;
    const items = await listMedia(contexto, entidade_id);

    // Adicionar URLs
    const itemsWithUrls = await getBatchUrls(items, 'web');

    res.json({ success: true, data: itemsWithUrls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /:media_id — Soft-delete de mídia
router.delete('/:media_id', async (req, res) => {
  try {
    const { media_id } = req.params;
    const { contexto, entidade_id } = req.body;

    if (!contexto || !entidade_id) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios no body: contexto, entidade_id' });
    }

    const result = await deleteMedia(media_id, contexto, entidade_id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Mídia não encontrada' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /reorder — Reordena mídias
router.patch('/reorder', async (req, res) => {
  try {
    const { contexto, entidade_id, items } = req.body;

    if (!contexto || !entidade_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: contexto, entidade_id, items (array)' });
    }

    const results = await Promise.all(
      items.map(({ media_id, ordem }) => updateOrdem(media_id, contexto, entidade_id, ordem))
    );

    res.json({ success: true, data: { updated: results.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /invalidate — Cria invalidação no CloudFront
router.post('/invalidate', async (req, res) => {
  try {
    const { paths } = req.body;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ success: false, message: 'Campo obrigatório: paths (array de strings)' });
    }

    const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
    if (!distributionId) {
      return res.status(400).json({ success: false, message: 'CLOUDFRONT_DISTRIBUTION_ID não configurado' });
    }

    const cf = new CloudFrontClient({});
    const result = await cf.send(new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `media-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    }));

    res.json({
      success: true,
      data: {
        invalidation_id: result.Invalidation?.Id,
        status: result.Invalidation?.Status,
        paths,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /reprocess-dlq — Reenvia mensagens da DLQ para a fila principal
router.post('/reprocess-dlq', async (req, res) => {
  try {
    const dlqUrl = process.env.MEDIA_DLQ_URL;
    const mainQueueUrl = process.env.MEDIA_QUEUE_URL;

    if (!dlqUrl || !mainQueueUrl) {
      return res.status(400).json({ success: false, message: 'MEDIA_DLQ_URL e MEDIA_QUEUE_URL não configurados' });
    }

    const sqs = new SQSClient({});
    let reprocessed = 0;

    // Receber mensagens da DLQ (máximo 10 por vez)
    const receiveResult = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: dlqUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
    }));

    const messages = receiveResult.Messages || [];

    for (const msg of messages) {
      // Enviar para fila principal
      await sqs.send(new SendMessageCommand({
        QueueUrl: mainQueueUrl,
        MessageBody: msg.Body,
        MessageAttributes: msg.MessageAttributes,
      }));

      // Deletar da DLQ
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: dlqUrl,
        ReceiptHandle: msg.ReceiptHandle,
      }));

      reprocessed++;
    }

    res.json({ success: true, data: { reprocessed, total_in_batch: messages.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
