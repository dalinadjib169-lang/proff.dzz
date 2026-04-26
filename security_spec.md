# Security Specification - TeachDZ

## 1. Data Invariants
- A user profile must belong to the authenticated user.
- A post must have a valid author ID and strict privacy controls.
- A comment must belong to an existing post.
- PII (emails, phone numbers) must be protected.
- Timestamps must be server-generated.
- Resource IDs must match specific formats.

## 2. The "Dirty Dozen" Payloads (Anti-Tests)

### Payload 1: Identity Spoofing (Post Creation)
Target: `/posts`
Attempt: Setting `authorId` to a different user's UID.
```json
{
  "authorId": "attacker_id",
  "content": "Malicious content",
  "authorName": "Fake Name"
}
```
**Expected: PERMISSION_DENIED**

### Payload 2: Privilege Escalation (Profile Update)
Target: `/users/{uid}`
Attempt: Setting `role` to 'admin'.
```json
{
  "role": "admin"
}
```
**Expected: PERMISSION_DENIED (Users should not be able to set their own roles)**

### Payload 3: Resource Poisoning (ID Injection)
Target: `/comments/LONG_JUNK_ID_STRING_1MB`
Attempt: Injecting a giant string as a document ID.
**Expected: PERMISSION_DENIED**

### Payload 4: Update Gap (Shadow Fields)
Target: `/posts/{postId}`
Attempt: Adding a field `isVerified: true` during a standard update.
```json
{
  "isVerified": true
}
```
**Expected: PERMISSION_DENIED**

### Payload 5: Orphaned Resource (Comment without Post)
Target: `/comments`
Attempt: Creating a comment for a non-existent `postId`.
**Expected: PERMISSION_DENIED**

### Payload 6: Timestamp Spoofing
Target: `/posts`
Attempt: Setting `createdAt` to a future or past date.
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
**Expected: PERMISSION_DENIED**

### Payload 7: Denial of Wallet (Giant String in Bio)
Target: `/users/{uid}`
Attempt: Updating `bio` with 1MB of text.
**Expected: PERMISSION_DENIED**

### Payload 8: PII Leak (Unauthorized Read)
Target: `/users_private/{uid}`
Attempt: Reading another user's private data.
**Expected: PERMISSION_DENIED**

### Payload 9: List Query Scraping
Target: `/posts` (list operation)
Attempt: Listing posts without a privacy filter.
**Expected: PERMISSION_DENIED (Must restrict list to public or owned)**

### Payload 10: State Shortcut (Product Status)
Target: `/products/{productId}`
Attempt: Directly moving a product to 'sold' without being the seller.
**Expected: PERMISSION_DENIED**

### Payload 11: Call Hijacking
Target: `/calls/{callId}`
Attempt: Updating a call record the user is not part of.
**Expected: PERMISSION_DENIED**

### Payload 12: Notification Spam
Target: `/notifications`
Attempt: Creating hundreds of notifications for a victim.
**Expected: PERMISSION_DENIED (Enforced by authenticated sender check)**
