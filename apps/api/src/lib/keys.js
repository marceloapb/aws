const TENANT = (id = '1') => `TENANT#${id}`;
const PHOTOGRAPHER = (id) => `PHOTOGRAPHER#${id}`;
const CONFIG = () => 'CONFIG';
const CLIENTE = (id) => `CLIENTE#${id}`;
const ITEM = (id) => `ITEM#${id}`;
const PACOTE = (id) => `PACOTE#${id}`;
const CAT = (id) => `CAT#${id}`;
const ORC = (id) => `ORC#${id}`;
const ORC_OPT = (orcId, n) => `ORC#${orcId}#OPT#${n}`;
const ORC_OPT_ITEM = (orcId, n, m) => `ORC#${orcId}#OPT#${n}#ITEM#${m}`;
const AGENDA = (data, id) => `AGENDA#${data}#${id}`;
const CONTRATO = (id) => `CONTRATO#${id}`;
const MODELO_CONTRATO = (id) => `MODELO_CONTRATO#${id}`;
const COBRANCA = (orcId, num) => `COBRANCA#${orcId}#${num}`;
const ALBUM = (id) => `ALBUM#${id}`;
const GALERIA = (albumId, ordem) => `GALERIA#${albumId}#${ordem}`;
const FOTO = (galeriaId, ordem) => `FOTO#${galeriaId}#${ordem}`;
const FEEDBACK = (id) => `FEEDBACK#${id}`;
const REGUA = (id) => `REGUA#${id}`;
const DISPARO = (reguaId, seq) => `DISPARO#${reguaId}#${seq}`;
const WEBHOOK = (id) => `WEBHOOK#${id}`;
const DESPESA = (id) => `DESPESA#${id}`;
const NOTIF = (id) => `NOTIF#${id}`;
const SYNCLOG = (timestamp, id) => `SYNCLOG#${timestamp}#${id}`;
const EQUIP = (id) => `EQUIP#${id}`;
const CHECKLIST = (id) => `CHECKLIST#${id}`;
const CHECKLIST_EVT = (orcId) => `CHECKLIST_EVT#${orcId}`;
const NF = (id) => `NF#${id}`;
const ADITIVO = (contratoId, seq) => `ADITIVO#${contratoId}#${seq}`;
const IDEMPOTENCY = (key) => `IDEMPOTENCY#${key}`;
const IGPOST = (id) => `IGPOST#${id}`;
const WAMSG = (timestamp, msgId) => `WAMSG#${timestamp}#${msgId}`;
const CATALOGO = (id) => `CATALOGO#${id}`;
const PORTFOLIO = (id) => `PORTFOLIO#${id}`;

module.exports = {
  TENANT, PHOTOGRAPHER, CONFIG, CLIENTE, ITEM, PACOTE, CAT, ORC, ORC_OPT, ORC_OPT_ITEM,
  AGENDA, CONTRATO, MODELO_CONTRATO, COBRANCA, ALBUM, GALERIA, FOTO,
  FEEDBACK, REGUA, DISPARO, WEBHOOK, DESPESA, NOTIF, SYNCLOG,
  EQUIP, CHECKLIST, CHECKLIST_EVT, NF, ADITIVO, IDEMPOTENCY, IGPOST, WAMSG,
  CATALOGO, PORTFOLIO,
};
