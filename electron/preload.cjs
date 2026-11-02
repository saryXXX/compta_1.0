/**
 * Preload Script for Finance Tunisie Desktop Application.
 * Exposes desktop environment information securely to the React frontend.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
  legalStandard: 'Loi 96-112 & NCT (Tunisie)',
});

