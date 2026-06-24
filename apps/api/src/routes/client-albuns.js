import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import { ALBUM_STATUS } from '../config/constants.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const albuns = await pb.collection('albuns').getFullList({
      filter: `cliente_id = "${req.clienteId}" && status != "${ALBUM_STATUS.PRONTO_EXCLUSAO}"`,
      sort: '-created',
    });
    res.json({ success: true, data: albuns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rota pública ANTES de /:id para não conflitar
router.get('/publico/:slug', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const albuns = await pb.collection('albuns').getFullList({
      filter: `slug = "${req.params.slug}" && status = "${ALBUM_STATUS.ATIVO}"`,
    });
    if (albuns.length === 0) return res.status(404).json({ success: false, message: 'Álbum não encontrado ou expirado' });
    const album = albuns[0];
    if (album.senha_acesso) {
      const { senha } = req.query;
      if (!senha || senha !== album.senha_acesso) {
        return res.json({ success: true, data: { id: album.id, titulo: album.titulo, requer_senha: true } });
      }
    }
    const fotos = await pb.collection('fotos').getFullList({ filter: `album_id = "${album.id}"`, sort: 'ordem' });
    res.json({ success: true, data: { ...album, fotos } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const album = await pb.collection('albuns').getOne(req.params.id);
    if (album.cliente_id !== req.clienteId) return res.status(403).json({ success: false, message: 'Acesso negado' });
    if (album.status === ALBUM_STATUS.EXPIRADO && !album.protegido) return res.status(410).json({ success: false, message: 'Álbum expirado' });
    const fotos = await pb.collection('fotos').getFullList({ filter: `album_id = "${album.id}"`, sort: 'ordem' });
    res.json({ success: true, data: { ...album, fotos } });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Álbum não encontrado' });
  }
});

export default router;
