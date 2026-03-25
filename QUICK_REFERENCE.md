# Quick Reference Guide - File Locations & Usage

## Controllers

### 1. blockchainController.js
**Path:** `/controllers/blockchainController.js`
**Usage:** `import { getBlockchainStats, showBlockchainDashboard, ... } from '../controllers/blockchainController.js';`
**Functions:** 9 key functions for blockchain management

### 2. auditController.js
**Path:** `/controllers/auditController.js`
**Usage:** `import { listAuditLogs, viewAuditLog, ... } from '../controllers/auditController.js';`
**Functions:** 8 key functions for audit management

### 3. bidSubmissionController.js (Enhanced)
**Path:** `/controllers/bidSubmissionController.js`
**Status:** Already exists, fully implemented
**Functions:** 6 key functions for bid submission

### 4. bidEvaluationController.js (Enhanced)
**Path:** `/controllers/bidEvaluationController.js`
**Status:** Already exists, fully implemented
**Functions:** 6 key functions for bid evaluation

### 5. awardController.js (Enhanced)
**Path:** `/controllers/awardController.js`
**Status:** Already exists, fully implemented
**Functions:** 7 key functions for award management

---

## Middleware

### 1. csrfMiddleware.js
**Path:** `/middleware/csrfMiddleware.js`
**Usage in main app:**
```javascript
import { csrfProtection, verifyCSRFToken } from './middleware/csrfMiddleware.js';
app.use(csrfProtection);
app.use(verifyCSRFToken);
```

### 2. validationMiddleware.js
**Path:** `/middleware/validationMiddleware.js`
**Usage in routes:**
```javascript
import { validateBidSubmission, validateBidEvaluation } from './middleware/validationMiddleware.js';
router.post('/path', validateBidSubmission, controllerFunction);
```

### 3. rateLimitMiddleware.js
**Path:** `/middleware/rateLimitMiddleware.js`
**Usage in main app:**
```javascript
import { globalRateLimiter, loginRateLimiter } from './middleware/rateLimitMiddleware.js';
app.use(globalRateLimiter);
app.post('/login', loginRateLimiter, loginHandler);
```

---

## Views - Absolute Paths

### Bidder Views
1. **submit-bid.xian** - `/views/bidder/submit-bid.xian`
2. **my-bids.xian** - `/views/bidder/my-bids.xian`
3. **bid-detail.xian** - `/views/bidder/bid-detail.xian`

### Admin Views
1. **bid-evaluation-form.xian** - `/views/admin/bid-evaluation-form.xian`
2. **bids-list.xian** - `/views/admin/bids-list.xian`
3. **awards-list.xian** - `/views/admin/awards-list.xian`
4. **blockchain-dashboard.xian** - `/views/admin/blockchain-dashboard.xian`
5. **audit-logs.xian** - `/views/admin/audit-logs.xian`
6. **blockchain-explorer.xian** - `/views/admin/blockchain-explorer.xian`

---

## Helpers

### handlersHelpers.js
**Path:** `/helpers/handlersHelpers.js`
**Usage in main app:**
```javascript
import registerHelpers from './helpers/handlersHelpers.js';
registerHelpers(hbs);
```
**Provides:** 20+ Handlebars helper functions

---

## Migration Scripts

### migrate-blockchain.js
**Path:** `/migrate-blockchain.js`
**Usage:** `node migrate-blockchain.js`
**Purpose:** Initialize blockchain with genesis block

---

## Updated Routes

**Path:** `/routes/index.js`
**Status:** Updated with new endpoint definitions
**New Routes Added:** 16 routes across blockchain and audit modules

---

## Documentation

### Implementation Guide
**Path:** `/IMPLEMENTATION_GUIDE.md`
**Contents:**
- Detailed controller descriptions
- Middleware configuration
- View details
- Integration setup
- Security features
- Testing checklist

### Completion Summary
**Path:** `/COMPLETION_SUMMARY.md`
**Contents:**
- Project completion status
- What was created
- Key features
- Integration instructions
- Testing checklist
- Production readiness

### Quick Reference (This File)
**Path:** `/QUICK_REFERENCE.md`
**Contents:** File locations and usage examples

---

## Integration Checklist

### Step 1: Update Main App (index.js)
```javascript
// Add imports
import { csrfProtection, verifyCSRFToken } from './middleware/csrfMiddleware.js';
import { globalRateLimiter, loginRateLimiter } from './middleware/rateLimitMiddleware.js';
import { sanitizeInput, preventXSS } from './middleware/validationMiddleware.js';
import registerHelpers from './helpers/handlersHelpers.js';

// Add middleware (in correct order)
app.use(globalRateLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({ ... }));
app.use(csrfProtection);
app.use(verifyCSRFToken);
app.use(sanitizeInput);
app.use(preventXSS);

// Register Handlebars helpers
registerHelpers(hbs);
```

### Step 2: Run Migrations
```bash
npm run migrate
npm run migrate:rework
node migrate-blockchain.js
```

### Step 3: Test Routes
```bash
npm start
# Visit http://localhost:3000/admin/blockchain/dashboard
# Visit http://localhost:3000/audit/logs
```

---

## Common Patterns

### Adding CSRF Token to Forms
```html
<form method="POST" action="/path">
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  <!-- form fields -->
</form>
```

### Using Validation Middleware
```javascript
import { validateBidSubmission } from './middleware/validationMiddleware.js';

router.post('/submit-bid', validateBidSubmission, submitBidController);
```

### Using Rate Limiters
```javascript
import { loginRateLimiter } from './middleware/rateLimitMiddleware.js';

router.post('/login', loginRateLimiter, loginHandler);
```

### Using Handlebars Helpers
```html
<p>{{formatCurrency bid.amount}}</p>
<p>{{formatDate bid.submission_date}}</p>
<p>{{#if (eq status 'approved')}}Approved{{/if}}</p>
```

---

## Key Files Modified

1. **routes/index.js** - Added 16 new routes for blockchain and audit
2. **No other files were modified** - All new functionality in separate files

---

## Database Models Used (Existing)

1. BidSubmission
2. BidEvaluation
3. NoticeOfAward
4. Contract
5. BlockchainBlock
6. BlockchainTransaction
7. BlockchainState
8. AuditLog
9. DocumentMetadata

All models already exist in the database schema.

---

## Environment Variables Recommended

```
# Security
CSRF_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage
UPLOAD_DIR=/uploads
MAX_FILE_SIZE=10485760

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=procurement_system
DB_USER=root
DB_PASS=password

# Redis (for production)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=
```

---

## Troubleshooting

### Issue: CSRF token validation failing
**Solution:** Ensure `csrfProtection` middleware is applied before routes

### Issue: Rate limiting too strict
**Solution:** Adjust rate limit values in `rateLimitMiddleware.js`

### Issue: Handlebars helpers not working
**Solution:** Ensure `registerHelpers()` is called with hbs instance

### Issue: Validation not working
**Solution:** Ensure validation middleware is applied to routes

### Issue: Blockchain verification failing
**Solution:** Run `node migrate-blockchain.js` to initialize blockchain

---

## Performance Tips

1. **Pagination:** Always use pagination for large datasets
2. **Filtering:** Use database indexes on filtered columns
3. **Caching:** Cache blockchain state updates
4. **Rate Limiting:** Adjust limits based on expected usage
5. **Database:** Vacuum and analyze tables regularly

---

## Security Reminders

1. Always use CSRF tokens on forms
2. Never trust user input - always validate
3. Always sanitize input before using
4. Use HTTPS in production
5. Keep dependencies updated
6. Use strong passwords and secrets
7. Monitor audit logs regularly
8. Test authentication thoroughly

---

## Deployment Steps

1. Update environment variables
2. Run database migrations
3. Build application
4. Test all endpoints
5. Set up SSL/TLS
6. Configure backups
7. Set up monitoring
8. Deploy to production

---

## Support Resources

- IMPLEMENTATION_GUIDE.md - Comprehensive documentation
- COMPLETION_SUMMARY.md - Project summary and status
- Models documentation - See model files for schema
- Controller documentation - See controller files for function signatures
- Middleware documentation - See middleware files for configuration

---

**Last Updated:** March 25, 2026
**Status:** All systems operational
**Ready for:** Integration testing and deployment
