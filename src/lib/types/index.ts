import { PublicKey } from '@solana/web3.js';

// Firebase Types (from FIREBASE.md)
export interface Merchant {
  id: string;
  name: string;
  address: string;
  category: string;
  latitude: number;
  longitude: number;
  // Geographic optimization fields
  geopoint: {
    latitude: number;
    longitude: number;
  };
  geohash: string; // For efficient geographic queries
  city: string; // For city-based filtering
  walletAddress: string;
  acceptedTokens: string[];
  rating?: number;
  description?: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  contactEmail?: string;
  contactPhone?: string;
  googleMapsLink?: string; // Google Maps business link for fetching reviews and details
}

export interface User {
  id: string;
  walletAddress: string;
  totalSpent: number;
  totalRewards: number;
  paymentCount: number;
  joinedAt: string;
  lastActiveAt: string;
  achievements: string[];
  nftBadges: string[];
}

export interface Transaction {
  id: string;
  merchantId: string;
  merchantName: string;
  userId: string;
  usdAmount: number;
  tokenAmount: number;
  token: 'SOL' | 'USDC';
  transactionId: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  rewardAmount?: number;
}

export interface Reward {
  id: string;
  userId: string;
  transactionId: string;
  amount: number;
  token: 'SOL' | 'USDC';
  timestamp: string;
  type: 'cashback' | 'achievement' | 'bonus';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  rewardAmount: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Wallet Types
export interface WalletBalance {
  sol: number;
  solUSD: number;
  usdc: number;
  usdcUSD: number;
  loading: boolean;
  error: string | null;
}

// Location Types
export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationError {
  code: number;
  message: string;
}

// Payment Types
export interface PaymentRequest {
  recipient: PublicKey;
  amount: number;
  token: 'SOL' | 'USDC';
  reference?: PublicKey;
  label?: string;
  message?: string;
  memo?: string;
}

export interface PaymentResult {
  signature: string;
  confirmed: boolean;
  error?: string;
}

// Navigation Types
export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  Dashboard: { openSearch?: boolean } | undefined;
  Map: undefined;
  Options: undefined;
  Payment: {
    merchantId: string;
    merchantName: string;
  };
  PaymentSuccess: {
    merchantId: string;
    merchantName: string;
    usdAmount: number;
    tokenAmount: number;
    token: "SOL" | "USDC";
    transactionId: string;
    timestamp: string;
    rewardAmount?: number;
  };
  MerchantRegistration: undefined;
  UserProfile: undefined;
};

// Geographic Query Types
export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeographicBounds {
  northeast: LocationCoords;
  southwest: LocationCoords;
}

export interface MerchantQueryOptions {
  location?: LocationCoords;
  radius?: number; // in meters
  bounds?: GeographicBounds;
  category?: string;
  city?: string;
  limit?: number;
  lastDocument?: any; // For pagination
}

export interface CachedMerchantData {
  merchants: Merchant[];
  lastUpdated: string;
  location: LocationCoords;
  radius: number;
} 