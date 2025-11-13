import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Page title mapping for dashboard routes only
// Public pages (/, /about, /contact, /register, /login, /forgot-password) 
// are handled by their individual SEO components
const pageTitles = {
  // Super Admin routes
  '/admin/dashboard': 'Dashboard - Super Admin | Opine India',
  '/admin/add-user': 'Add User - Super Admin | Opine India',
  '/admin/manage-users': 'User Management - Super Admin | Opine India',
  '/admin/manage-companies': 'Company Management - Super Admin | Opine India',
  '/admin/survey-templates': 'Survey Templates - Super Admin | Opine India',
  '/admin/reports': 'Reports & Analytics - Super Admin | Opine India',
  '/admin/settings': 'System Settings - Super Admin | Opine India',
  '/admin/profile': 'Profile Settings - Super Admin | Opine India',
  
  // Company Admin routes
  '/company/dashboard': 'Dashboard - Company Admin | Opine India',
  '/company/team-management': 'Team Management - Company Admin | Opine India',
  '/company/surveys': 'Surveys - Company Admin | Opine India',
  '/company/survey-approvals': 'Survey Approvals - Company Admin | Opine India',
  '/company/document-verification': 'Document Verification - Company Admin | Opine India',
  '/company/performance': 'Performance Monitoring - Company Admin | Opine India',
  '/company/payment-settings': 'Payment Settings - Company Admin | Opine India',
  '/company/account-settings': 'Account Settings - Company Admin | Opine India',
  '/company/profile': 'Profile Settings - Company Admin | Opine India',
  
  // Project Manager routes
  '/project-manager/dashboard': 'Dashboard - Project Manager | Opine India',
  '/project-manager/surveys': 'Survey Management - Project Manager | Opine India',
  '/project-manager/survey-approvals': 'Survey Approvals - Project Manager | Opine India',
  '/project-manager/performance': 'Performance Monitoring - Project Manager | Opine India',
  '/project-manager/payment-settings': 'Payment Settings - Project Manager | Opine India',
  '/project-manager/profile': 'Profile Settings - Project Manager | Opine India',
  
  // Interviewer routes
  '/interviewer/dashboard': 'Dashboard - Interviewer | Opine India',
  '/interviewer/available-surveys': 'Available Interviews - Interviewer | Opine India',
  '/interviewer/my-interviews': 'My Interviews - Interviewer | Opine India',
  '/interviewer/performance': 'Performance Monitoring - Interviewer | Opine India',
  '/interviewer/payments-history': 'Payments History - Interviewer | Opine India',
  '/interviewer/payment-settings': 'Payment Settings - Interviewer | Opine India',
  '/interviewer/profile': 'Profile Settings - Interviewer | Opine India',
  
  // Quality Agent routes
  '/quality-agent/dashboard': 'Dashboard - Quality Agent | Opine India',
  '/quality-agent/available-surveys': 'Available Interviews - Quality Agent | Opine India',
  '/quality-agent/validation-history': 'Validation History - Quality Agent | Opine India',
  '/quality-agent/performance': 'Performance Monitoring - Quality Agent | Opine India',
  '/quality-agent/payments-history': 'Payments History - Quality Agent | Opine India',
  '/quality-agent/payment-settings': 'Payment Settings - Quality Agent | Opine India',
  '/quality-agent/profile': 'Profile Settings - Quality Agent | Opine India',
  
  // Data Analyst routes
  '/data-analyst/dashboard': 'Dashboard - Data Analyst | Opine India',
  '/data-analyst/available-gigs': 'Available Gigs - Data Analyst | Opine India',
  '/data-analyst/my-work': 'My Work - Data Analyst | Opine India',
  '/data-analyst/performance': 'Performance Monitoring - Data Analyst | Opine India',
  '/data-analyst/payments-history': 'Payments History - Data Analyst | Opine India',
  '/data-analyst/payment-settings': 'Payment Settings - Data Analyst | Opine India',
  '/data-analyst/profile': 'Profile Settings - Data Analyst | Opine India',
  
  // Default dashboard
  '/dashboard': 'Dashboard | Opine India'
};

// Custom hook to manage page titles for dashboard routes only
export const usePageTitle = (shouldManageTitle = true) => {
  const location = useLocation();
  
  useEffect(() => {
    // Only apply titles for dashboard routes if shouldManageTitle is true
    // Public pages (/, /about, /contact, etc.) handle their own SEO
    if (shouldManageTitle) {
      const title = pageTitles[location.pathname];
      
      if (title) {
        // Force update the document title for dashboard routes
        document.title = title;
        
        // Also update any existing Helmet title if present
        const existingTitle = document.querySelector('title');
        if (existingTitle) {
          existingTitle.textContent = title;
        }
        
        // Force a re-render of the title element
        const titleElement = document.querySelector('title');
        if (titleElement) {
          titleElement.innerHTML = title;
        }
      }
    }
    // For public pages, let their SEO components handle the title
    
  }, [location.pathname, shouldManageTitle]);
  
  return shouldManageTitle ? (pageTitles[location.pathname] || null) : null;
};

export default usePageTitle;
