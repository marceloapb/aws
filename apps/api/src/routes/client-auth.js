import { Router } from 'express';
import { getPocketbaseClient } from '../config/pocketbase.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    const clientes = await pb.collection('clientes').getFullList({ filter: `email = "${email}"` });
    if (clientes.length === 0) return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    const cliente = clientes[0];
    const bcrypt = await import('bcrypt');
    const senhaValida = await bcrypt.compare(senha, cliente.senha_hash);
    if (!senhaValida) return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    const token = jwt.sign({ id: cliente.id, email: cliente.email, tipo: 'cliente' }, env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/registro', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const { nome, email, senha, whatsapp_numero } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    const existentes = await pb.collection('clientes').getFullList({ filter: `email = "${email}"` });
    if (existentes.length > 0) return res.status(409).json({ success: false, message: 'Email já cadastrado' });
    const bcrypt = await import('bcrypt');
    const senhaHash = await bcrypt.hash(senha, 10);
    const cliente = await pb.collection('clientes').create({ nome, email, senha_hash: senhaHash, whatsapp_numero: whatsapp_numero || '', status: 'ativo' });
    res.status(201).json({ success: true, data: { id: cliente.id, nome: cliente.nome } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const pb = await getPocketbaseClient();
    const cliente = await pb.collection('clientes').getOne(req.clienteId);
    const { senha_hash, ...dadosSeguros } = cliente;
    res.json({ success: true, data: dadosSeguros });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cliente não encontrado' });
  }
});

export default router;
