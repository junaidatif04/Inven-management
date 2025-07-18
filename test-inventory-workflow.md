# Testing Inventory Workflow

## Steps to Test Inventory Creation After Supplier Request Approval

### 1. Check Console Logs
Open the browser developer console (F12) and look for the following debug messages:

**When supplier auto-registration happens:**
- "Auto-registering supplier for user:"
- "Checking for existing supplier with email:"
- "Found existing supplier, updating:" OR "No existing supplier found, creating new supplier"
- "Successfully created new supplier with ID:" OR "Successfully updated existing supplier"

**When quantity request is approved:**
- "Processing approved quantity request for inventory creation:"
- "Quantity request data:"
- "Checking for existing inventory item:"
- "No existing item found. Creating new inventory item with data:" OR "Found existing inventory item, adding stock:"
- "User ID for inventory creation:"
- "Successfully created inventory item with ID:" OR "Successfully added stock to existing inventory item:"

### 2. Test Workflow

1. **Login as a supplier user**
   - Make sure the user has role 'supplier' and status 'approved'
   - Check console for auto-registration logs

2. **Create a quantity request** (as warehouse staff or admin)
   - Go to warehouse dashboard
   - Create a quantity request for the supplier

3. **Approve the quantity request** (as supplier)
   - Login as the supplier
   - Navigate to quantity requests
   - Approve a request with a specific quantity
   - Check console logs for inventory creation

4. **Verify inventory was created**
   - Go to inventory page
   - Check if new inventory item appears
   - Verify the quantity matches approved amount

### 3. Common Issues to Check

- **Permission Errors**: Check if user has proper role and permissions
- **Missing Supplier Record**: Verify supplier auto-registration worked
- **Invalid Data**: Check if all required fields are present
- **Network Errors**: Check browser network tab for failed requests

### 4. Database Verification

Check Firebase console for:
- New documents in `inventory` collection
- New documents in `stockMovements` collection
- Updated documents in `quantityRequests` collection
- Supplier documents in `suppliers` collection

### 5. Debugging Tips

- Clear browser cache and reload
- Check Firebase Authentication status
- Verify user roles in Firebase Auth custom claims
- Check Firestore security rules are deployed
- Look for JavaScript errors in console