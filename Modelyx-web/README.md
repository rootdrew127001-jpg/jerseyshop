# 🎨 MODELYX - AI-Powered Athletic Wear Design Platform

A modern web application for designing custom athletic wear using AI color matching and 3D visualization.

## 📋 Project Overview

MODELYX is a full-stack web platform that enables:
- **Customers** to design custom jerseys using AI color extraction
- **Outfitters** to manage orders, approvals, and production tracking
- **Real-time collaboration** with Color DNA technology
- **Professional 3D jersey visualization** with customizable patterns and materials

---

## 🚀 Features

### For Customers
- ✨ **AI Color DNA Scanner** - Capture exact colors from physical items
- 🎨 **3D Jersey Designer** - Front/back view customization
- 👕 **Material Selection** - Choose between Matte Poly, Pro Mesh, Dry-Fit
- 🔤 **Personalization** - Add team names, player numbers, emblems
- 💾 **Auto-Save** - Designs saved in real-time

### For Outfitters (Admins)
- 📊 **Order Dashboard** - View all customer submissions
- ✅ **Status Management** - Track orders through pipeline
- 💰 **Revenue Analytics** - Real-time profit forecasting
- 📤 **Export Data** - Download orders as CSV
- 🔔 **Live Notifications** - Instant order updates

### Platform Features
- 🔐 **Secure Authentication** - Email/password login with role-based access
- 📱 **Fully Responsive** - Works on desktop, tablet, mobile
- 🌐 **PWA Ready** - Offline capability with service worker
- ♿ **Accessibility** - WCAG compliant with ARIA labels
- 🎯 **Real-time Validation** - Instant form feedback

---

## 📁 File Structure

```
Modelyx-web/
├── index.html          # Auth page (Login/Register)
├── dashboard.html      # Customer workspace with color scanner
├── editor.html         # 3D Jersey designer
├── admin.html          # Outfitter management portal
├── utils.js            # Shared utilities & helpers
├── sw.js               # Service worker for PWA
└── README.md           # This file
```

---

## 🔑 Key Technologies

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **State Management**: localStorage (JSON-based)
- **Visualization**: SVG for jersey rendering
- **APIs**: Web Camera API, Canvas API, LocalStorage API
- **Styling**: Tailwind CSS v3

---

## 👤 User Roles & Access

### Customer Role
- **Email**: Any email (without 'admin' or 'owner')
- **Access**: Dashboard → Designer
- **Can do**: Design jerseys, submit orders

### Outfitter/Admin Role
- **Email**: Contains 'admin', 'owner', or use `admin@modelyx.com`
- **Access**: Admin Panel
- **Can do**: Approve orders, manage production, view analytics

---

## 🔐 Authentication

### Demo Credentials
```
Login as Customer:
- Email: coach@team.com
- Password: anything (min 6 chars)

Login as Outfitter:
- Email: admin@modelyx.com
- Password: anything (min 6 chars)
```

### Registration
1. Click "Register" tab
2. Fill in name, email, phone (optional)
3. Set password (min 6 characters)
4. Choose role (Customer or Outfitter)
5. Click "Create My Profile"

---

## 📊 Data Structure

### Order Object
```javascript
{
    id: "ORD-ABC123XYZ",
    customer: "Coach Morgan",
    email: "coach@tigers.com",
    team: "Tigers",
    number: "23",
    color: "#4F46E5",
    fabric: "Dry-Fit Pro ($65)",
    price: "$65.00",
    status: "Pending Review",
    date: "5/1/2026",
    createdAt: "2026-05-01T10:30:00Z"
}
```

### User Object
```javascript
{
    name: "Coach Morgan",
    email: "coach@tigers.com",
    phone: "+63 9000000000",
    role: "customer" | "owner"
}
```

---

## 🎮 How to Use

### As a Customer

1. **Register/Login**
   - Go to `index.html`
   - Register as a Customer
   - Login with your credentials

2. **Scan Color DNA**
   - Click "Launch Scanner" on Dashboard
   - Point camera at item to match
   - Click "Capture DNA" to extract color
   - Click "Apply & Design" to continue

3. **Design Jersey**
   - Go to Editor page
   - Enter team name and player number
   - Select material (Matte Poly, Pro Mesh)
   - Choose design pattern (Solid, Stripes)
   - Select fabric tech option
   - Toggle front/back views
   - View live preview with price

4. **Submit Order**
   - Click "Submit Design"
   - Order appears in Outfitter's admin panel
   - Track status in dashboard

### As an Outfitter

1. **Login to Admin Panel**
   - Use admin email (contains 'admin' or 'owner')
   - Navigate to Admin Panel

2. **View Orders**
   - See all customer submissions
   - View color DNA (with hex code)
   - Check pricing and details

3. **Manage Orders**
   - Change status: Pending → Approved → In Production → Completed
   - View customer contact info
   - Delete if needed

4. **Analytics**
   - Monitor incoming requests count
   - Track revenue forecast
   - See production pipeline status

5. **Export Data**
   - Click "Export Data" button
   - Downloads CSV file with all orders

---

## 🛠️ Setup & Installation

### Option 1: Direct Browser
```bash
# Simply open index.html in a modern web browser
# All data is stored in browser's localStorage
```

### Option 2: Local Server
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (http-server)
npm install -g http-server
http-server

# Open: http://localhost:8000
```

### Option 3: VS Code
```bash
# Install Live Server extension
# Right-click index.html → Open with Live Server
```

---

## 📱 Responsive Design

| Device | Support |
|--------|---------|
| Desktop (1920px+) | ✅ Full features |
| Tablet (768px+) | ✅ Optimized layout |
| Mobile (320px+) | ✅ Touch-friendly |
| Camera Input | ✅ Mobile camera support |

---

## 🔒 Security Considerations

⚠️ **Development Warning**: This demo uses localStorage for authentication.

**For Production**:
1. Use backend authentication (OAuth, JWT)
2. Hash passwords with bcrypt
3. Use HTTPS only
4. Implement CSRF protection
5. Add rate limiting
6. Validate on backend

---

## 💾 Data Persistence

### Storage Method
- **localStorage**: User profiles, orders, color data
- **sessionStorage**: Temporary design drafts
- **No backend**: All data stored locally in browser

### Data Clearing
```javascript
// Clear all data
localStorage.clear();
sessionStorage.clear();

// Clear specific keys
localStorage.removeItem('modelyx_orders');
```

---

## 🎨 Customization

### Change Brand Colors
Edit Tailwind color in relevant files (currently using Indigo #4F46E5)

### Add New Materials
In `editor.html`, modify the material selection:
```html
<button onclick="setMaterial('satin')" class="...">
    <span>Satin</span>
</button>
```

### Modify Pricing
In `editor.html`, update fabric prices:
```html
<select id="fabricType">
    <option value="50">Standard Poly ($50)</option>
    <option value="75">Premium ($75)</option>
</select>
```

---

## 🐛 Troubleshooting

### Camera Not Working
- Check browser permissions
- Use HTTPS (required for camera API)
- Try different browser

### Data Not Saving
- Check if localStorage is enabled
- Check browser storage limits
- Clear cache and reload

### Color Picker Not Accurate
- Ensure good lighting
- Center item in viewfinder
- Try multiple captures

---

## 📈 Performance Optimization

✅ **Implemented**:
- Lazy loading images
- CSS minification with Tailwind
- Efficient SVG rendering
- Service worker caching
- Auto-save debouncing

---

## 🤝 Contributing

To enhance MODELYX:

1. Add backend API integration
2. Implement real authentication
3. Add payment processing
4. Enhance 3D jersey models
5. Add order tracking emails
6. Mobile app version

---

## 📞 Support

### Common Issues

**Q: Can I use this without internet?**
A: Yes! After first load, service worker caches all assets.

**Q: How do I delete my account?**
A: Currently manual. Contact support or clear localStorage.

**Q: Can I change my role after registration?**
A: Yes, register a new account with the different role.

---

## 📜 License

MODELYX © 2026. All rights reserved.

---

## 🎯 Roadmap

- [ ] Backend API integration
- [ ] Payment gateway (Stripe)
- [ ] Email confirmations
- [ ] Order tracking via SMS
- [ ] Advanced 3D models
- [ ] Team collaboration features
- [ ] Mobile app
- [ ] Real-time chat support

---

## 🚀 Version History

**v3.0** (Current)
- Complete code fixes and improvements
- Enhanced form validation
- Admin order management
- Export functionality
- PWA support
- Better accessibility

**v2.0**
- 3D jersey designer
- Material selection
- Color DNA integration

**v1.0**
- Initial release
- Auth system
- Basic dashboard

---

## ✨ Credits

**Designed & Built**: MODELYX Team
**Styling**: Tailwind CSS
**Fonts**: Inter by Rasmus Andersson

---

**Last Updated**: May 1, 2026
**Status**: Active Development ✅



cd ~/Modelyx-web
venv modelyx-api/venv
source modelyx-api/venv/bin/activate
pip install -r modelyx-api/requirements.txt




powershell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1
