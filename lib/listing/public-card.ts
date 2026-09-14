export type PublicListingCard = {
  id: string;
  publicNumber: number;
  status: string;
  statusLabel: string;
  /** Compte à rebours ou précision de cotation. */
  marketDetail: string | null;
  marketTone: "open" | "sealed" | "negotiation" | "sold" | "off";
  zone: string;
  askingPrice: number;
  annualCommissions: number;
  contractCount: number;
  averageAgeMonths: number;
  isPartial: boolean;
  isNationwide: boolean;
  sellerSupportMonths: number;
  daysLeft: number | null;
  carriers: string[];
  riskTypes: string[];
  clientSegments: string[];
  certified: boolean;
  sold: boolean;
  precompte: boolean | null;
  precompteAmount: string | null;
  /** Meilleure offre déposée, et nombre d'offres : la cote de la séance. */
  bestOffer?: number | null;
  offerCount?: number;
};
