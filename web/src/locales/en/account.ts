/** The account page: the user's own details, preferences and password. */
export default {
  title: 'Account',
  account: {
    title: 'Account',
    description:
      'Change your username and email. Confirm with your current password.',
    username: 'Username',
    email: 'Email',
    currentPassword: 'Current password',
    accountUpdated: 'Account updated',
    accountNotUpdated: 'Your account was not updated',
  },
  preferences: {
    title: 'Preferences',
    description:
      'Choose how the interface looks and how dates and times are shown.',
    language: 'Language',
    theme: 'Theme',
    timezone: 'Time zone',
    browserTimezone: 'Browser default ({{zone}})',
    dateFormat: 'Date format',
    timeFormat: 'Time format',
    save: 'Save preferences',
    updated: 'Preferences updated',
    notUpdated: 'Your preferences were not updated',
    themes: {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
    dateFormats: {
      auto: 'Automatic (by language)',
    },
    timeFormats: {
      auto: 'Automatic',
      autoHint: 'By language',
      h24: '24-hour',
      h12: '12-hour',
    },
  },
  password: {
    title: 'Password',
    description: 'Choose a new password of at least 8 characters.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    submit: 'Change password',
    submitting: 'Changing…',
    changed: 'Password changed',
    couldNotChange: 'Could not change password',
    notChanged: 'Your password was not changed',
  },
}
