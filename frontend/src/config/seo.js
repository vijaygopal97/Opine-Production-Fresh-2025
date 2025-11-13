// SEO Configuration for Opine India
export const SEO_CONFIG = {
  // Default SEO settings
  default: {
    title: "Opine India - Professional Market Research Platform",
    description: "Opine India is a leading multi-tenant platform for market research companies to conduct high-quality field interviews through verified gig workers with data security and privacy protection.",
    keywords: "market research, field interviews, data collection, survey platform, gig workers, India market research",
    author: "Opine India",
    robots: "noindex, nofollow", // Default to no indexing during development
    canonical: "https://opineindia.com",
    ogType: "website",
    ogImage: "https://opineindia.com/og-image.jpg",
    twitterCard: "summary_large_image",
    twitterSite: "@OpineIndia"
  },

  // Route-specific SEO settings
  routes: {
    "/": {
      title: "Opine India - Professional Market Research & Field Interview Platform",
      description: "Transform your market research with Opine India's multi-tenant platform. Connect with verified gig workers for high-quality field interviews across India. Secure, scalable, and professional data collection solutions.",
      keywords: "market research India, field interviews, data collection platform, survey research, gig economy, market research companies, professional interviewers",
      canonical: "https://opineindia.com",
      ogTitle: "Opine India - Professional Market Research Platform",
      ogDescription: "Connect with verified gig workers for high-quality field interviews. Secure, scalable market research solutions across India.",
    },
    
    "/about": {
      title: "About Opine India - Leading Market Research Platform",
      description: "Learn about Opine India's mission to revolutionize market research through our innovative multi-tenant platform connecting companies with verified field interviewers across India.",
      keywords: "about Opine India, market research platform, company information, field interview services",
      canonical: "https://opineindia.com/about"
    },
    
    "/contact": {
      title: "Contact Us - Opine India | Get in Touch",
      description: "Contact Opine India for inquiries, support, or partnership opportunities. Reach out to our team for market research solutions and field interview services. We respond within 24 hours.",
      keywords: "contact Opine India, market research support, partnership, customer service, get in touch, contact form",
      canonical: "https://opineindia.com/contact",
      ogTitle: "Contact Opine India - Market Research Solutions",
      ogDescription: "Get in touch with Opine India for market research solutions, partnerships, and support. We're here to help transform your research needs."
    },
    
    "/register": {
      title: "Register with Opine India - Join Our Market Research Platform",
      description: "Join Opine India's network of professional market researchers and field interviewers. Register today to access high-quality research opportunities across India.",
      keywords: "register Opine India, join market research, field interviewer registration, gig worker platform",
      canonical: "https://opineindia.com/register"
    },
    "/login": {
      title: "Login - Opine India | Access Your Account",
      description: "Login to your Opine India account to manage your market research projects or interviewer tasks. Secure access to your dashboard.",
      keywords: "login, sign in, Opine India account, market research login, interviewer login",
      canonical: "https://opineindia.com/login"
    }
  }
};

// Helper function to get robots meta tag based on environment
export const getRobotsMeta = () => {
  const enableIndexing = import.meta.env.VITE_ENABLE_SEO_INDEXING === 'true';
  return enableIndexing ? "index, follow" : "noindex, nofollow";
};

// Helper function to get SEO config for a specific route
export const getSEOConfig = (pathname) => {
  const routeConfig = SEO_CONFIG.routes[pathname] || {};
  return {
    ...SEO_CONFIG.default,
    ...routeConfig,
    robots: getRobotsMeta() // Override robots based on environment
  };
};

// Helper function to generate structured data
export const generateStructuredData = (config) => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Opine India",
    "description": config.description,
    "url": config.canonical,
    "logo": "https://opineindia.com/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-XXXX-XXXXXX",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi"]
    },
    "sameAs": [
      "https://www.linkedin.com/company/opine-india",
      "https://twitter.com/OpineIndia"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN",
      "addressLocality": "Mumbai",
      "addressRegion": "Maharashtra"
    }
  };
};
