# Transactions Page - Quick Start Guide

## 🚀 Access the Page
Navigate to: **`/transactions`**

## ✨ Quick Features Overview

### 1️⃣ Add a Transaction
- Click **"Add Transaction"** button (top right)
- Or press **`Ctrl+N`** / **`Cmd+N`**
- Fill in required fields: Type, Amount, Description, Account, Date
- Optional: Category, Payment Method, Merchant, Notes, Location
- Click **"Add"**

### 2️⃣ Search Transactions
- Click in search bar (or press **`Ctrl+F`**)
- Type to search across:
  - Description
  - Merchant name
  - Notes

### 3️⃣ Filter by Date
Click one of the quick presets:
- **Today** - Today's transactions only
- **Yesterday** - Yesterday's transactions
- **This Week** - Monday to Sunday of current week
- **Last Week** - Previous week
- **This Month** - 1st to last day of current month
- **Last Month** - Previous month
- **Custom** - Keep your current custom range

### 4️⃣ Filter by Other Criteria
Click **"Filters"** button to show/hide advanced filters:
- **Accounts**: Filter by specific account
- **Categories**: Filter by category
- **Type**: Income, Expense, or Transfer
- **Amount Range**: Min and max amount
- **Clear All**: Reset all filters

### 5️⃣ Sort Transactions
Click on column headers:
- **Date** - Sort by date (newest/oldest)
- **Amount** - Sort by amount (highest/lowest)

### 6️⃣ Bulk Operations
1. Check boxes next to transactions you want to modify
2. Blue bar appears showing: `X selected`
3. Choose action:
   - **Categorize** - Assign category to all selected
   - **Add Tags** - Add tags to all selected
   - **Change Account** - Move to different account
   - **Export** - Download as CSV
   - **Delete** - Remove all selected (with confirmation)

### 7️⃣ Individual Actions
Click **⋮** (three dots) on any transaction row:
- **View Details** - See full transaction info
- **Edit** - Modify transaction
- **Duplicate** - Create copy with today's date
- **Delete** - Remove transaction (with confirmation)

### 8️⃣ Export Data
- Select specific transactions (checkboxes)
- Click **"Export"** in bulk actions bar
- Or press **`Ctrl+E`** to export all filtered transactions
- Downloads as CSV file: `transactions-YYYY-MM-DD.csv`

### 9️⃣ Pagination
Bottom of table:
- **Page Size**: Select 25, 50, 100, or 200 rows per page
- **Previous/Next**: Navigate through pages
- Shows: "Showing X to Y of Z transactions"

### 🔟 Summary Cards
Top of page shows 5 cards:
1. **Total Income** (green) - Sum of all income in filtered results
2. **Total Expenses** (red) - Sum of all expenses in filtered results
3. **Net Amount** - Income minus expenses (green if positive, red if negative)
4. **Transactions** - Count of transactions
5. **Average** - Average transaction amount

## 🎯 Pro Tips

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` / `Cmd+N` | New transaction |
| `Ctrl+F` / `Cmd+F` | Focus search |
| `Ctrl+E` / `Cmd+E` | Export CSV |

### Quick Workflows

**Add Income**:
1. `Ctrl+N`
2. Select "Income" type
3. Enter amount and description
4. Select account
5. Enter

**Weekly Review**:
1. Click "This Week" date preset
2. Review summary cards
3. Edit any miscategorized transactions
4. Export for records

**Bulk Categorize Uncategorized**:
1. Click "Filters"
2. Select "Category" → "Uncategorized" (if available)
3. Select all transactions (top checkbox)
4. Click "Categorize"
5. Choose category
6. Confirm

**Export Tax Records**:
1. Set date range to tax year
2. Filter by relevant categories
3. `Ctrl+E` to export
4. Open in Excel for tax prep

## 🎨 Visual Indicators

### Colors
- 🟢 **Green amounts** = Income (prefixed with +)
- 🔴 **Red amounts** = Expenses (prefixed with -)
- **Category badges** = Use category's custom color

### Icons
- Each category shows its custom icon
- Summary cards have relevant icons
- Action buttons have descriptive icons

## 📊 Understanding the Table

### Columns Explained
- **☑** - Checkbox for bulk selection
- **Date** - Transaction date (sortable)
- **Description** - Main description + merchant name below
- **Category** - Colored badge with icon
- **Account** - Account name
- **Amount** - Color-coded amount (sortable)
- **Tags** - First 2 tags + count (e.g., "+3")
- **Actions** - ⋮ menu with options

### No Transactions?
If you see "No transactions found":
1. Check your filters - click "Clear All" in filters panel
2. Adjust date range - try "This Month" or "Last Month"
3. Make sure you have the right account selected

## ⚠️ Important Notes

### Before Deleting
- **Single delete**: Confirmation dialog appears
- **Bulk delete**: Confirms number of transactions to delete
- **Cannot be undone**: Deleted transactions are permanently removed

### Account Balance
- When you add/edit/delete a transaction, account balances update automatically
- This is handled by database triggers

### Categories
- If you delete a category, transactions become "Uncategorized"
- You can bulk categorize them later

### Tags
- Tags are stored with transactions
- Currently simplified UI for adding tags
- Full tag management coming soon

## 🆘 Troubleshooting

### Filters not working?
- Clear all filters and try again
- Refresh the page
- Check browser console for errors

### Export not downloading?
- Check browser's download settings
- Allow pop-ups for the site
- Try different browser

### Transaction not appearing?
- Check if filters are active
- Verify correct date range
- Ensure transaction was saved (check for success)

### Keyboard shortcuts not working?
- Make sure no dialog is open
- Check if input field is focused (blur it first)
- Try different key combination based on OS

## 🔄 What Happens When...

### You add a transaction:
1. Transaction saved to database
2. Account balance updated automatically
3. Transaction appears at top of list
4. Summary cards recalculate
5. Page refreshes data

### You edit a transaction:
1. Changes saved to database
2. Account balance recalculated
3. Transaction updated in table
4. Summary cards recalculate

### You delete a transaction:
1. Confirmation dialog appears
2. If confirmed, transaction removed
3. Account balance adjusted
4. Transaction disappears from table
5. Summary cards recalculate

---

**Need Help?** Check the full documentation: `TRANSACTIONS_DOCUMENTATION.md`
