# Add Transaction Form Documentation

## Overview

The Add Transaction Form is a comprehensive, user-friendly interface for creating new financial transactions with advanced features including split transactions, recurring schedules, file attachments, and intelligent autocomplete.

## Features

### 1. Transaction Types
- **Income**: Money received (salary, freelance, gifts)
- **Expense**: Money spent (groceries, bills, entertainment)
- **Transfer**: Money moved between accounts

### 2. Basic Fields
- **Amount**: Large, prominent input with built-in calculator
- **Currency**: Multi-currency support (USD, EUR, GBP, JPY, INR, CAD, AUD)
- **Date**: Calendar picker with default to today
- **Account**: Dropdown of user's active accounts
- **Description**: Text input with autocomplete from historical transactions

### 3. Advanced Fields (Expandable)
- **Category**: Hierarchical selection with icons and colors
  - Parent categories filter by transaction type
  - Subcategories appear when parent selected
- **Merchant**: Autocomplete from previous merchants
- **Payment Method**: Cash, Card, Bank Transfer, UPI, Other
- **Tags**: Multi-select with creation, autocomplete from existing tags
- **Location**: Text input with "Use Current Location" button (GPS)
- **Notes**: Multi-line text area for additional context

### 4. Split Transactions
Toggle to enable splitting a single transaction across multiple categories:
- Add multiple splits with category and amount
- Real-time validation: splits must sum to transaction amount
- Shows remaining amount to allocate
- Useful for:
  - Shopping trips with multiple categories (groceries + household)
  - Business trips (travel + meals + lodging)
  - Mixed purchases

**Example**:
```
Transaction: $150 grocery store purchase
Split 1: $100 - Groceries
Split 2: $30 - Household Items
Split 3: $20 - Personal Care
Total: $150 ✓
```

### 5. Recurring Transactions
Automate future transaction creation:
- **Frequencies**: Daily, Weekly, Biweekly, Monthly, Quarterly, Yearly
- **End Conditions**: 
  - End date (stop after specific date)
  - Occurrence count (e.g., 12 monthly payments)
  - No end (continues indefinitely)
- Shows next occurrence date preview
- Useful for:
  - Rent/mortgage payments
  - Subscription services
  - Regular income (salary)
  - Utility bills

### 6. File Attachments
Upload and attach receipts or documents:
- Drag-and-drop or click to browse
- Multiple file support
- Accepted formats: PNG, JPG, PDF (up to 10MB)
- File preview with remove option
- Future: OCR to extract transaction data from receipts

### 7. Built-in Calculator
Quick calculator for complex amounts:
- Basic operations: +, -, *, /
- Opens in overlay
- Result auto-fills amount field
- Example: `12.50 * 3 + 5.75 = 43.25`

### 8. Smart Autocomplete
Intelligent suggestions based on historical data:
- **Description**: Previous transaction descriptions
- **Merchant**: Past merchants
- **Tags**: Existing tags from user's transactions
- Filters as you type

### 9. Form Features
- **Save Draft**: Stores form data in local storage
- **Load Draft**: Auto-loads on return if draft exists
- **Real-time Validation**: Zod schema with helpful error messages
- **Responsive Layout**: Mobile-friendly with adaptive sidebar
- **Quick Info Panel**: Real-time summary of form data
- **Tips Panel**: Helpful hints for using features

### 10. Success Actions
After successful submission:
- Toast notification with success message
- **Undo button**: Delete transaction within 5 seconds
- Automatic redirect to transactions list
- Form reset for next entry

## Technical Implementation

### Form Management
- **react-hook-form**: Complex form state management
- **useFieldArray**: Dynamic split transaction entries
- **Controller**: Wrapped UI components (Select, Switch)

### Validation
- **Zod Schema**: Type-safe validation with custom rules
- Required fields: type, amount, date, account, description
- Amount validation: Must be greater than 0
- Split validation: Custom refine() to check sum equals amount
- Real-time error display below fields

### Data Flow
1. Server component fetches data (accounts, categories, historical data)
2. Props passed to client form component
3. User fills form with autocomplete assistance
4. Submit triggers validation
5. On valid, insert transaction to Supabase
6. If splits enabled, insert to transaction_splits table
7. If recurring, store recurring_id for grouping
8. Show success toast with undo capability
9. Redirect to list page

### State Management
```typescript
// Form state
const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm()

// Dynamic arrays
const { fields, append, remove } = useFieldArray({ control, name: 'splits' })

// Local state
const [selectedTags, setSelectedTags] = useState<string[]>([])
const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
const [showAdvanced, setShowAdvanced] = useState(false)
```

### File Upload (Future Enhancement)
Currently files are selected but not uploaded. To implement:
1. Create Supabase Storage bucket: `transaction-receipts`
2. Upload files on form submit
3. Store public URLs in `receipt_url` field
4. Add OCR processing for image files
5. Display thumbnails in transaction list

## Usage Examples

### Simple Expense
```
Type: Expense
Amount: $45.50
Date: Today
Account: Checking Account
Description: Grocery shopping
Category: Groceries
Merchant: Walmart
Payment: Card
```

### Split Transaction
```
Type: Expense
Amount: $200
Description: Target shopping
Enable Split: ✓
Splits:
  - Groceries: $120
  - Household: $50
  - Personal Care: $30
Total: $200 ✓
```

### Recurring Subscription
```
Type: Expense
Amount: $9.99
Description: Netflix subscription
Category: Entertainment > Streaming
Enable Recurring: ✓
Frequency: Monthly
End: Never (or 12 occurrences)
Next: 2025-02-15
```

### Income with Tags
```
Type: Income
Amount: $1,500
Description: Freelance project payment
Category: Freelance Income
Tags: ["project-x", "client-abc", "web-development"]
Notes: Payment for website redesign project
```

## Keyboard Shortcuts

- **Tab**: Navigate between fields
- **Enter**: Submit form (when in text input)
- **Escape**: Close calculator/dialogs
- **Ctrl + S**: Save draft (browser default)

## Validation Rules

### Amount
- Must be present
- Must be greater than 0
- Supports decimals (e.g., 45.50)

### Date
- Must be present
- Any valid date (past, present, future)

### Account
- Must select an existing account
- Only shows active accounts

### Description
- Must not be empty
- Min 1 character

### Splits (when enabled)
- Each split must have category and amount
- Sum of splits must equal transaction amount (±0.01 for rounding)
- Can have 0 to unlimited splits

### Recurring (when enabled)
- Must select frequency
- Can have end date OR occurrence count (optional)

## Accessibility

- Proper label associations
- Error messages linked to inputs
- Keyboard navigable
- Focus indicators
- Screen reader friendly
- ARIA labels where needed

## Mobile Considerations

- Responsive grid layout (1 column on mobile, 3 on desktop)
- Touch-friendly buttons and inputs
- Native date picker on mobile
- Collapsible advanced section
- Sticky header with save button

## Performance

- Debounced autocomplete (prevents API spam)
- Lazy loading for category tree
- Optimistic UI updates
- Form state preserved in local storage
- Client-side validation before submission

## Error Handling

- Network errors: Toast with retry option
- Validation errors: Inline messages below fields
- Duplicate detection: Warning if similar recent transaction
- File upload errors: Individual file error messages
- Auto-save draft on error

## Future Enhancements

1. **OCR Integration**: Extract data from receipt photos
2. **Smart Categorization**: Auto-suggest category based on merchant
3. **Currency Conversion**: Real-time exchange rates
4. **Voice Input**: Speak to add transaction
5. **Template System**: Save common transactions as templates
6. **Location Services**: Auto-detect merchant from GPS
7. **Barcode Scanner**: Scan products for amount/description
8. **Budget Warning**: Alert if expense exceeds category budget
9. **Duplicate Detection**: Warn of potential duplicate transactions
10. **Quick Add Mode**: Minimal fields for fast entry

## Troubleshooting

### Form not submitting
- Check browser console for errors
- Verify all required fields filled
- Check network connection
- Ensure logged in (auth token valid)

### Autocomplete not working
- Verify historical data exists
- Check browser autocomplete settings
- Clear browser cache if stale data

### Splits not validating
- Check that sum equals amount exactly
- Consider rounding errors (±0.01 allowed)
- Ensure all splits have category and amount

### Files not uploading
- Feature not yet implemented
- Files selected but not uploaded to storage
- Placeholder for future enhancement

## Related Files

- `src/app/(dashboard)/transactions/add/page.tsx` - Server component (data fetching)
- `src/components/transactions/add-transaction-form.tsx` - Form component (1,100+ lines)
- `src/lib/supabase/types.ts` - TypeScript interfaces
- `supabase/migrations/20250103000000_create_transactions.sql` - Database schema

## API Integration

### Supabase Tables Used
- `transactions` - Main transaction record
- `transaction_splits` - Split transaction details
- `accounts` - User's financial accounts
- `categories` - Income/expense categories

### Authentication
- Requires authenticated user
- User ID from `supabase.auth.getUser()`
- RLS policies enforce user-level access

### Data Validation
- Client-side: Zod schema
- Server-side: PostgreSQL constraints
- Database triggers: Automatic balance updates
