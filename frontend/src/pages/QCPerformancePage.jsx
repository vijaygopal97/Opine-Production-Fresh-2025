import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Filter, 
  Download, 
  Search,
  Calendar,
  ChevronUp,
  ChevronDown,
  X,
  TrendingUp,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { performanceAPI, surveyAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const QCPerformancePage = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [qualityAgents, setQualityAgents] = useState([]);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    sortBy: 'totalReviews', // totalReviews, approvedResponses, rejectedResponses
    sortOrder: 'desc' // asc, desc
  });

  const [showFilters, setShowFilters] = useState(true);

  // Add CSS to ensure full width (must be before any conditional returns)
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .qc-performance-page {
        width: 100vw !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .qc-performance-page * {
        max-width: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Fetch survey and QC performance data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch survey details
      const surveyResponse = await surveyAPI.getSurvey(surveyId);
      if (surveyResponse.success) {
        setSurvey(surveyResponse.data.survey || surveyResponse.data);
      }
      
      // Fetch QC performance data
      const params = {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search })
      };
      
      // Fetch both QC performance and trends data in parallel
      const [qcResponse, trendsResponse] = await Promise.all([
        performanceAPI.getQCPerformanceBySurvey(surveyId, params),
        performanceAPI.getQCPerformanceTrends(surveyId, {
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate })
        })
      ]);
      
      if (qcResponse.success) {
        setQualityAgents(qcResponse.data.qualityAgents || []);
      }
      
      if (trendsResponse.success) {
        setTrendsData(trendsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching QC performance:', error);
      showError('Failed to load QC performance data', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (surveyId) {
      fetchData();
    }
  }, [surveyId, filters.startDate, filters.endDate]);

  // Apply search and sorting
  const filteredAndSortedData = useMemo(() => {
    let data = [...qualityAgents];

    // Apply search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(qa => 
        qa.name.toLowerCase().includes(searchLower) ||
        qa.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    data.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'totalReviews':
          aValue = a.totalReviews;
          bValue = b.totalReviews;
          break;
        case 'approvedResponses':
          aValue = a.approvedResponses;
          bValue = b.approvedResponses;
          break;
        case 'rejectedResponses':
          aValue = a.rejectedResponses;
          bValue = b.rejectedResponses;
          break;
        default:
          aValue = a.totalReviews;
          bValue = b.totalReviews;
      }

      if (filters.sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    // Update serial numbers after sorting
    return data.map((qa, index) => ({
      ...qa,
      serialNumber: index + 1
    }));
  }, [qualityAgents, filters.search, filters.sortBy, filters.sortOrder]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      startDate: '',
      endDate: '',
      sortBy: 'totalReviews',
      sortOrder: 'desc'
    });
  };

  // Handle CSV download
  const handleCSVDownload = () => {
    const headers = ['S.No', 'Name', 'Email', 'Phone', 'Total Reviews', 'Approved Responses', 'Rejected Responses'];
    
    const csvData = filteredAndSortedData.map(qa => [
      qa.serialNumber,
      qa.name,
      qa.email,
      qa.phone,
      qa.totalReviews,
      qa.approvedResponses,
      qa.rejectedResponses
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${survey?.surveyName || 'survey'}_qc_performance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Get sort icon
  const getSortIcon = (column) => {
    if (filters.sortBy !== column) {
      return null;
    }
    return filters.sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  // Handle column sort
  const handleSort = (column) => {
    if (filters.sortBy === column) {
      // Toggle sort order
      setFilters(prev => ({
        ...prev,
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      // Set new sort column
      setFilters(prev => ({
        ...prev,
        sortBy: column,
        sortOrder: 'desc'
      }));
    }
  };

  // Prepare chart data for performance over time
  const prepareChartData = () => {
    if (!trendsData?.dailyPerformance || trendsData.dailyPerformance.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = trendsData.dailyPerformance.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Total Reviewed',
          data: trendsData.dailyPerformance.map(item => item.totalReviewed),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Approved',
          data: trendsData.dailyPerformance.map(item => item.approved),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Rejected',
          data: trendsData.dailyPerformance.map(item => item.rejected),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading QC performance data...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Survey Not Found</h2>
          <button
            onClick={() => navigate('/company/surveys')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Surveys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full qc-performance-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/company/surveys')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Surveys</span>
              </button>
              <div className="h-6 w-px bg-gray-300 flex-shrink-0 hidden sm:block"></div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  QC Performance - {survey.surveyName || survey.title || 'Survey'}
                </h1>
                <p className="text-sm text-gray-600">
                  {filteredAndSortedData.length} quality agent{filteredAndSortedData.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              
              <button
                onClick={handleCSVDownload}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Quality Agent
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Stats Cards */}
        {trendsData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Number of QC Reviews</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{trendsData.summary.totalReviewed}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Approved</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{trendsData.summary.totalApproved}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rejected</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{trendsData.summary.totalRejected}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Daily</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{trendsData.summary.averageDaily}</p>
                  <p className="text-xs text-gray-500 mt-1">{trendsData.summary.daysCount} day{trendsData.summary.daysCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Over Time Chart */}
        {trendsData?.dailyPerformance && trendsData.dailyPerformance.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">QC Performance Over Time</h3>
                  <p className="text-sm text-gray-600">Daily review trends and approval rates</p>
                </div>
              </div>
              
              {/* Chart Legend Summary */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Total: {trendsData.summary.totalReviewed}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Approved: {trendsData.summary.totalApproved}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Rejected: {trendsData.summary.totalRejected}</span>
                </div>
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-80 w-full">
              <Line data={prepareChartData()} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Quality Agents Table */}
        {filteredAndSortedData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalReviews')}
                    >
                      <div className="flex items-center">
                        Total Reviews
                        {getSortIcon('totalReviews')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('approvedResponses')}
                    >
                      <div className="flex items-center">
                        Approved Responses
                        {getSortIcon('approvedResponses')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('rejectedResponses')}
                    >
                      <div className="flex items-center">
                        Rejected Responses
                        {getSortIcon('rejectedResponses')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedData.map((qa) => (
                    <tr key={qa._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {qa.serialNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{qa.name}</div>
                          <div className="text-sm text-gray-500">{qa.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {qa.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {qa.totalReviews}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {qa.approvedResponses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {qa.rejectedResponses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No quality agents found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filters.search || filters.startDate || filters.endDate
                ? 'Try adjusting your filters'
                : 'No quality agents have reviewed responses for this survey yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QCPerformancePage;

