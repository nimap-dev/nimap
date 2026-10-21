/** User management: the user list, creating a user and managing one. */
export default {
  fields: {
    username: 'Username',
    email: 'Email',
    password: 'Password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    updated: 'Updated',
  },
  users: {
    title: 'Users',
    loadFailed: 'Failed to load users',
    search: 'Search users…',
    back: 'Back to users',
    notFound: "This user doesn't exist, or you don't have access to it.",
  },
  newUser: {
    title: 'New user',
    submit: 'Create user',
    submitting: 'Creating…',
    couldNotCreate: 'Could not create user',
    notCreated: 'The account was not created',
    created: 'User created',
    roleDescription:
      'What the user may do. You can change it later on their page.',
    passwordDescription:
      'At least 8 characters. Hand it to the user; they can change it in their account settings.',
  },
  delete: {
    label: 'Delete user',
    title: 'Delete {{username}}?',
    description:
      'The account is removed outright, and whoever was using it is signed out on their next request. If you only want to take their access away, set their role to {{viewer}} instead: they keep the account and you keep the option of giving the access back. You can’t undo this from here.',
    submit: 'Delete user',
    stillThere: '{{username}} is still there',
    requestFailed: 'The request failed, check your connection and retry',
    deleted: '{{username}} was deleted',
  },
  unlink: {
    label: 'Unlink',
    title: 'Unlink single sign-on from {{username}}?',
    description:
      'They can no longer log in with this provider account. If they try again, it is treated as a first login: linked anew by a verified email, or refused.',
    descriptionLastWayIn:
      'This is their only way to log in: they have no password. Until you set one or the account is linked again, they cannot log in.',
    submit: 'Unlink',
    submitting: 'Unlinking…',
    couldNotUnlink: 'Could not unlink',
    notUnlinked: 'The account is still linked',
    unlinked: 'Single sign-on unlinked from {{username}}',
  },
  self: {
    title: 'This is your account',
    description:
      'Your own username, email, password and role are not editable here. Account settings asks for your current password before it changes anything, and an admin who could demote themselves could lock everyone out.',
    goToAccount: 'Go to account settings',
  },
  account: {
    title: 'Account',
    description: 'Change this user’s username and email.',
    updated: 'Account updated',
    notUpdated: 'The account was not updated',
  },
  role: {
    description:
      'Takes effect on this user’s next request. They stay signed in.',
    selectLabel: 'User role',
    couldNotChange: 'Could not change role',
    unchanged: '{{username}} is unchanged',
    changed: '{{username}} is now {{role}}',
  },
  password: {
    title: 'Password',
    description:
      'Set a new password of at least 8 characters, then pass it on. Their existing sessions keep working until they expire.',
    submit: 'Reset password',
    submitting: 'Resetting…',
    couldNotReset: 'Could not reset password',
    notChanged: 'The password was not changed',
    reset: '{{username}} has a new password',
  },
}
