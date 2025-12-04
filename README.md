# Finance Personal Tracker

A modern, responsive web application for personal finance management built with vanilla JavaScript and Firebase.

## Features

###  Authentication
- Email/Password registration and login
- Google OAuth integration
- Secure user sessions with Firebase Auth

###  Transaction Management
- Add, edit, delete transactions
- Income and expense tracking
- Category-based organization
- Date-based filtering

###  Analytics & Insights
- Interactive charts (pie charts, bar charts)
- Monthly spending analysis
- Category-wise breakdowns
- Savings rate calculation

###  Settings & Customization
- Multi-currency support (USD, EUR, GBP, RWF)
- Password change functionality
- Data export to CSV
- User profile management

###  Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Modern UI with smooth animations
- Cross-device compatibility

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase (Auth, Firestore)
- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Styling**: Custom CSS with CSS Grid/Flexbox

## Quick Start

### Prerequisites
- Modern web browser
- Internet connection
- Firebase project (optional for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone `https://github.com/Trtheo/finance-tracer.git`
   cd capstone_project_klab
   ```

2. **Open with Live Server**
   - Use VS Code Live Server extension
   - Or any local web server
   - Navigate to `index.html`

3. **Firebase Setup (Optional)**
   - Create Firebase project
   - Enable Authentication (Email/Password, Google)
   - Create Firestore database
   - Update `firebase-config.js` with your config

## File Structure

```
├── index.html              # Authentication page
├── dashboard.html          # Main dashboard
├── transactions.html       # Transaction management
├── analytics.html          # Charts and analytics
├── settings.html          # User settings
├── style.css              # Main styles
├── auth.css               # Authentication styles
├── modal.css              # Modal components
├── validation.css         # Form validation styles
├── auth.js                # Authentication logic
├── app.js                 # Dashboard functionality
├── transactions.js        # Transaction CRUD operations
├── analytics.js           # Charts and calculations
├── settings.js            # Settings management
├── utils.js               # Utility functions
├── cache.js               # Caching system
└── firebase-config.js     # Firebase configuration
```

## Usage

### Getting Started
1. Open the application
2. Create account or sign in with Google
3. Start adding transactions
4. View analytics and insights

### Adding Transactions
- Click "Add Transaction" button
- Fill in description, amount, category, date
- Select income or expense type
- Save to database

### Viewing Analytics
- Navigate to Analytics page
- View spending by category (pie chart)
- Check monthly expense trends (bar chart)
- Monitor savings rate and averages

### Managing Settings
- Change currency preference
- Update password
- Export transaction data
- Toggle notifications

## Features in Detail

### Currency Support
- Automatic formatting based on user preference
- Real-time updates across all pages
- Supports major currencies with proper symbols

### Data Security
- User data isolation by Firebase UID
- Secure authentication with Firebase Auth
- Client-side validation and server-side security rules

### Performance Optimization
- Transaction caching system (30-second cache)
- Lazy loading with pagination
- Optimized database queries with limits

### Responsive Design
- Mobile-first CSS approach
- Touch-friendly buttons and inputs
- Adaptive layouts for all screen sizes

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please visit us at    **https://visittheo.vercel.app**

---

**Built with ❤️ for better financial management**