# Security Specification for Teac DZ - Algerian Teachers Network

## 1. Data Invariants
- A user profile must be created with a valid auth UID.
- A post must have a valid authorId matching the creator's UID.
- A post's privacy must be one of: 'public', 'friends', 'private'.
- A user can only access their own `users_private` data.
- A user can only see posts where they are the author, or the post is public, or the author is their friend.
- Marketplace products must have a valid sellerId.
- Notifications can only be read by the recipient.

## 2. The "Dirty Dozen" Payloads

1. **Unauthorized Profile Edit**: Non-owner attempts to change another user's display name.
2. **Private Data Leak**: User A attempts to read User B's `users_private` document.
3. **Identity Spoofing**: User A creates a post with `authorId` set to User B.
4. **Invalid Privacy Level**: User attempts to create a post with `privacy: 'super-secret'`.
5. **Shadow Field Injection**: User attempts to add `isAdmin: true` to their profile.
6. **Marketplace Price Tampering**: User attempts to change the price of another seller's product.
7. **Comment Deletion**: User A attempts to delete User B's comment.
8. **Friend Request Hijack**: User A accepts a friend request intended for User B.
9. **Notification Spam**: Unauthenticated user attempts to create thousands of notifications.
10. **System Field Update**: User attempts to manually update their `createdAt` timestamp.
11. **Malicious ID**: User attempts to create a document with a 2KB junk string as the ID to cause resource exhaustion.
12. **Status Skipping**: User updates a marketplace product status directly to 'sold' without being the owner.

## 3. The Test Runner

A `firestore.rules.test.ts` file will be created to verify these invariants using the Firebase Emulators or direct logic checks.
