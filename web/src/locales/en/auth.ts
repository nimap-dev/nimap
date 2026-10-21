/** The login page. */
export default {
  login: {
    title: 'Login',
    description: 'Login by providing your username and password below.',
    username: 'Username',
    password: 'Password',
    submit: 'Login',
    invalid: 'Invalid username or password',
    success: 'Logged in successfully',
    or: 'or',
    sso: 'Log in with {{name}}',
    ssoErrors: {
      oidc: 'Single sign-on failed. Please try again.',
      oidc_no_account:
        'Your account is not allowed to sign in to NIMAP. Ask an administrator for access.',
    },
  },
}
