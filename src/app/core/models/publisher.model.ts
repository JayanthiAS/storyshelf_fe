export interface PublisherUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface PublisherOrganization {
  _id: string;
  legalName: string;
  displayName: string;
  slug: string;
  country: string;
  website: string | null;
  logoUrl: string | null;
  status: 'invited' | 'active' | 'suspended';
  primaryContactEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublisherAgreement {
  termsVersion: string;
  termsText: string;
  commercialModel: string;
  acceptedAt: string | null;
  territory: string[];
  revenueShareBps: number | null;
  currency: string | null;
}

export interface PublisherSession {
  user: PublisherUser;
  organization: PublisherOrganization | null;
  membership: { orgRole: string; status: string } | null;
  agreement: PublisherAgreement | null;
  checklist: {
    termsAccepted: boolean;
    profileReady: boolean;
    booksReady: boolean;
  };
}

export interface PublisherInvitePreview {
  email: string;
  displayName: string;
  legalName: string;
  orgRole: 'owner' | 'editor' | 'viewer';
  expiresAt: string;
  termsVersion: string;
  termsText: string;
}

export interface PublisherHouse extends PublisherOrganization {
  agreement: PublisherAgreement | null;
  pendingInvite: { email: string; expiresAt: string; createdAt: string } | null;
}

export interface PublisherAuthor {
  _id: string;
  name: string;
  bio?: string;
}

export interface PublisherBook {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortStory?: string;
  authorId: string | { _id: string; name: string };
  genreIds: Array<string | { _id: string; name: string }>;
  language: string;
  imprint: string;
  isbn?: string | null;
  releaseDate?: string | null;
  coverImageUrl?: string | null;
  fileUrl?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  status: 'draft' | 'published';
  submissionStatus?: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  version: number;
  takedownRequestedAt?: string | null;
  takenDownAt?: string | null;
  organizationId?: string | { _id: string; displayName?: string };
}

export interface CreatePublisherHouseDto {
  legalName: string;
  displayName: string;
  country: string;
  website?: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
}

export interface CreatePublisherHouseResult {
  house: PublisherHouse;
  inviteUrl: string;
  expiresAt: string;
}

export interface PublisherStaffMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgRole: 'owner' | 'editor' | 'viewer';
  status: string;
}

export interface PublisherStaffInvite {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgRole: 'editor' | 'viewer';
  expiresAt: string;
}

export interface PublisherStaffList {
  members: PublisherStaffMember[];
  invites: PublisherStaffInvite[];
}
