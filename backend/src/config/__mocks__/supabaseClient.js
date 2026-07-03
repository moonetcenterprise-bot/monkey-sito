// Manual mock (Jest la usa automaticamente con jest.mock('../config/supabaseClient')).
// Permette ai test di configurare risposte Auth/DB senza toccare un progetto reale.
const { createDbClientMock } = require('../../../tests/helpers/supabaseMock');

const authClient = {
  auth: {
    getUser: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    admin: { signOut: jest.fn() }
  }
};

const dbClient = createDbClientMock();

module.exports = { authClient, dbClient };
