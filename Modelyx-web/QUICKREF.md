# 🚀 MODELYX - Quick Reference Guide

## 📌 Quick Navigation

| Page | Purpose | Users | File |
|------|---------|-------|------|
| 🔐 Auth | Login/Register | All | `index.html` |
| 📊 Dashboard | View & scan colors | Customers | `dashboard.html` |
| 🎨 Designer | Create jerseys | Customers | `editor.html` |
| ⚙️ Admin | Manage orders | Outfitters | `admin.html` |

---

## 🔑 Demo Credentials

### Customer Account
```
Email: coach@team.com
Password: password123
Role: Customer
```

### Admin/Outfitter Account
```
Email: admin@modelyx.com
Password: password123
Role: Owner
```

---

## 🎯 User Workflows

### 👤 Customer Workflow
```
1. Register at index.html
   ├── Email: coach@example.com
   ├── Password: min 6 chars
   ├── Role: Select "Customer"
   └── Create Profile

2. Login to dashboard.html
   ├── Scan Color DNA
   │   ├── Allow camera
   │   ├── Point at item
   │   └── Capture color
   │
   └── Design Jersey (editor.html)
       ├── Add team name
       ├── Add number (0-99)
       ├── Choose material
       ├── Choose pattern
       ├── Select fabric
       ├── Toggle front/back
       └── Submit Order

3. View Status on Dashboard
   └── Check order in table
```

### 👨‍💼 Outfitter Workflow
```
1. Login with admin email
   └── auto-redirect to admin.html

2. View Orders
   ├── See pending requests
   ├── View customer details
   ├── Check color DNA (hex)
   └── See pricing

3. Manage Orders
   ├── Change status
   │   ├── Pending Review
   │   ├── Approved
   │   ├── In Production
   │   └── Completed
   │
   ├── View details
   ├── Delete if needed
   └── Track analytics

4. Export Data
   └── Download as CSV
```

---

## 📚 JavaScript Functions Reference

### Authentication
```javascript
// Check if user is logged in
Auth.isLoggedIn()

// Get current user object
Auth.getUser()

// Check if admin
Auth.isAdmin()

// Check if customer
Auth.isCustomer()

// Force login redirect
Auth.requireLogin()

// Force admin redirect
Auth.requireAdmin()

// Logout
Auth.logout()
```

### Notifications
```javascript
// Success notification
showToast('Success!', 'success')

// Error notification
showToast('Error', 'error')

// Warning notification
showToast('Warning', 'warning')
```

### Validation
```javascript
// Email validation
Validators.email('test@example.com')

// Password check (min 6)
Validators.password('password123')

// Phone check (min 10)
Validators.phone('+1234567890')

// Name check (min 2)
Validators.name('John')

// Number check (0-99)
Validators.number('23')
```

### Storage
```javascript
// Save data
StorageManager.set('key', {data: true})

// Get data
StorageManager.get('key', defaultValue)

// Remove key
StorageManager.remove('key')

// Clear all
StorageManager.clear()
```

### Orders
```javascript
// Get all orders
OrderManager.getAll()

// Add new order
OrderManager.add(orderObject)

// Update status
OrderManager.update(orderId, {status: 'Approved'})

// Delete order
OrderManager.delete(orderId)

// Get one order
OrderManager.getById(orderId)

// Get statistics
OrderManager.getStats()
```

### Colors
```javascript
// Validate hex color
ColorUtils.isValidHex('#4F46E5')

// Convert hex to RGB
ColorUtils.hexToRgb('#4F46E5')

// Convert RGB to hex
ColorUtils.rgbToHex(79, 70, 229)

// Get text color (light/dark)
ColorUtils.getLuminance('#4F46E5')
```

---

## 💾 LocalStorage Keys

```javascript
// User Profile
localStorage.getItem('modelyx_user_name')
localStorage.getItem('modelyx_user_email')
localStorage.getItem('modelyx_user_phone')
localStorage.getItem('modelyx_user_role')

// Design Data
localStorage.getItem('modelyx_temp_color')
sessionStorage.getItem('modelyx_design_draft')

// Orders
localStorage.getItem('modelyx_orders')
```

---

## 🎨 Order Data Structure

```javascript
{
  id: "ORD-ABC123XYZ",              // Unique ID
  customer: "Coach Morgan",           // Full name
  email: "coach@tigers.com",         // Email address
  team: "Tigers",                    // Team name
  number: "23",                      // Player number
  color: "#4F46E5",                  // Color DNA (hex)
  fabric: "Dry-Fit Pro ($65)",      // Selected fabric
  price: "$65.00",                   // Total price
  status: "Pending Review",          // Current status
  date: "5/1/2026",                  // Submission date
  createdAt: "2026-05-01T10:30:00Z" // ISO timestamp
}
```

---

## 🔒 Form Validation Rules

| Field | Rules | Example |
|-------|-------|---------|
| Email | Valid email format | coach@team.com |
| Password | Min 6 characters | password123 |
| Name | Min 2 characters | John Smith |
| Phone | Min 10 digits | +1234567890 |
| Number | 0-99 only | 23 |
| Team Name | 2+ characters | Tigers |

---

## 🌐 API Endpoints (Future)

When backend is added, use these endpoints:

```javascript
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/user/profile
GET    /api/orders
POST   /api/orders
PUT    /api/orders/:id
DELETE /api/orders/:id
GET    /api/orders/stats
GET    /api/exports/csv
```

---

## 🎯 Status Values

```javascript
'Pending Review'   // Order submitted, awaiting approval
'Approved'         // Order approved by outfitter
'In Production'    // Order being manufactured
'Completed'        // Order ready for delivery
```

---

## 🛠️ Common Code Patterns

### Check if Admin
```javascript
if (Auth.isAdmin()) {
  // Show admin features
}
```

### Verify User Access
```javascript
window.onload = function() {
  Auth.requireCustomer();  // Redirects if not customer
}
```

### Save and Show Toast
```javascript
if (StorageManager.set('key', data)) {
  showToast('Saved!', 'success')
} else {
  showToast('Save failed', 'error')
}
```

### Update Order Status
```javascript
OrderManager.update(orderId, {
  status: 'In Production'
})
showToast('Order updated', 'success')
```

### Get Statistics
```javascript
const stats = OrderManager.getStats()
console.log(`Revenue: $${stats.totalRevenue}`)
console.log(`Pending: ${stats.pending}`)
```

---

## 📱 Responsive Breakpoints

| Device | Width | Class |
|--------|-------|-------|
| Mobile | < 640px | `md:` hidden |
| Tablet | 640 - 1024px | Mix of responsive |
| Desktop | > 1024px | Full layout |

---

## 🎨 Color Palette

```css
Primary: #4F46E5 (Indigo)
Success: #10B981 (Green)
Error: #EF4444 (Red)
Warning: #F59E0B (Amber)
Info: #3B82F6 (Blue)

Dark: #1F2937 (Gray-800)
Light: #F9FAFB (Gray-50)
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit login/form |
| `Tab` | Navigate form fields |
| `Escape` | Close modals |
| `Space` | Toggle radio buttons |

---

## 🐛 Debugging Tips

### Check User Role
```javascript
console.log(localStorage.getItem('modelyx_user_role'))
```

### View All Orders
```javascript
console.log(JSON.parse(localStorage.getItem('modelyx_orders')))
```

### Check Storage Usage
```javascript
const used = JSON.stringify(localStorage).length
console.log(`Storage: ${used} bytes`)
```

### Clear Specific Item
```javascript
localStorage.removeItem('modelyx_orders')
```

### Test Form Validation
```javascript
// Open DevTools Console and test:
Validators.email('test@example.com')  // true/false
```

---

## 🚀 Performance Tips

1. **Cache Assets**
   - Service Worker enabled
   - Offline mode supported

2. **Optimize Images**
   - Use SVG for icons
   - Compress photos

3. **Minimize Repaints**
   - Batch DOM updates
   - Use requestAnimationFrame

4. **Code Splitting**
   - Separate utils.js
   - Lazy load if possible

---

## 📖 More Information

**For complete documentation**: See `README.md`
**For feature list**: See `FEATURES.md`
**For changelog**: See `CHANGELOG.md`
**For code examples**: Check HTML comments

---

## 💡 Pro Tips

### Tip 1: Test Admin Features
Use `admin@modelyx.com` to test admin panel immediately

### Tip 2: Export Orders
Click "Export Data" to download CSV for analysis

### Tip 3: Design Auto-Save
Your design is auto-saved every 10 seconds

### Tip 4: Color Accuracy
For best color capture:
- Use good lighting
- Center item in viewfinder
- Avoid glare

### Tip 5: Offline Support
App works offline thanks to service worker!

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera won't open | Check permissions, use HTTPS |
| Data not saving | Check localStorage enabled |
| Can't login | Try admin@modelyx.com |
| Page not responsive | Clear cache, refresh |
| Color inaccurate | Better lighting, center item |

---

## 📞 Getting Help

1. Check console for errors: `F12` → Console tab
2. Review error messages in app
3. Check localStorage: DevTools → Application → Storage
4. Read README.md for detailed guide
5. Check FEATURES.md for feature list

---

**Version**: 3.0
**Last Updated**: May 1, 2026
**Status**: ✅ Production Ready
