# Firebase Security Rules Setup

This document explains how to set up and deploy Firestore security rules for the Inventory Management System.

## Prerequisites

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

## Project Configuration

The project is already configured with:
- `firestore.rules` - Security rules for Firestore
- `firestore.indexes.json` - Database indexes for optimal performance
- `firebase.json` - Firebase project configuration
- `.firebaserc` - Project ID configuration

## Security Rules Overview

The implemented security rules provide:

### Role-Based Access Control
- **Admin**: Full access to all collections
- **Warehouse Staff**: Can manage inventory, orders, suppliers, and products
- **Internal User**: Can create orders and read most data
- **Supplier**: Can manage their own catalog requests

### Collection-Specific Rules

#### Users Collection
- Users can read/update their own profile
- Admins can read all users and update roles
- Users cannot escalate their own roles

#### Access Requests
- Anyone can create access requests
- Users can read their own requests
- Only admins can approve/deny requests

#### Inventory & Products
- All authenticated users can read
- Only warehouse staff and admins can modify

#### Orders
- All authenticated users can read
- Internal users, warehouse staff, and admins can create
- Only warehouse staff and admins can update/delete

#### Suppliers
- All authenticated users can read
- Only warehouse staff and admins can modify

#### Reports & Analytics
- Admin-only access

#### Notifications
- Users can read their own notifications
- Admins can read all notifications

## Deployment Commands

### Deploy All Firebase Resources
```bash
npm run firebase:deploy
```

### Deploy Only Firestore Rules
```bash
npm run firebase:deploy:rules
```

### Deploy Only Firestore Indexes
```bash
npm run firebase:deploy:indexes
```

### Start Firebase Emulators (for testing)
```bash
npm run firebase:emulators
```

## Testing Security Rules

### Using Firebase Emulators
1. Start the emulators:
   ```bash
   npm run firebase:emulators
   ```

2. Access the Emulator UI at `http://localhost:4000`

3. Test different user roles and permissions

### Manual Testing Checklist

- [ ] Admin can read all users
- [ ] Admin can update user roles
- [ ] Admin cannot change their own role
- [ ] Non-admin users cannot read other users' data
- [ ] Warehouse staff can modify inventory
- [ ] Internal users can create orders
- [ ] Suppliers can only access their own catalog requests
- [ ] Unauthenticated users cannot access protected data

## Security Best Practices Implemented

1. **Principle of Least Privilege**: Users only get minimum required permissions
2. **Role-Based Access Control**: Clear separation of permissions by user role
3. **Data Isolation**: Users can only access their own data unless explicitly allowed
4. **Admin Protection**: Admins cannot accidentally modify their own roles
5. **Audit Trail**: Audit logs collection for tracking administrative actions

## Updating Rules

When modifying security rules:

1. Edit `firestore.rules`
2. Test changes using Firebase emulators
3. Deploy using `npm run firebase:deploy:rules`
4. Monitor Firebase Console for any rule violations

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**:
   - Check if user has correct role in Firestore
   - Verify rule logic in `firestore.rules`
   - Test with Firebase emulators

2. **Slow Queries**:
   - Check if required indexes are deployed
   - Add new indexes to `firestore.indexes.json`
   - Deploy indexes with `npm run firebase:deploy:indexes`

3. **Rule Deployment Fails**:
   - Verify Firebase CLI is logged in
   - Check project ID in `.firebaserc`
   - Ensure proper permissions on Firebase project

### Monitoring

- Monitor rule usage in Firebase Console > Firestore > Usage
- Check for denied requests in Firebase Console > Firestore > Rules
- Set up alerts for unusual access patterns

## Next Steps

1. **Deploy the rules**: Run `npm run firebase:deploy:rules`
2. **Test thoroughly**: Use emulators and manual testing
3. **Monitor usage**: Watch for any permission issues
4. **Iterate**: Update rules as new features are added

## Additional Security Considerations

- Consider implementing Firebase Functions for complex business logic
- Add rate limiting for sensitive operations
- Implement audit logging for all administrative actions
- Regular security reviews and rule updates
- Consider using Firebase App Check for additional security