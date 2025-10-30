# Categories System - Complete Documentation

## Overview
A comprehensive category management system with hierarchical structure, full-text capabilities, and rich UI features.

## 🗄️ Database Schema

### Tables

#### `categories`
Stores income and expense categories with parent-child relationships.

**Columns:**
- `id` - UUID primary key
- `user_id` - UUID (nullable for system categories)
- `name` - Category name
- `parent_id` - UUID (references categories.id for subcategories)
- `type` - ENUM: 'income', 'expense', 'both'
- `color` - Hex color code for UI
- `icon` - Icon name from lucide-react
- `is_system` - Boolean (system categories cannot be deleted)
- `sort_order` - Integer for custom ordering
- `created_at` - Timestamp

**Constraints:**
- `valid_parent_check` - Prevents self-referencing (id != parent_id)
- Cascade delete for user_id and parent_id

### Views

#### `category_statistics`
Aggregated transaction data per category.

**Columns:**
- `id`, `name`, `type`, `user_id`, `is_system`
- `transaction_count` - Total transactions in category
- `total_amount` - Sum of all transaction amounts
- `last_used` - Date of most recent transaction

### Indexes
- `categories_user_id_idx` - User lookups
- `categories_parent_id_idx` - Subcategory queries
- `categories_type_idx` - Filter by type
- `categories_sort_order_idx` - Ordering
- `categories_is_system_idx` - System category filtering

### Row Level Security (RLS)

**Policies:**
1. **SELECT**: Users can view system categories + their own
2. **INSERT**: Users can only create non-system categories
3. **UPDATE**: Users can only update their own non-system categories
4. **DELETE**: Users can only delete their own non-system categories

## 📊 Default System Categories

### Income (7 categories)
- Salary
- Freelance
- Business
- Investments
- Gifts
- Refunds
- Other Income

### Expense (12 parent categories, 50+ subcategories)

1. **Food & Dining** (🍴)
   - Groceries, Restaurants, Coffee, Fast Food

2. **Transportation** (🚗)
   - Fuel, Public Transport, Taxi/Uber, Parking, Maintenance

3. **Housing** (🏠)
   - Rent, Mortgage, Utilities, Home Maintenance, Home Insurance

4. **Shopping** (🛍️)
   - Clothing, Electronics, Home Goods, Personal Items

5. **Entertainment** (🎬)
   - Movies, Events, Hobbies, Subscriptions

6. **Healthcare** (❤️)
   - Doctor, Pharmacy, Health Insurance, Fitness

7. **Bills & Utilities** (📄)
   - Electric, Water, Internet, Phone, Gas

8. **Education** (🎓)
   - Tuition, Books, Courses, Supplies

9. **Personal Care** (✨)
   - Haircut, Spa, Cosmetics

10. **Travel** (✈️)
    - Flights, Hotels, Activities

11. **Investments** (📈)
    - Stocks, Mutual Funds, Crypto

12. **Debt** (💳)
    - Credit Card, Loan EMI

## 🎨 UI Features

### Category Management Page (`/categories`)

#### 1. **Tree View Display**
- Hierarchical parent/child structure
- Expand/collapse functionality
- Visual indentation for subcategories
- Color-coded icons

#### 2. **Statistics Display**
- Transaction count per category
- Total amount spent/earned
- Usage information

#### 3. **Type Filtering**
- View all categories
- Filter by: Income, Expense, or Both
- Real-time filter updates

#### 4. **CRUD Operations**

**Add Category:**
- Name input
- Type selection (income/expense/both)
- Parent category selection
- Color picker (20 colors)
- Icon picker (50+ icons)

**Edit Category:**
- Update name, type, color, icon
- Cannot edit system categories
- Real-time preview

**Delete Category:**
- Confirmation dialog
- Cascades to subcategories
- Cannot delete system categories

#### 5. **Visual Customization**
- **Color Palette**: 20 predefined colors
- **Icon Library**: 50+ lucide-react icons
- Visual preview in forms
- Color-coded cards

#### 6. **Summary Cards**
- Total categories count
- Income categories count (green)
- Expense categories count (red)
- Both categories count (blue)
- Click to filter

## 🎯 TypeScript Types

```typescript
export type CategoryType = 'income' | 'expense' | 'both';

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  parent_id?: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

export interface CategoryWithStats extends Category {
  transaction_count: number;
  total_amount: number;
  last_used?: string;
}
```

## 🚀 Usage Examples

### Query Categories
```typescript
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .order('sort_order');
```

### Get Category Statistics
```typescript
const { data: stats } = await supabase
  .from('category_statistics')
  .select('*')
  .eq('user_id', userId);
```

### Create Custom Category
```typescript
const { data } = await supabase
  .from('categories')
  .insert({
    user_id: userId,
    name: 'My Category',
    type: 'expense',
    color: '#ef4444',
    icon: 'ShoppingCart',
    sort_order: 1
  });
```

## 🔧 Migration Instructions

### Run Migration
```bash
# Using Supabase CLI
supabase db push

# Or in Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy/paste migration file
# 3. Execute
```

### Verify Installation
```sql
-- Check categories exist
SELECT COUNT(*) FROM categories WHERE is_system = true;
-- Should return ~60 system categories

-- Check view works
SELECT * FROM category_statistics LIMIT 5;
```

## 📱 Component Structure

```
app/(dashboard)/categories/
  └── page.tsx (Server Component)

components/categories/
  └── categories-page-client.tsx (Client Component)

Database:
  - migrations/20250104000000_create_categories.sql
  - Types in src/lib/supabase/types.ts
```

## ⚠️ Important Notes

1. **System Categories**: Cannot be deleted or have is_system modified
2. **Cascade Deletes**: Deleting parent deletes all children
3. **Transaction Assignment**: Deleting category unassigns transactions
4. **User Categories**: Each user can create unlimited custom categories
5. **Type Flexibility**: 'both' type works for income or expense

## 🎨 Customization Options

### Add More Icons
Edit `iconNames` array in `categories-page-client.tsx`:
```typescript
const iconNames = [
  'DollarSign', 'NewIcon1', 'NewIcon2',
  // ... add more lucide-react icon names
];
```

### Add More Colors
Edit `colorPalette` array:
```typescript
const colorPalette = [
  '#yourcolor1', '#yourcolor2',
  // ... add more hex colors
];
```

## 🔮 Future Enhancements

- [ ] Drag-and-drop reordering (update sort_order)
- [ ] Budget limits per category
- [ ] Category merge functionality
- [ ] Bulk category import/export
- [ ] Category usage trends chart
- [ ] Suggested categories based on merchant
- [ ] Multi-level subcategories (currently 2 levels)

## 🐛 Troubleshooting

### Categories not showing
```sql
-- Check RLS policies
SELECT * FROM categories LIMIT 1;
-- Should return system categories even when not logged in for SELECT
```

### Cannot delete category
- Check if it's a system category (`is_system = true`)
- Check if user owns the category
- Check RLS policies

### Statistics not updating
- Ensure `category_statistics` view has proper permissions
- Refresh the view: `REFRESH MATERIALIZED VIEW category_statistics;`

## 📚 Related Files

- Migration: `supabase/migrations/20250104000000_create_categories.sql`
- Types: `src/lib/supabase/types.ts`
- Server Page: `src/app/(dashboard)/categories/page.tsx`
- Client Component: `src/components/categories/categories-page-client.tsx`
- Sidebar Link: `src/components/dashboard/sidebar.tsx`

---

**Built with**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/UI, Supabase
