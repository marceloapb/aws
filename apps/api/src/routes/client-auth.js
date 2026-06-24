import { Router } from 'express';
import { dynamo, TABLE } from '../config/dynamodb.js';
import { QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const router = Router();
const TENANT = process.env.TENANT_ID || 'default';

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CLIENTE#', ':email': email },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(401).json({ success: false, message: 'Credenciais inválidas' });

    const cliente = result.Items[0];
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
    const { nome, email, senha, whatsapp_numero } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });

    const existentes = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': 'CLIENTE#', ':email': email },
    }));
    if (existentes.Items && existentes.Items.length > 0) return res.status(409).json({ success: false, message: 'Email já cadastrado' });

    const bcrypt = await import('bcrypt');
    const senhaHash = await bcrypt.hash(senha, 10);
    const id = crypto.randomUUID();
    const item = { id, nome, email, senha_hash: senhaHash, whatsapp_numero: whatsapp_numero || '', status: 'ativo', PK: `TENANT#${TENANT}`, SK: `CLIENTE#${id}`, created: new Date().toISOString() };
    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

    res.status(201).json({ success: true, data: { id: item.id, nome: item.nome } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': `TENANT#${TENANT}`, ':sk': `CLIENTE#${req.clienteId}` },
    }));
    if (!result.Items || result.Items.length === 0) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    const { senha_hash, ...dadosSeguros } = result.Items[0];
    res.json({ success: true, data: dadosSeguros });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Cliente não encontrado' });
  }
});

export default router;
