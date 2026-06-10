import type { Account, AuthToken, Organization } from '@aquameet/control-plane';

/**
 * Edge storage for club accounts, organisations and auth tokens (plan v2 §4).
 * Kept out of the `@aquameet/persistence` Database contract — that contract is
 * about competition entities; accounts are an API/identity concern.
 */
export class AuthStore {
  constructor(private readonly db: D1Database) {}

  async createOrganization(org: Organization): Promise<void> {
    await this.db
      .prepare('INSERT INTO organizations (id, data) VALUES (?, ?)')
      .bind(org.id, JSON.stringify(org))
      .run();
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const row = await this.db.prepare('SELECT data FROM organizations WHERE id = ?').bind(id).first<{ data: string }>();
    return row ? (JSON.parse(row.data) as Organization) : undefined;
  }

  async createAccount(account: Account): Promise<void> {
    await this.db
      .prepare('INSERT INTO accounts (id, email, organization_id, data) VALUES (?, ?, ?, ?)')
      .bind(account.id, account.email, account.organizationId, JSON.stringify(account))
      .run();
  }

  async getAccountByEmail(email: string): Promise<Account | undefined> {
    const row = await this.db
      .prepare('SELECT data FROM accounts WHERE email = ?')
      .bind(email.toLowerCase())
      .first<{ data: string }>();
    return row ? (JSON.parse(row.data) as Account) : undefined;
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const row = await this.db.prepare('SELECT data FROM accounts WHERE id = ?').bind(id).first<{ data: string }>();
    return row ? (JSON.parse(row.data) as Account) : undefined;
  }

  async putToken(token: AuthToken): Promise<void> {
    await this.db
      .prepare('INSERT OR REPLACE INTO auth_tokens (token, account_id, expires_at, data) VALUES (?, ?, ?, ?)')
      .bind(token.token, token.accountId, token.expiresAt, JSON.stringify(token))
      .run();
  }

  async getToken(token: string): Promise<AuthToken | undefined> {
    const row = await this.db.prepare('SELECT data FROM auth_tokens WHERE token = ?').bind(token).first<{ data: string }>();
    return row ? (JSON.parse(row.data) as AuthToken) : undefined;
  }

  async deleteToken(token: string): Promise<void> {
    await this.db.prepare('DELETE FROM auth_tokens WHERE token = ?').bind(token).run();
  }
}
