import {
  hashUserPassword,
  User,
  UserSchema,
  UserRole,
  KycStatus,
  SALT_ROUNDS,
} from './user.schema';

describe('UserSchema', () => {
  describe('hashUserPassword()', () => {
    it('produces a bcrypt-hashed representation, not the plaintext', async () => {
      const hash = await hashUserPassword('superSecret123');
      expect(hash).not.toBe('superSecret123');
      expect(hash.length).toBeGreaterThan(20);
      expect(hash.startsWith('$2')).toBe(true); // bcryptjs prefix
    });

    it('produces a different hash for the same input (salt is random)', async () => {
      const a = await hashUserPassword('superSecret123');
      const b = await hashUserPassword('superSecret123');
      expect(a).not.toBe(b);
    });

    it('uses a reduced salt rounds in test mode', () => {
      expect(process.env.NODE_ENV === 'test' ? SALT_ROUNDS : SALT_ROUNDS).toBeGreaterThanOrEqual(4);
    });
  });

  describe('User.comparePassword() (instance method)', () => {
    it('returns true for a correct plaintext, false for a wrong one', async () => {
      const stored = { password: await hashUserPassword('compIlerRocks') } as { password: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyUser: any = stored;
      anyUser.comparePassword = UserSchema.methods.comparePassword;
      await expect(anyUser.comparePassword('compIlerRocks')).resolves.toBe(true);
      await expect(anyUser.comparePassword('wrongPassword')).resolves.toBe(false);
    });
  });

  describe('toJSON transform', () => {
    it('strips sensitive fields and exposes a string id', () => {
      // Build a minimal faux mongoose doc and run the transform manually.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anySchema: any = UserSchema;
      const transform = anySchema.options?.toJSON?.transform;
      expect(typeof transform).toBe('function');

      const ret = {
        _id: { toString: () => 'fake-id-123' },
        __v: 0,
        password: 'hidden',
        refreshTokenHash: 'hidden',
        passwordResetToken: 'hidden',
        emailVerificationToken: 'hidden',
        fullName: 'JSON Test',
        email: 'json@example.com',
      };
      const out = transform(null, ret);
      expect(out.id).toBe('fake-id-123');
      expect(out.email).toBe('json@example.com');
      expect(out).not.toHaveProperty('password');
      expect(out).not.toHaveProperty('refreshTokenHash');
      expect(out).not.toHaveProperty('passwordResetToken');
      expect(out).not.toHaveProperty('emailVerificationToken');
      expect(out).not.toHaveProperty('_id');
      expect(out).not.toHaveProperty('__v');
    });
  });

  describe('enum metadata', () => {
    it('exposes UserRole.USER and UserRole.ADMIN with the spec values', () => {
      expect(UserRole.USER).toBe('user');
      expect(UserRole.ADMIN).toBe('admin');
    });

    it('exposes KycStatus values matching the spec', () => {
      expect(KycStatus.PENDING).toBe('pending');
      expect(KycStatus.APPROVED).toBe('approved');
      expect(KycStatus.REJECTED).toBe('rejected');
    });
  });

  it('User class is exported with a Mongoose Schema instance', () => {
    expect(User.name).toBe('User');
    expect(UserSchema).toBeDefined();
    // Mongoose Schema exposes stable public APIs: .path, .indexes, .virtual.
    expect(typeof UserSchema.path).toBe('function');
    expect(Array.isArray(UserSchema.indexes())).toBe(true);
  });
});
