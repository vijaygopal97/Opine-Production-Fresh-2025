import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  Users, 
  BarChart3, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Loader, 
  CheckCircle, 
  XCircle,
  UserPlus,
  Brain
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const userTypes = [
  { value: 'project_manager', label: 'Project Manager', icon: <BarChart3 className="w-6 h-6" />, description: 'Creates and manages surveys, assigns interviewers.' },
  { value: 'interviewer', label: 'Interviewer', icon: <User className="w-6 h-6" />, description: 'Conducts field interviews and collects data.' },
  { value: 'quality_agent', label: 'Quality Agent', icon: <Users className="w-6 h-6" />, description: 'Verifies data quality and ensures authenticity.' },
  { value: 'Data_Analyst', label: 'Data Analyst', icon: <Brain className="w-6 h-6" />, description: 'Analyzes survey data and creates professional reports.' },
];

const userStatuses = [
  { value: 'active', label: 'Active', description: 'User can access the platform' },
  { value: 'pending', label: 'Pending', description: 'User needs approval' },
  { value: 'inactive', label: 'Inactive', description: 'User account is disabled' },
  { value: 'suspended', label: 'Suspended', description: 'User account is temporarily suspended' }
];

const AddCompanyUser = ({ onUserCreated }) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'interviewer',
    status: 'active', // Default to active for Company Admin created users
    gig_enabled: false, // Default to false for company users
    // Interview Mode Settings (for Interviewer and Quality Agent users)
    interviewModes: 'Both',
    canSelectMode: false,
  });

  const [formStatus, setFormStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUserTypeChange = (userType) => {
    setFormData(prev => ({
      ...prev,
      userType
    }));
  };

  const validateForm = () => {
    const errors = [];

    // Basic validation
    if (!formData.firstName.trim()) errors.push('First name is required');
    if (!formData.lastName.trim()) errors.push('Last name is required');

    // Name validation
    if (formData.firstName.trim() && formData.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters long');
    }
    if (formData.lastName.trim() && formData.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters long');
    }
    if (!formData.email.trim()) errors.push('Email is required');

    // Email validation
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.push('Please provide a valid email address');
      }
    }
    if (!formData.phone.trim()) errors.push('Phone number is required');

    // Phone number validation
    if (formData.phone.trim()) {
      const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone.trim().replace(/\s+/g, ''))) {
        errors.push('Please provide a valid phone number');
      }
    }
    if (!formData.password) errors.push('Password is required');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match');

    // Password strength validation
    if (formData.password && formData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Check password strength
    if (formData.password) {
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasLowerCase = /[a-z]/.test(formData.password);
      
      if (!hasUpperCase || !hasLowerCase) {
        errors.push('Password must contain at least one uppercase letter and one lowercase letter');
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    
    if (validationErrors.length > 0) {
      // Show validation errors as toast notifications
      validationErrors.forEach(error => {
        showError('Validation Error', error);
      });
      return;
    }

    setFormStatus({ loading: true, success: false, error: null });

    try {
      // Prepare registration data for company user
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim().replace(/\s+/g, ''),
        password: formData.password,
        userType: formData.userType,
        status: formData.status,
        gig_enabled: formData.gig_enabled,
        // No company code needed - backend will automatically assign to current user's company
        companyUser: true // Flag to indicate this is a company user
      };

      // Add interview mode settings for interviewer and quality agent users
      if (formData.userType === 'interviewer') {
        registrationData.interviewModes = formData.interviewModes;
        registrationData.canSelectMode = formData.canSelectMode;
      } else if (formData.userType === 'quality_agent') {
        registrationData.interviewModes = formData.interviewModes;
        // Quality agents don't have canSelectMode option
      }

      const response = await authAPI.registerCompanyUser(registrationData);

      if (response.success) {
        setFormStatus({ loading: false, success: true, error: null });
        showSuccess('Team Member Added!', 'Team member has been added successfully.');
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          userType: 'interviewer',
          status: 'active',
          gig_enabled: false,
          interviewModes: 'Both',
          canSelectMode: false,
        });
        
        // Call callback if provided
        if (onUserCreated) {
          onUserCreated();
        }
      } else {
        const errorMessage = response.message || 'User creation failed';
        setFormStatus({
          loading: false,
          success: false,
          error: errorMessage
        });
        showError('Team Member Creation Failed', errorMessage);
      }
    } catch (error) {
      console.error('Company user creation error:', error);

      let errorMessage = 'User creation failed. Please try again.';

      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors) {
          if (Array.isArray(error.response.data.errors)) {
            errorMessage = error.response.data.errors.map(err => err.message || err).join(', ');
          } else {
            errorMessage = JSON.stringify(error.response.data.errors);
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setFormStatus({
        loading: false,
        success: false,
        error: errorMessage
      });
      showError('Team Member Creation Failed', errorMessage);
    }
  };

  const selectedUserType = userTypes.find(type => type.value === formData.userType);

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Team Member</h1>
        <p className="text-gray-600">Add a new team member to your company</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        {/* Form Status Messages - Now handled by toast notifications */}

        {/* User Type Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Team Member Role</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleUserTypeChange(type.value)}
                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-300
                  ${formData.userType === type.value
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
              >
                <div className={`p-3 rounded-full ${formData.userType === type.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {type.icon}
                </div>
                <span className="mt-3 text-sm font-semibold text-gray-800">{type.label}</span>
                <p className="text-xs text-gray-500 text-center mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Add {selectedUserType?.label} to Your Company
          </h2>

          {/* User Status Selection */}
          <div className="border-t border-gray-200 pt-6 mt-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-800">User Status</h3>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                User Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userStatuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                    className={`flex flex-col items-start p-4 rounded-lg border-2 transition-all duration-300 ${
                      formData.status === status.value
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        status.value === 'active' ? 'bg-green-500' :
                        status.value === 'pending' ? 'bg-yellow-500' :
                        status.value === 'inactive' ? 'bg-gray-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-semibold text-gray-800">{status.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 text-left">{status.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gig Feature Section - Only for Interviewer, Quality Agent, and Data Analyst */}
          {['interviewer', 'quality_agent', 'Data_Analyst'].includes(formData.userType) && (
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-800">Gig Work Feature</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="gig_enabled"
                    name="gig_enabled"
                    checked={formData.gig_enabled}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="gig_enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Enable Gig Feature
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Allow this team member to participate in gig work opportunities. 
                      This enables them to take on additional projects beyond their regular company assignments.
                    </p>
                    <div className="mt-2 text-xs text-blue-700">
                      <strong>Note:</strong> When enabled, the team member can later choose to make themselves available for gig work in their profile settings.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interview Mode Settings (for Interviewer and Quality Agent users) */}
          {(formData.userType === 'interviewer' || formData.userType === 'quality_agent') && (
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-800">Interview Mode Settings</h3>
              
              {/* Interview Modes Dropdown */}
              <div>
                <label htmlFor="interviewModes" className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Modes <span className="text-red-500">*</span>
                </label>
                <select
                  id="interviewModes"
                  name="interviewModes"
                  value={formData.interviewModes}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="CAPI (Face To Face)">CAPI (Face To Face)</option>
                  <option value="CATI (Telephonic interview)">CATI (Telephonic interview)</option>
                  <option value="Both">Both</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Select the interview modes this {formData.userType === 'interviewer' ? 'interviewer' : 'quality agent'} can perform.
                </p>
              </div>

              {/* Can Select Mode Checkbox - Only for Interviewer users */}
              {formData.userType === 'interviewer' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="canSelectMode"
                      name="canSelectMode"
                      checked={formData.canSelectMode}
                      onChange={handleChange}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="canSelectMode" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Enable Interviewer to Select Mode
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Allow this interviewer to change their interview modes in their profile settings. 
                        If unchecked, the interviewer will be locked to the selected mode above.
                      </p>
                      <div className="mt-2 text-xs text-green-700">
                        <strong>Note:</strong> When enabled, the interviewer can later choose their preferred interview modes in their profile settings.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Personal Information */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Doe"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="john.doe@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="+91 98765 43210"
              required
            />
          </div>

          {/* Password Fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with 1 uppercase and 1 lowercase letter
              </p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md flex items-center justify-center"
            disabled={formStatus.loading}
          >
            {formStatus.loading ? (
              <>
                <Loader className="w-5 h-5 mr-3 animate-spin" />
                Adding Team Member...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-3" />
                Add Team Member
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
};

export default AddCompanyUser;




