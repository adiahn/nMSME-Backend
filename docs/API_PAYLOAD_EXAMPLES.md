# 📋 API Payload Examples - Application Creation

## 🎯 **ENDPOINT 1: Original Application Creation (No Documents)**

### **POST /api/applications**

**Purpose:** Create application without documents (documents uploaded separately)

---

### **📤 REQUEST BODY (JSON)**

```json
{
  "business_name": "Adnan Tech Solutions",
  "cac_number": "202020",
  "sector": "Information Technology (IT)",
  "msme_strata": "micro",
  "location": {
    "state": "katsina",
    "lga": "Katsina"
  },
  "year_established": 2025,
  "employee_count": 20,
  "revenue_band": "₦100,000 - ₦500,000/month",
  "business_description": "We provide innovative technology solutions for small businesses, specializing in web development, mobile apps, and digital transformation services.",
  "website": "https://adnantech.com",
  "social_media": {
    "facebook": "https://facebook.com/adnantech",
    "twitter": "https://twitter.com/adnantech",
    "linkedin": "https://linkedin.com/company/adnantech",
    "instagram": "https://instagram.com/adnantech"
  },
  "category": "Information Technology (IT)",
  "key_achievements": "Successfully developed 50+ websites and mobile apps for local businesses, increased client revenue by 200% on average, and created 20 full-time jobs in the community.",
  "products_services_description": "Our services include custom website development, mobile app development, e-commerce solutions, digital marketing, and IT consulting. We specialize in creating user-friendly, scalable solutions that drive business growth.",
  "jobs_created": 20,
  "women_youth_percentage": 30,
  "export_activity": {
    "has_exports": false,
    "export_details": ""
  },
  "sustainability_initiatives": {
    "has_initiatives": true,
    "initiative_details": "We implement green hosting solutions, use energy-efficient equipment, and promote remote work to reduce carbon footprint."
  },
  "award_usage_plans": "If awarded, we plan to expand our operations by hiring 10 additional developers, investing in advanced technology infrastructure, and launching a training program for youth in tech skills.",
  "pitch_video": {
    "url": "https://www.youtube.com/watch?v=WhZGTO7Gk_E",
    "platform": "youtube"
  }
}
```

---

### **📥 RESPONSE (Success - 201 Created)**

```json
{
  "success": true,
  "message": "Application created successfully",
  "data": {
    "application_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "workflow_stage": "submitted"
  }
}
```

---

### **📥 RESPONSE (Error - 400 Bad Request)**

```json
{
  "success": false,
  "error": "You already have an application in this category"
}
```

---

## 🎯 **ENDPOINT 2: Comprehensive Application Creation (With Documents)**

### **POST /api/applications/complete**

**Purpose:** Create application with documents in single atomic transaction

---

### **📤 REQUEST BODY (Multipart Form Data)**

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN
```

**Form Data Fields:**

```javascript
// Application Data (JSON fields)
business_name: "Adnan Tech Solutions"
cac_number: "202020"
sector: "Information Technology (IT)"
msme_strata: "micro"
location[state]: "katsina"
location[lga]: "Katsina"
year_established: 2025
employee_count: 20
revenue_band: "₦100,000 - ₦500,000/month"
business_description: "We provide innovative technology solutions for small businesses, specializing in web development, mobile apps, and digital transformation services."
website: "https://adnantech.com"
social_media[facebook]: "https://facebook.com/adnantech"
social_media[twitter]: "https://twitter.com/adnantech"
social_media[linkedin]: "https://linkedin.com/company/adnantech"
social_media[instagram]: "https://instagram.com/adnantech"
category: "Information Technology (IT)"
key_achievements: "Successfully developed 50+ websites and mobile apps for local businesses, increased client revenue by 200% on average, and created 20 full-time jobs in the community."
products_services_description: "Our services include custom website development, mobile app development, e-commerce solutions, digital marketing, and IT consulting. We specialize in creating user-friendly, scalable solutions that drive business growth."
jobs_created: 20
women_youth_percentage: 30
export_activity[has_exports]: false
export_activity[export_details]: ""
sustainability_initiatives[has_initiatives]: true
sustainability_initiatives[initiative_details]: "We implement green hosting solutions, use energy-efficient equipment, and promote remote work to reduce carbon footprint."
award_usage_plans: "If awarded, we plan to expand our operations by hiring 10 additional developers, investing in advanced technology infrastructure, and launching a training program for youth in tech skills."
pitch_video[url]: "https://www.youtube.com/watch?v=WhZGTO7Gk_E"
pitch_video[platform]: "youtube"

// Document Files (Binary)
cac_certificate: [File] // CAC registration certificate (PDF/DOC/DOCX)
tax_identification: [File] // Tax identification document (PDF/DOC/DOCX)
product_photos: [File1, File2, File3] // Product/service photos (JPEG/PNG) - Up to 5
business_plan: [File] // Business plan document (PDF/DOC/DOCX)
financial_statements: [File] // Financial statements (PDF/DOC/DOCX)
other_documents: [File1, File2] // Other supporting documents (PDF/DOC/DOCX) - Up to 3
```

---

### **📥 RESPONSE (Success - 201 Created)**

```json
{
  "success": true,
  "message": "Application created successfully with documents",
  "data": {
    "application_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "workflow_stage": "submitted",
    "documents_uploaded": 6,
    "total_documents": 6
  }
}
```

---

### **📥 RESPONSE (Error - 400 Bad Request)**

```json
{
  "success": false,
  "error": "You already have an application in this category"
}
```

---

### **📥 RESPONSE (Error - 400 Bad Request - File Validation)**

```json
{
  "success": false,
  "error": "Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed."
}
```

---

## 🔧 **FRONTEND IMPLEMENTATION EXAMPLES**

### **JavaScript/React Example (Original Endpoint)**

```javascript
// Create application without documents
const createApplication = async (applicationData) => {
  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(applicationData)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Application created:', data);
      return data.data.application_id;
    } else {
      console.error('Application creation failed:', data);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
const applicationData = {
  business_name: "Adnan Tech Solutions",
  cac_number: "202020",
  // ... rest of the data
};

const applicationId = await createApplication(applicationData);
```

### **JavaScript/React Example (Comprehensive Endpoint)**

```javascript
// Create application with documents
const createCompleteApplication = async (applicationData, documents) => {
  try {
    const formData = new FormData();

    // Add application data
    Object.keys(applicationData).forEach(key => {
      if (typeof applicationData[key] === 'object') {
        // Handle nested objects like location, social_media, etc.
        Object.keys(applicationData[key]).forEach(nestedKey => {
          formData.append(`${key}[${nestedKey}]`, applicationData[key][nestedKey]);
        });
      } else {
        formData.append(key, applicationData[key]);
      }
    });

    // Add document files
    if (documents.cac_certificate) {
      formData.append('cac_certificate', documents.cac_certificate);
    }
    if (documents.tax_identification) {
      formData.append('tax_identification', documents.tax_identification);
    }
    if (documents.product_photos && documents.product_photos.length > 0) {
      documents.product_photos.forEach(photo => {
        formData.append('product_photos', photo);
      });
    }
    if (documents.business_plan) {
      formData.append('business_plan', documents.business_plan);
    }
    if (documents.financial_statements) {
      formData.append('financial_statements', documents.financial_statements);
    }
    if (documents.other_documents && documents.other_documents.length > 0) {
      documents.other_documents.forEach(doc => {
        formData.append('other_documents', doc);
      });
    }

    const response = await fetch('/api/applications/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Application created with documents:', data);
      return data.data.application_id;
    } else {
      console.error('Application creation failed:', data);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
const applicationData = {
  business_name: "Adnan Tech Solutions",
  cac_number: "202020",
  // ... rest of the data
};

const documents = {
  cac_certificate: cacFile,
  product_photos: [photo1, photo2, photo3],
  business_plan: businessPlanFile,
  // ... other documents
};

const applicationId = await createCompleteApplication(applicationData, documents);
```

---

## 📋 **FIELD VALIDATION RULES**

### **Required Fields:**
- `business_name` (string, not empty)
- `cac_number` (string, not empty)
- `sector` (must be one of the predefined values)
- `msme_strata` (must be: nano, micro, small, medium)
- `location.state` (string, not empty)
- `location.lga` (string, not empty)
- `year_established` (integer, 1900 to current year + 1)
- `employee_count` (integer, minimum 1)
- `revenue_band` (must be one of the predefined values)
- `business_description` (string, 10-500 characters)
- `category` (must be one of the predefined values)
- `key_achievements` (string, 10-300 characters)
- `products_services_description` (string, not empty)
- `jobs_created` (integer, minimum 0)
- `women_youth_percentage` (float, 0-100)
- `export_activity.has_exports` (boolean)
- `sustainability_initiatives.has_initiatives` (boolean)
- `award_usage_plans` (string, not empty)
- `pitch_video.url` (valid URL)
- `pitch_video.platform` (must be: youtube, vimeo)

### **Optional Fields:**
- `website` (string)
- `social_media` (object with facebook, twitter, linkedin, instagram)
- `export_activity.export_details` (string, required if has_exports is true)
- `sustainability_initiatives.initiative_details` (string, required if has_initiatives is true)

### **Document Requirements:**
- **File Types:** JPEG, PNG, PDF, DOC, DOCX
- **File Size:** Maximum 10MB per file
- **Total Files:** Up to 12 files (5 product photos + 7 other documents)

---

## 🚨 **IMPORTANT NOTES**

1. **Use the comprehensive endpoint** (`/api/applications/complete`) to avoid incomplete applications
2. **All file uploads are optional** but recommended for complete applications
3. **The original endpoint** (`/api/applications`) is kept for backward compatibility
4. **Both endpoints** return the same application structure
5. **Error handling** should be implemented for both network and validation errors
