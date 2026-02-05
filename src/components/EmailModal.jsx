import React, { memo } from 'react';
import { Mail, X, Download, Send } from 'lucide-react';
import { sanitizeInput } from '../utils/securityUtils';

const EmailModal = memo(({
  show,
  onClose,
  emailRecipient,
  setEmailRecipient,
  emailSubject,
  setEmailSubject,
  onDownloadPDF,
  hasDownloadedPDF,
  onSendEmail
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Envoyer par Email
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Step 1: Download */}
          <div className={`p-4 rounded-xl border-2 transition-all ${hasDownloadedPDF ? 'border-green-100 bg-green-50/30 dark:border-green-900/30 dark:bg-green-900/10' : 'border-blue-100 bg-blue-50/30 dark:border-blue-900/30'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${hasDownloadedPDF ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                {hasDownloadedPDF ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-white mb-1">Télécharger le PDF</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Téléchargez d'abord le rapport pour pouvoir l'attacher à votre mail.
                </p>
                <button
                  onClick={onDownloadPDF}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${hasDownloadedPDF
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95'
                    }`}
                >
                  <Download className="w-4 h-4" />
                  {hasDownloadedPDF ? 'PDF Téléchargé' : 'Télécharger le PDF'}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Prepare Email */}
          <div className={`p-4 rounded-xl border-2 transition-all ${hasDownloadedPDF ? 'border-purple-100 bg-purple-50/30 dark:border-purple-900/30 dark:bg-purple-900/10' : 'border-gray-100 bg-gray-50/30 opacity-50'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${hasDownloadedPDF ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                2
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="font-bold text-gray-800 dark:text-white">Préparer l'envoi</h3>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinataire</label>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="exemple@email.com"
                    disabled={!hasDownloadedPDF}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Objet</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    disabled={!hasDownloadedPDF}
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={onSendEmail}
                    disabled={!hasDownloadedPDF}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg font-bold transition-all shadow-lg active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                    Ouvrir mon Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default EmailModal;
