// src/web3/reown.ts
import { createAppKit } from '@reown/appkit/react';
//import type { AppKitNetwork } from '@reown/appkit/networks';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
//import { monadTestnet } from '@reown/appkit/networks';
import {
    NETWORK_CONFIG,
    MONAD_ADDRESS,
  } from './config';

// 1) Env vars (CRA usa REACT_APP_*)
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID!;
const appUrl = process.env.REACT_APP_APP_URL || window.location.origin;

// 2) Metadata del dapp (dominio debe coincidir con el origin)
const metadata = {
  name: 'RoomFi',
  description: 'Find your roomie. Web3 + Monad.',
  url: appUrl,
  icons: ['/roomfilogo2.png']
};

// 3) Red Monad (custom) — usa tus valores reales
const monad = {
  id: Number(NETWORK_CONFIG.chainId || 10143),
  caipNetworkId: `eip155:${NETWORK_CONFIG.chainId || 10143}`,
  chainNamespace: 'eip155',
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [NETWORK_CONFIG.rpcUrl!] } },
  //blockExplorers: { default: { name: 'Explorer', url: process.env.REACT_APP_MONAD_EXPLORER || '' } }
} as any;

// 4) Inicializa AppKit (una sola vez)
declare global { interface Window { __APPKIT_INIT__?: boolean } }
if (!window.__APPKIT_INIT__) {
  createAppKit({
    adapters: [new EthersAdapter()],   // <-- Ethers v6
    networks: [monad],
    projectId,
    metadata,
    features: { analytics: true },
    themeMode: 'light'
  });
  window.__APPKIT_INIT__ = true;
}
