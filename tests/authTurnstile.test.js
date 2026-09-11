import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpUser, signInUser } from '../auth.js';

describe('Turnstile Captcha Protection for Authentication', () => {
  let mockSupabaseClient;

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: null },
          error: null
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: { access_token: 'fake-token' } },
          error: null
        })
      }
    };
  });

  describe('signUpUser', () => {
    it('blocks sign-up when captcha token is missing or empty', async () => {
      // Missing token (null)
      const resNull = await signUpUser('test@example.com', 'password123', null, mockSupabaseClient);
      expect(resNull.error).toBeDefined();
      expect(resNull.error.message).toMatch(/Turnstile/i);
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();

      // Undefined token
      const resUndef = await signUpUser('test@example.com', 'password123', undefined, mockSupabaseClient);
      expect(resUndef.error).toBeDefined();
      expect(resUndef.error.message).toMatch(/Turnstile/i);
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();

      // Empty string token
      const resEmpty = await signUpUser('test@example.com', 'password123', '   ', mockSupabaseClient);
      expect(resEmpty.error).toBeDefined();
      expect(resEmpty.error.message).toMatch(/Turnstile/i);
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it('blocks sign-up when email or password is missing', async () => {
      const resNoEmail = await signUpUser('', 'password123', 'valid-turnstile-token', mockSupabaseClient);
      expect(resNoEmail.error).toBeDefined();
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();

      const resNoPass = await signUpUser('test@example.com', '', 'valid-turnstile-token', mockSupabaseClient);
      expect(resNoPass.error).toBeDefined();
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it('allows sign-up and passes captchaToken in options when token is present', async () => {
      const captchaToken = 'valid-turnstile-response-token-123';
      const result = await signUpUser('test@example.com', 'password123', captchaToken, mockSupabaseClient);

      expect(result.error).toBeNull();
      expect(result.data.user.email).toBe('test@example.com');
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          captchaToken: 'valid-turnstile-response-token-123'
        }
      });
    });
  });

  describe('signInUser', () => {
    it('blocks sign-in when captcha token is missing or empty', async () => {
      // Null token
      const resNull = await signInUser('test@example.com', 'password123', null, mockSupabaseClient);
      expect(resNull.error).toBeDefined();
      expect(resNull.error.message).toMatch(/Turnstile/i);
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();

      // Undefined token
      const resUndef = await signInUser('test@example.com', 'password123', undefined, mockSupabaseClient);
      expect(resUndef.error).toBeDefined();
      expect(resUndef.error.message).toMatch(/Turnstile/i);
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();

      // Empty string token
      const resEmpty = await signInUser('test@example.com', 'password123', '', mockSupabaseClient);
      expect(resEmpty.error).toBeDefined();
      expect(resEmpty.error.message).toMatch(/Turnstile/i);
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('blocks sign-in when email or password is missing', async () => {
      const resNoEmail = await signInUser('', 'password123', 'valid-turnstile-token', mockSupabaseClient);
      expect(resNoEmail.error).toBeDefined();
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();

      const resNoPass = await signInUser('test@example.com', '', 'valid-turnstile-token', mockSupabaseClient);
      expect(resNoPass.error).toBeDefined();
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('allows sign-in and passes captchaToken in options when token is present', async () => {
      const captchaToken = 'valid-turnstile-response-token-456';
      const result = await signInUser('test@example.com', 'password123', captchaToken, mockSupabaseClient);

      expect(result.error).toBeNull();
      expect(result.data.session).toBeDefined();
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          captchaToken: 'valid-turnstile-response-token-456'
        }
      });
    });
  });
});
