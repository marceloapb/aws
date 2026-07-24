import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '';

/**
 * SIG-01: Verificação pública de autenticidade de assinatura
 * Acessado via QR Code do selo visual
 */
export default function VerificarAssinatura() {
  const { codigo } = useParams();
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function verificar() {
      try {
        const res = await fetch(`${API}/public/assinatura/verificar/${codigo}`);
        const data = await res.json();
        if (data.success) {
          setResultado(data.data);
        } else {
          setErro(data.message || 'Código não encontrado.');
        }
      } catch {
        setErro('Erro ao verificar. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    if (codigo) verificar();
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-600"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#x274C;</div>
          <h1 className="text-xl font-bold text-red-700 mb-2">Verificação Falhou</h1>
          <p className="text-gray-600">{erro}</p>
          <p className="mt-4 text-sm text-gray-500">Código: {codigo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">&#x2705;</div>
          <h1 className="text-xl font-bold text-green-700">Assinatura Verificada</h1>
          <p className="text-sm text-gray-500 mt-1">Documento autêntico e íntegro</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Signatário</span>
            <span className="font-medium text-gray-800">{resultado.signatario}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">CPF</span>
            <span className="font-mono text-gray-800">{resultado.cpf_parcial}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Data de Assinatura</span>
            <span className="font-medium text-gray-800">
              {resultado.data_aceite ? new Date(resultado.data_aceite).toLocaleString('pt-BR') : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Status</span>
            <span className="font-medium text-green-700 capitalize">{resultado.status_contrato}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Método</span>
            <span className="text-xs text-gray-600">{resultado.metodo}</span>
          </div>
        </div>

        {resultado.hash_documento && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1 font-medium">Hash SHA-256:</p>
            <p className="text-xs font-mono text-gray-600 break-all">
              {resultado.hash_documento}
            </p>
          </div>
        )}

        <div className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-800">
            Este documento foi assinado eletronicamente com validade jurídica conforme
            Lei 14.063/2020 e MP 2.200-2/2001.
          </p>
        </div>
      </div>
    </div>
  );
}
